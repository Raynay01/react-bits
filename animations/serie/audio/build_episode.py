"""Monta o áudio de um episódio: dublagem (com seleção de takes por QA),
trilha por clima com ducking sob as falas, efeitos sonoros e mixagem final.

Uso: python3 build_episode.py <n> [--takes 4]
Saídas em ../build/epNN/: audio.wav, audio.m4a, timeline.json, qa.json
"""
import difflib, hashlib, json, os, re, subprocess, sys, unicodedata
import numpy as np
import soundfile as sf
from voicelab import speak, SR, MODELS, VOICES

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FPS = 30
rng = np.random.default_rng(11)

# ------------------------------------------------------------ roteiro
def load_episode(n):
    path = os.path.join(ROOT, "episodes", f"ep{n:02d}.mjs")
    js = f"import(process.argv[1]).then(m=>process.stdout.write(JSON.stringify(m.default)))"
    out = subprocess.run(["node", "-e", js, path], capture_output=True, text=True, check=True).stdout
    return json.loads(out)

# ------------------------------------------------------------ QA de pronúncia (Whisper)
_asr = None
def asr(y):
    global _asr
    import sherpa_onnx, librosa
    if _asr is None:
        w = f"{MODELS}/sherpa-onnx-whisper-small"
        _asr = sherpa_onnx.OfflineRecognizer.from_whisper(encoder=f"{w}/small-encoder.int8.onnx", decoder=f"{w}/small-decoder.int8.onnx",
            tokens=f"{w}/small-tokens.txt", language="pt", task="transcribe", num_threads=4)
    y16 = librosa.resample(y, orig_sr=SR, target_sr=16000)
    s = _asr.create_stream(); s.accept_waveform(16000, y16); _asr.decode_stream(s)
    return s.result.text.strip()

def norm(s):
    s = unicodedata.normalize("NFD", s.lower()); s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    for d, w in {"72": "setenta e dois", "48": "quarenta e oito", "24": "vinte e quatro", "10": "dez", "7": "sete", "5": "cinco", "3": "tres", "2": "dois", "1": "um"}.items():
        s = re.sub(rf"\b{d}\b", w, s)
    return re.sub(r"[^a-z0-9 ]", " ", s).split()

def score(ref, hyp):
    return difflib.SequenceMatcher(None, norm(ref), norm(hyp)).ratio()

CACHE = os.path.join(ROOT, "build", "cache"); os.makedirs(CACHE, exist_ok=True)
VOICE_VER = hashlib.md5(json.dumps(VOICES, sort_keys=True).encode()).hexdigest()[:8]

def best_take(who, text, emo, takes, speed_vars=(1.0, 0.96, 1.04, 0.92, 1.0, 0.98)):
    """Grava várias tomadas e fica com a de melhor pronúncia (cache em disco)."""
    h = hashlib.md5(f"{VOICE_VER}|{who}|{emo}|{text}|{takes}".encode()).hexdigest()[:16]
    wav, meta = f"{CACHE}/{h}.wav", f"{CACHE}/{h}.json"
    if os.path.exists(wav) and os.path.exists(meta):
        y, _ = sf.read(wav, dtype="float32"); return y, json.load(open(meta))
    best = None
    for k in range(takes):
        # varia levemente o ritmo entre as tomadas (como um dublador refazendo a fala)
        from voicelab import VOICES as Vv
        base = Vv[who]["speed"]; Vv[who]["speed"] = base * speed_vars[k % len(speed_vars)]
        try:
            y = speak(who, text, emo, seed=k)
        finally:
            Vv[who]["speed"] = base
        hyp = asr(y); sc = score(text, hyp)
        if best is None or sc > best[1]["score"] + 1e-6:
            best = (y, dict(take=k, score=round(sc, 3), asr=hyp))
        if sc >= 0.93:
            break
    sf.write(wav, best[0], SR); json.dump(best[1], open(meta, "w"), ensure_ascii=False)
    return best

# ------------------------------------------------------------ síntese (efeitos e música)
def env_exp(n, decay): return np.exp(-np.arange(n) / (SR * decay))
def noise(d): return rng.standard_normal(int(d * SR)).astype(np.float32)
def onepole(x, a):
    k = int(min(len(x), max(8, 7 / max(a, 1e-4)))); kern = a * (1 - a) ** np.arange(k)
    n = len(x) + k; m = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(kern, m), m)[: len(x)].astype(np.float32)
def tone(f, d, kind="sine", decay=None, att=0.005):
    n = int(d * SR); t = np.arange(n) / SR; ph = 2 * np.pi * f * t
    x = {"sine": np.sin(ph), "square": np.sign(np.sin(ph)) * 0.5, "saw": 2 * ((f * t) % 1) - 1, "tri": 2 * np.abs(2 * ((f * t) % 1) - 1) - 1}[kind]
    a = np.minimum(1, np.arange(n) / (SR * att))
    a = a * (env_exp(n, decay) if decay else np.minimum(1, (n - np.arange(n)) / (SR * 0.03)))
    return (x * a).astype(np.float32)
def sweep(f0, f1, d, decay=None, kind="sine"):
    n = int(d * SR); t = np.arange(n) / SR; f = f0 * (f1 / f0) ** (t / d); ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) if kind == "sine" else np.sign(np.sin(ph)) * 0.5
    return (x * (env_exp(n, decay) if decay else np.sin(np.linspace(0, np.pi, n)))).astype(np.float32)
def pad(x, n): return np.pad(x, (0, max(0, n - len(x))))[:n]

def S_explosion(size=1.0):
    d = 2.4; n = noise(d); boom = onepole(n, 0.02 / size) * 9; crack = onepole(n, 0.25) * env_exp(len(n), 0.08)
    return np.tanh((boom * env_exp(len(n), 0.55 * size) + crack * 0.5 + tone(48 / size, d, decay=0.5) * 0.9) * 1.5) * 0.9
def S_whoosh(d=0.6): n = noise(d); return onepole(n, 0.08) * np.sin(np.linspace(0, np.pi, len(n))) ** 2 * 1.2
def S_impact(): return np.tanh(tone(70, 0.6, decay=0.15) * 1.5 + onepole(noise(0.6), 0.3) * env_exp(int(0.6 * SR), 0.03) * 1.2) * 0.9
def S_ding(f1=1318.5, f2=1760):
    a = pad(tone(f1, 0.6, decay=0.18) * 0.5, int(0.7 * SR)); b = np.pad(tone(f2, 0.6, decay=0.25) * 0.5, (int(0.09 * SR), 0))[: int(0.7 * SR)]; return a + pad(b, len(a))
def S_error(): x = np.zeros(int(0.6 * SR), np.float32); x[: int(0.22 * SR)] += tone(220, 0.22, "square") * 0.5; x[int(0.28 * SR): int(0.5 * SR)] += tone(180, 0.22, "square") * 0.5; return onepole(x, 0.3)
def S_glitch(d=0.5):
    out = np.zeros(int(d * SR), np.float32); i = 0
    while i < len(out):
        L = int(rng.uniform(0.02, 0.07) * SR); f = rng.choice([200, 400, 800, 1600, 3200]); out[i:i + L] += pad(tone(f, L / SR, "square") * 0.4 + noise(L / SR) * 0.2 * (rng.random() > 0.5), L)[: len(out) - i]; i += L + int(rng.uniform(0, 0.03) * SR)
    return out
def S_teleport(): return sweep(300, 2400, 0.8, kind="sine") * 0.4 + onepole(noise(0.8), 0.5) * np.linspace(0, 1, int(0.8 * SR)) ** 2 * 0.25
def S_laser(): return sweep(1800, 200, 0.35, decay=0.12, kind="square") * 0.5
def S_zap(): return sweep(900, 120, 0.25, decay=0.08, kind="square") * 0.5 + onepole(noise(0.25), 0.6) * env_exp(int(0.25 * SR), 0.05) * 0.4
def S_hum(d=2.0): t = np.arange(int(d * SR)) / SR; x = (np.sin(2 * np.pi * 110 * t) + 0.5 * np.sin(2 * np.pi * 220 * t + np.sin(2 * np.pi * 6 * t))) * 0.2; return (x * np.minimum(1, np.minimum(t / 0.2, (d - t) / 0.3))).astype(np.float32)
def S_cluck():
    out = np.zeros(int(0.9 * SR), np.float32)
    for k, (o, f) in enumerate(((0, 620), (0.16, 700), (0.34, 980))):
        n = int(0.14 * SR) if k < 2 else int(0.45 * SR); t = np.arange(n) / SR; ff = f * (1 + 0.25 * np.sin(2 * np.pi * 9 * t)) * (1 + 0.6 * t)
        x = np.sign(np.sin(2 * np.pi * np.cumsum(ff) / SR)) * 0.25 * env_exp(n, 0.12 if k < 2 else 0.3); i = int(o * SR); out[i:i + n] += x
    return onepole(out, 0.5)
def S_snap(): return onepole(noise(0.12), 0.9) * env_exp(int(0.12 * SR), 0.012) * 1.4
def S_rumble(d=3.0): return onepole(noise(d), 0.006) * 14 * np.sin(np.linspace(0, np.pi, int(d * SR)))
def S_heartbeat(d=3.0):
    out = np.zeros(int(d * SR), np.float32); i = 0.0
    while i < d - 0.4:
        for o, g in ((0, 1), (0.22, 0.7)): j = int((i + o) * SR); x = tone(55, 0.25, decay=0.07) * g; out[j:j + len(x)] += x[: len(out) - j]
        i += 0.85
    return out * 0.9
def S_alarm(d=2.0): t = np.arange(int(d * SR)) / SR; f = 700 + 300 * (np.sin(2 * np.pi * 2 * t) > 0); return (np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.18).astype(np.float32)
def S_magic():
    out = np.zeros(int(1.4 * SR), np.float32)
    for i, f in enumerate([1047, 1319, 1568, 2093, 2637, 3136]):
        x = tone(f, 0.6, decay=0.2) * 0.25; j = int(i * 0.07 * SR); out[j:j + len(x)] += x
    return out

def S_punch(): return np.tanh(tone(90, 0.25, decay=0.05) * 2 + onepole(noise(0.25), 0.4) * env_exp(int(0.25 * SR), 0.02) * 2) * 0.8
def S_slam(): return S_impact() * 1.2 + pad(S_rumble(0.8) * 0.4, int(0.6 * SR))
def S_cage(): return pad(sweep(400, 120, 0.3, decay=0.1, kind="square") * 0.5, int(0.8 * SR)) + pad(S_impact() * 0.7, int(0.8 * SR))
def S_click(): return onepole(noise(0.03), 0.8) * env_exp(int(0.03 * SR), 0.004) * 1.5
def S_typing(d=1.2):
    out = np.zeros(int(d * SR), np.float32); i = 0
    while i < len(out) - 2000: c = S_click() * rng.uniform(0.4, 0.8); out[i:i + len(c)] += c; i += int(rng.uniform(0.05, 0.13) * SR)
    return out
def S_boing(): return sweep(180, 620, 0.5, decay=0.25) * 0.5
def S_riser(d=2.0): n = int(d * SR); t = np.arange(n) / SR; return (sweep(200, 1400, d) * (t / d) ** 2 * 0.3 + onepole(noise(d), 0.3) * (t / d) ** 3 * 0.25).astype(np.float32)
def S_sting(): x = S_explosion(0.7); return np.tanh(x * 0.6 + pad(tone(73.4, 1.2, "saw", decay=0.5), len(x)) * 0.3)
def S_fall(): return sweep(1600, 300, 1.2, kind="sine") * 0.3
def S_splash(): return onepole(noise(1.0), 0.15) * env_exp(int(1.0 * SR), 0.25) * 0.8 + tone(120, 1.0, decay=0.2) * 0.3
def S_coin(): return pad(tone(988, 0.08) * 0.4, int(0.5 * SR)) + np.pad(tone(1319, 0.42, "square", decay=0.15) * 0.3, (int(0.08 * SR), 0))[: int(0.5 * SR)]
def S_swell(d=2.5): n = int(d * SR); t = np.arange(n) / SR; x = sum(tone(f, d, "tri") for f in (261.6, 329.6, 392, 523.3)) * 0.12; return (x * (t / d) ** 1.5).astype(np.float32)
def S_crowd(d=2.0): return onepole(noise(d), 0.05) * 3 * np.sin(np.linspace(0, np.pi, int(d * SR))) * (1 + 0.3 * np.sin(np.arange(int(d * SR)) / SR * 2 * np.pi * 3))
def S_step(): return onepole(noise(0.06), 0.3) * env_exp(int(0.06 * SR), 0.01) * 0.8
def S_footsteps(d=1.5):
    out = np.zeros(int(d * SR), np.float32)
    for i in range(int(d / 0.28)): s = S_step() * rng.uniform(0.6, 1.0); j = int(i * 0.28 * SR); out[j:j + len(s)] += s[: len(out) - j]
    return out
def S_power():
    n = int(1.6 * SR); return pad(sweep(80, 300, 1.5) * 0.5, n) + pad(S_magic(), n) * 0.6

def S_delete(): return sweep(1200, 60, 1.2, kind="square") * 0.35 * np.linspace(1, 0, int(1.2 * SR)) + pad(S_glitch(1.2), int(1.2 * SR)) * 0.5
def S_eat():
    out = np.zeros(int(0.6 * SR), np.float32)
    for i in range(3):
        x = onepole(noise(0.08), 0.4) * env_exp(int(0.08 * SR), 0.02); j = int(i * 0.17 * SR); out[j:j + len(x)] += x
    return out * 1.2

def S_sad():
    return pad(np.concatenate([tone(f, 0.45, "tri", decay=0.5) * 0.25 for f in (440, 392, 349.2, 329.6)]), int(2 * SR))

SFX = {k[2:]: v for k, v in globals().items() if k.startswith("S_")}

# ------------------------------------------------------------ trilha por clima
def note(m): return 440 * 2 ** ((m - 69) / 12)
MOODS = {
    #           bpm  acordes (MIDI)                                               baixo  bateria  arpejo  lead
    "misterio": (84, [[50, 57, 62, 65], [46, 53, 58, 62], [48, 55, 60, 63], [45, 52, 57, 61]], 1, 0, 1, 0),
    "tensao":   (110, [[50, 57, 62, 65], [51, 58, 63, 66], [50, 57, 62, 65], [49, 56, 61, 64]], 2, 1, 1, 0),
    "acao":     (140, [[52, 59, 64, 67], [48, 55, 60, 64], [50, 57, 62, 66], [47, 54, 59, 62]], 2, 2, 1, 1),
    "humor":    (124, [[48, 55, 60, 64], [53, 57, 60, 65], [55, 59, 62, 67], [48, 55, 60, 64]], 3, 3, 0, 2),
    "triste":   (72, [[45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 59], [40, 47, 52, 55]], 1, 0, 2, 0),
    "epico":    (96, [[45, 52, 57, 64], [41, 48, 53, 60], [43, 50, 55, 62], [48, 55, 60, 67]], 2, 4, 1, 1),
    "esperanca": (90, [[48, 55, 60, 64], [43, 50, 55, 62], [45, 52, 57, 64], [41, 48, 53, 60]], 1, 0, 2, 1),
    "vila":     (100, [[50, 57, 62, 66], [55, 59, 62, 67], [52, 55, 59, 64], [57, 61, 64, 69]], 3, 3, 1, 0),
    "silencio": (60, [[]], 0, 0, 0, 0),
}
def kick(): return np.tanh(sweep(150, 45, 0.3, decay=0.12) * 2.0) * 0.8
def snare(): return onepole(noise(0.2), 0.6) * env_exp(int(0.2 * SR), 0.06) * 0.6 + tone(190, 0.2, decay=0.05) * 0.3
def hat(): x = noise(0.05); return (x - onepole(x, 0.5)) * env_exp(len(x), 0.012) * 0.35

def render_mood(mood, dur, seed=0):
    bpm, chords, bassT, drumT, arpT, leadT = MOODS[mood]
    out = np.zeros(int(dur * SR) + SR, np.float32)
    if mood == "silencio": return out[: int(dur * SR)]
    beat = 60 / bpm; bar = beat * 4; r = np.random.default_rng(seed)
    nb = int(np.ceil(dur / bar))
    def put(t, x, g=1.0):
        i = int(t * SR)
        if i >= len(out): return
        x = x[: len(out) - i]; out[i:i + len(x)] += x * g
    for b in range(nb):
        ch = chords[b % len(chords)]; t0 = b * bar
        # pad (dente de serra desafinado, filtrado)
        p = sum(tone(note(m), bar + 0.4, "saw", att=0.4) + tone(note(m) * 1.004, bar + 0.4, "saw", att=0.4) for m in ch) * 0.05
        put(t0, onepole(p, 0.06 if mood not in ("humor", "vila") else 0.1), 0.9)
        if bassT:
            pat = [0, 2] if bassT == 1 else ([0, 1, 2, 3] if bassT == 2 else [0, 1.5, 2, 3.5])
            for q in pat: put(t0 + q * beat, tone(note(ch[0] - 12), beat * 0.9, "tri", decay=0.35) * 0.55)
        if drumT:
            for q in range(4):
                if drumT in (1, 2, 4) and (q in (0, 2) or (drumT == 2 and q == 3)): put(t0 + q * beat, kick())
                if drumT == 3 and q in (0, 2): put(t0 + q * beat, kick() * 0.7)
                if q in (1, 3) and drumT >= 2: put(t0 + q * beat, snare() * (0.8 if drumT != 3 else 0.5))
                if drumT == 4 and q == 3: put(t0 + q * beat + beat / 2, snare() * 0.5)
                for e in range(2): put(t0 + q * beat + e * beat / 2, hat() * (0.7 if drumT != 1 else 0.4))
        if arpT:
            steps = 8 if arpT == 1 else 4
            for s in range(steps):
                m = ch[s % len(ch)] + 12 * (1 + (s // len(ch)) % 2)
                put(t0 + s * bar / steps, tone(note(m), bar / steps * 0.9, "tri" if arpT == 2 else "square", decay=0.18) * (0.06 if arpT == 1 else 0.12))
        if leadT:
            if leadT == 2:   # melodia saltitante (humor)
                for s in range(8):
                    m = ch[[1, 2, 3, 2, 1, 2, 3, 3][s]] + 12; put(t0 + s * beat / 2, tone(note(m), beat * 0.4, "square", decay=0.1) * 0.08)
            else:
                m = ch[3] + 12 + int(r.integers(0, 2)) * 2; put(t0, tone(note(m), bar * 0.9, "tri", att=0.2) * 0.06)
    # dinâmica: entra suave
    out[: int(0.5 * SR)] *= np.linspace(0, 1, int(0.5 * SR))
    return out[: int(dur * SR)]

# ------------------------------------------------------------ montagem
def build(n, takes=4):
    ep = load_episode(n)
    out_dir = os.path.join(ROOT, "build", f"ep{n:02d}"); os.makedirs(out_dir, exist_ok=True)
    events = ep["events"]; END = ep.get("endCard", 3.2)
    cursor = 0.0; tl = []; voice_clips = []; qa = []
    for i, e in enumerate(events):
        start = cursor
        if "say" in e:
            who = e["say"]; vk = e.get("voice", who)
            y, meta = best_take(vk, e["text"], e.get("emo", "neutro"), takes)
            pre = e.get("pre", 0.18 if i else 0.4); post = e.get("post", 0.22)
            a0 = start + pre
            voice_clips.append((a0, y, e.get("as", who), e.get("vol", 1.0)))
            end = a0 + len(y) / SR + post + e.get("hold", 0)
            qa.append(dict(i=i, who=who, emo=e.get("emo", "neutro"), text=e["text"], **meta))
            print(f"  [{i:02d}] {who:8s} {e.get('emo','neutro'):9s} score={meta['score']:.2f} take={meta['take']} | {e['text'][:60]}")
        else:
            end = start + e.get("beat", 1.0)
        tl.append(dict(start=round(start, 3), end=round(end, 3)))
        cursor = end
    total = cursor + END
    N = int(total * SR) + SR
    voice = np.zeros(N, np.float32); lips = {}
    for a0, y, who, vol in voice_clips:
        i0 = int(a0 * SR); voice[i0:i0 + len(y)] += y * vol
        arr = lips.setdefault(who if who != "chicken" else "pro", np.zeros(int(total * FPS) + 2))
        hop = SR // FPS
        for f in range(len(y) // hop):
            rms = float(np.sqrt(np.mean(y[f * hop:(f + 1) * hop] ** 2))); fi = int(a0 * FPS) + f
            if fi < len(arr): arr[fi] = max(arr[fi], min(1.0, rms * 6))
    # normaliza a dublagem (pico por fala já controlado; aqui o conjunto)
    voice *= 0.5 / (np.percentile(np.abs(voice[np.abs(voice) > 1e-4]), 99.5) + 1e-9)
    # efeitos
    sfx = np.zeros(N, np.float32)
    def put(buf, t, x, g=1.0):
        i = int(max(0, t) * SR)
        if i >= N: return
        x = np.asarray(x, np.float32)[: N - i]; buf[i:i + len(x)] += x * g
    for i, e in enumerate(events):
        s0, s1 = tl[i]["start"], tl[i]["end"]
        for item in e.get("sfx", []):
            name, at = item[0], item[1] if len(item) > 1 else 0; g = item[2] if len(item) > 2 else 1.0
            t = s1 + float(at[3:] or 0) if isinstance(at, str) and at.startswith("end") else s0 + at
            arg = item[3] if len(item) > 3 else None
            x = SFX[name](arg) if arg is not None else SFX[name]()
            put(sfx, t, x, g)
    put(sfx, total - END + 0.25, S_sting(), 0.9)
    # trilha por clima: segmentos com crossfade
    music = np.zeros(N, np.float32); segs = []; cur = None
    for i, e in enumerate(events):
        if "music" in e: segs.append((tl[i]["start"], e["music"]))
    segs.append((total - END, "silencio"))
    for j, (t0, mood) in enumerate(segs):
        t1 = segs[j + 1][0] if j + 1 < len(segs) else total
        if t1 - t0 < 0.05: continue
        x = render_mood(mood, t1 - t0 + 1.0, seed=n * 10 + j)
        fi = int(0.6 * SR); x[:fi] *= np.linspace(0, 1, fi); x[-fi:] *= np.linspace(1, 0, fi)
        put(music, max(0, t0 - 0.3), x)
    music *= 0.32 / (np.percentile(np.abs(music) + 1e-9, 99.5) + 1e-9)
    # ducking: a música abaixa ~11 dB sempre que alguém fala
    env = np.abs(voice); win = int(0.12 * SR); env = np.convolve(env, np.ones(win) / win, mode="same")
    talk = np.clip(env / 0.02, 0, 1)
    att = onepole(talk, 1 / (0.05 * SR)); rel = onepole(talk, 1 / (0.35 * SR)); dk = np.maximum(att, rel)
    duck = 1 - dk * (1 - 10 ** (-11 / 20))
    sfx_duck = 1 - dk * (1 - 10 ** (-4 / 20))
    mix = voice * 1.0 + music * duck + sfx * 0.55 * sfx_duck
    mix = mix[: int(total * SR)]
    mix = np.tanh(mix * 1.1) / 1.1
    raw = os.path.join(out_dir, "_raw.wav"); sf.write(raw, np.stack([mix, np.concatenate([np.zeros(10, np.float32), mix[:-10]])], 1), SR)
    # loudness de plataforma (-14 LUFS, pico -1 dBTP)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af", "loudnorm=I=-14:TP=-1.0:LRA=11", "-ar", str(SR), os.path.join(out_dir, "audio.wav")], check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", os.path.join(out_dir, "audio.wav"), "-c:a", "aac", "-b:a", "192k", os.path.join(out_dir, "audio.m4a")], check=True)
    os.remove(raw)
    json.dump(dict(events=tl, duration=round(total, 3), lips={k: [round(float(v), 3) for v in a] for k, a in lips.items()}), open(os.path.join(out_dir, "timeline.json"), "w"))
    json.dump(dict(episode=n, title=ep["title"], lines=qa, mean_score=round(float(np.mean([q["score"] for q in qa])), 3) if qa else None), open(os.path.join(out_dir, "qa.json"), "w"), ensure_ascii=False, indent=1)
    print(f"EP{n:02d} '{ep['title']}': {total:.1f}s, {len(qa)} falas, pronúncia média {np.mean([q['score'] for q in qa]):.2f}")

if __name__ == "__main__":
    n = int(sys.argv[1]); takes = int(sys.argv[sys.argv.index("--takes") + 1]) if "--takes" in sys.argv else 4
    build(n, takes)
