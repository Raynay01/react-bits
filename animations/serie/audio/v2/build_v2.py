"""Mixagem v2 de um episódio (ambiente principal, com Whisper).

    python build_v2.py <ep>

1. Para cada fala, escolhe entre as tomadas do Chatterbox (synth_v2.py) a de
   melhor pronúncia (Whisper) e, no empate, a de entonação mais viva.
2. Ritmo humano: o intervalo entre falas depende do contexto (resposta rápida,
   pausa dramática), e `interrupt` faz uma fala cortar a anterior.
3. Acústica por cenário nas vozes + ambiência própria de cada set.
4. Trilha com ducking, efeitos, -14 LUFS.
5. Sincronização labial v2: abertura (volume) + arredondamento da boca
   (estimado pelo espectro: O/U graves e fechados, A/E abertos e brilhantes).
Saída: build-v2/epNN/{audio.wav,audio.m4a,timeline.json,qa.json}
"""
import glob, json, os, re, subprocess, sys, tempfile
import numpy as np, soundfile as sf, librosa

HERE = os.path.dirname(os.path.abspath(__file__))
AUDIO = os.path.dirname(HERE); SERIE = os.path.dirname(AUDIO)
sys.path.insert(0, AUDIO); sys.path.insert(0, HERE)
import build_episode as B                      # efeitos, trilha, Whisper (v1, reaproveitado)
from bible_v2 import VOICES, EMOTIONS, LEXICON, ROOMS
from synth_v2 import load_episode, line_key

SR = B.SR; FPS = 30
CACHE = os.path.join(SERIE, "build-v2", "cache")


def ff(x, chain, sr=SR):
    with tempfile.TemporaryDirectory() as d:
        sf.write(f"{d}/a.wav", x, sr)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"{d}/a.wav", "-af", chain, "-ar", str(SR), "-ac", "1", f"{d}/b.wav"], check=True)
        y, _ = sf.read(f"{d}/b.wav", dtype="float32")
    return y


def trim(x, thr=0.008):
    i = np.where(np.abs(x) > thr)[0]
    return x if not len(i) else x[max(0, i[0] - int(0.03 * SR)): i[-1] + int(0.08 * SR)]


def smart_trim(x):
    """Remove artefatos do Chatterbox: sílabas 'alucinadas' isoladas no fim, ruído
    residual, e encurta pausas internas exageradas (máx. 0,6 s)."""
    hop = int(0.05 * SR); n = len(x) // hop
    if n < 4: return x
    rms = np.array([np.sqrt(np.mean(x[i * hop:(i + 1) * hop] ** 2)) for i in range(n)])
    thr = max(0.012, 0.08 * np.percentile(rms, 95))
    v = rms > thr
    segs = []; i = 0
    while i < n:
        if v[i]:
            j = i
            while j < n and v[j]: j += 1
            segs.append([i, j]); i = j
        else: i += 1
    if not segs: return x
    # junta segmentos separados por < 0,15 s
    m = [segs[0]]
    for a, b in segs[1:]:
        if a - m[-1][1] <= 3: m[-1][1] = b
        else: m.append([a, b])
    # descarta cauda curta isolada (alucinação / respiração final)
    if len(m) > 1 and (m[-1][0] - m[-2][1]) >= 10 and (m[-1][1] - m[-1][0]) <= 12 and m[-2][1] - m[0][0] >= 20:
        m.pop()   # no máximo UM trecho final isolado e curto
    if len(m) > 1 and (m[0][1] - m[0][0]) <= 3 and (m[1][0] - m[0][1]) >= 10:
        m.pop(0)
    # mantém o áudio contínuo (consoantes suaves entre sílabas ficam!) e só
    # encurta pausas maiores que 0,6 s, removendo o meio delas
    start = max(0, m[0][0] * hop - int(0.03 * SR)); end = min(len(x), m[-1][1] * hop + int(0.06 * SR))
    out = []; cur = start
    for k in range(1, len(m)):
        g0, g1 = m[k - 1][1] * hop, m[k][0] * hop
        if (g1 - g0) / SR > 0.6:
            keep = int(0.3 * SR)
            out.append(x[cur:g0 + keep]); cur = g1 - keep
    out.append(x[cur:end])
    y = np.concatenate(out)
    f = min(len(y), int(0.03 * SR)); y[-f:] *= np.linspace(1, 0, f)
    return y


def liveliness(y):
    y16 = librosa.resample(y, orig_sr=SR, target_sr=16000)
    f0, _, _ = librosa.pyin(y16, fmin=60, fmax=700, sr=16000)
    f = f0[~np.isnan(f0)]
    return float(np.std(12 * np.log2(f / np.median(f)))) if len(f) > 10 else 0.0


def pick(who, emo, text, ex):
    h = line_key(who, emo, text, ex)
    best = None
    for p in sorted(glob.glob(f"{CACHE}/{h}_*.wav")):
        x, sr = sf.read(p, dtype="float32")
        x = librosa.resample(x, orig_sr=sr, target_sr=SR)
        post = VOICES[who]["post"]
        if post:
            for stage in post.split("|"):
                x = ff(np.concatenate([np.zeros(int(0.4 * SR), np.float32), x, np.zeros(int(0.6 * SR), np.float32)]) if "rubberband" in stage else x, stage)
        x = smart_trim(x)
        hyp = B.asr(x); sc = B.score(text, hyp); lv = liveliness(x)
        cand = (sc + 0.02 * min(lv, 4), x, dict(take=os.path.basename(p), score=round(sc, 3), asr=hyp, entonacao_st=round(lv, 2)))
        if best is None or cand[0] > best[0]:
            best = cand
    if best is None:
        raise SystemExit(f"faltam tomadas para: {who} | {text}  (rode synth_v2.py)")
    return best[1], best[2]


def ambience(setname, dur):
    n = int(dur * SR); t = np.arange(n) / SR; rng = np.random.default_rng(5)
    w = B.noise(dur)
    if setname == "vila":     # brisa + murmúrio distante + grilos
        x = B.onepole(w, 0.01) * 2.0 + B.onepole(w, 0.08) * 0.08 * (1 + np.sin(2 * np.pi * 0.3 * t))
        for k in range(int(dur * 2)):
            i = rng.integers(0, n - 8000); x[i:i + 6000] += B.tone(4200 + rng.uniform(-200, 200), 6000 / SR, decay=0.05)[:6000] * 0.03 * (np.sin(np.arange(6000) / SR * 2 * np.pi * 40) > 0)
    elif setname == "limbo":  # vento do vazio + sussurros digitais
        x = B.onepole(w, 0.004) * 4.0 * (1 + 0.5 * np.sin(2 * np.pi * 0.07 * t)) + B.tone(55, dur, "sine") * 0.05
        for k in range(int(dur / 3)):
            i = rng.integers(0, n - 30000); x[i:i + 26460] += B.pad(B.S_glitch(0.6), 26460) * 0.05
    elif setname == "prisao": # zumbido de dados + bipes
        x = B.tone(120, dur, "sine") * 0.04 + B.tone(240, dur, "sine") * 0.02 + B.onepole(w, 0.3) * 0.015
        for k in range(int(dur)):
            i = rng.integers(0, n - 8000); x[i:i + 3000] += B.tone(rng.choice([1760, 2093, 2637]), 3000 / SR, decay=0.03)[:3000] * 0.04
    elif setname in ("torre", "arena"):  # lava borbulhando + vento
        x = B.lava_bed(dur) * 0.6 if hasattr(B, "lava_bed") else B.onepole(w, 0.01) * 3
        x = x + B.onepole(w, 0.003) * 3 * (1 + np.sin(2 * np.pi * 0.1 * t))
    elif setname == "servidor":  # brisa + pássaros
        x = B.onepole(w, 0.006) * 2.0
        for k in range(int(dur / 2)):
            i = rng.integers(0, n - 12000); f0 = rng.uniform(2500, 4000)
            x[i:i + 9000] += B.sweep(f0, f0 * 1.4, 9000 / SR, decay=0.06)[:9000] * 0.05
    else:
        x = B.onepole(w, 0.01)
    return (x[:n] * 0.5).astype(np.float32)


EMO_PRE = {"tristeza": 0.5, "sussurro": 0.45, "choro": 0.35, "ameaca": 0.4}


def build(n):
    ep = load_episode(n)
    out_dir = os.path.join(SERIE, "build-v2", f"ep{n:02d}"); os.makedirs(out_dir, exist_ok=True)
    events = ep["events"]; END = ep.get("endCard", 3.2)
    rng = np.random.default_rng(n)
    cursor = 0.0; tl = []; clips = []; qa = []; prev_say_end = None; prev_text = ""
    for i, e in enumerate(events):
        start = cursor
        if "say" in e:
            who = e.get("voice", e["say"]); emo = e.get("emo", "neutro")
            y, meta = pick(who, emo, e["text"], e.get("ex"))
            if e.get("interrupt") and clips:       # corta a fala anterior: sobreposição real
                a0 = max(start - 0.25, prev_say_end - e["interrupt"])
                pa0, py, pw, pv = clips[-1]
                cut = int((a0 + 0.08 - pa0) * SR)
                if 0 < cut < len(py):
                    fade = min(int(0.12 * SR), len(py) - cut); py = py.copy(); py[cut:cut + fade] *= np.linspace(1, 0, fade); py[cut + fade:] = 0
                    clips[-1] = (pa0, py, pw, pv)
                start = min(start, a0)
                tl[-1]["end"] = round(max(tl[-1]["start"] + 0.2, a0 + 0.1), 3)
            else:
                if "pre" in e: pre = e["pre"]
                elif i == 0: pre = 0.4
                elif re.search(r"[?!]$", prev_text.strip()) and emo not in EMO_PRE: pre = 0.08 + rng.random() * 0.08   # resposta rápida
                else: pre = EMO_PRE.get(emo, 0.18 + rng.random() * 0.12)
                a0 = start + pre
            post = e.get("post", 0.2 + rng.random() * 0.1)
            clips.append((a0, y, e.get("as", who), e.get("vol", 1.0)))
            end = a0 + len(y) / SR + post + e.get("hold", 0)
            prev_say_end = a0 + len(y) / SR; prev_text = e["text"]
            qa.append(dict(i=i, who=who, emo=emo, text=e["text"], **meta))
            print(f"  [{i:02d}] {who:7s} {emo:9s} pron={meta['score']:.2f} ent={meta['entonacao_st']:.1f}st | {e['text'][:55]}", flush=True)
        else:
            end = start + e.get("beat", 1.0)
        tl.append(dict(start=round(start, 3), end=round(end, 3)))
        cursor = end
    total = cursor + END
    N = int(total * SR) + SR
    voice = np.zeros(N, np.float32); lips = {}; rounds = {}
    hop = SR // FPS
    for a0, y, who, vol in clips:
        i0 = int(a0 * SR); voice[i0:i0 + len(y)] += y * vol
        key = who if who != "chicken" else "pro"
        L = lips.setdefault(key, np.zeros(int(total * FPS) + 2)); R = rounds.setdefault(key, np.zeros(int(total * FPS) + 2))
        for f in range(len(y) // hop):
            seg = y[f * hop:(f + 1) * hop]; fi = int(a0 * FPS) + f
            if fi >= len(L): break
            rms = float(np.sqrt(np.mean(seg ** 2))); L[fi] = max(L[fi], min(1.0, rms * 6))
            if rms > 0.01:   # boca arredondada: energia concentrada abaixo de ~1 kHz
                sp = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))); fr = np.fft.rfftfreq(len(seg), 1 / SR)
                lo = sp[(fr > 200) & (fr < 1000)].sum(); hi = sp[(fr > 1000) & (fr < 4000)].sum() + 1e-9
                R[fi] = float(np.clip((lo / hi - 1.2) / 2.5, 0, 1))
    voice *= 0.5 / (np.percentile(np.abs(voice[np.abs(voice) > 1e-4]), 99.5) + 1e-9)
    # acústica de cada cenário (por trecho)
    setname = ep["set"]; marks = [(0.0, setname)]
    for i, e in enumerate(events):
        if e.get("set"): marks.append((tl[i]["start"], e["set"]))
    marks.append((total, None))
    wet = np.zeros_like(voice)
    for j in range(len(marks) - 1):
        s0, s1 = int(marks[j][0] * SR), min(N, int(marks[j + 1][0] * SR) + SR)
        seg = voice[s0:s1]
        if len(seg) > SR // 10:
            wet[s0:s0 + len(seg)] += ff(seg, ROOMS.get(marks[j][1], "anull"))[:len(seg)]
    voice = wet
    # efeitos (mesma biblioteca da v1)
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
            put(sfx, t, B.SFX[name](arg) if arg is not None else B.SFX[name]())
    put(sfx, total - END + 0.25, B.S_sting(), 0.9)
    amb = np.zeros(N, np.float32)
    for j in range(len(marks) - 1):
        s0, s1 = marks[j][0], marks[j + 1][0]
        if s1 - s0 > 0.2:
            put(amb, s0, ambience(marks[j][1], s1 - s0 + 0.5))
    # trilha por clima (v1) com crossfade
    music = np.zeros(N, np.float32); segs = []
    for i, e in enumerate(events):
        if "music" in e: segs.append((tl[i]["start"], e["music"]))
    segs.append((total - END, "silencio"))
    for j, (t0, mood) in enumerate(segs):
        t1 = segs[j + 1][0] if j + 1 < len(segs) else total
        if t1 - t0 < 0.05: continue
        x = B.render_mood(mood, t1 - t0 + 1.0, seed=n * 10 + j)
        fi = int(0.6 * SR); x[:fi] *= np.linspace(0, 1, fi); x[-fi:] *= np.linspace(1, 0, fi)
        put(music, max(0, t0 - 0.3), x)
    music *= 0.30 / (np.percentile(np.abs(music) + 1e-9, 99.5) + 1e-9)
    env = np.convolve(np.abs(voice), np.ones(int(0.12 * SR)) / int(0.12 * SR), mode="same")
    talk = np.clip(env / 0.02, 0, 1); dk = np.maximum(B.onepole(talk, 1 / (0.05 * SR)), B.onepole(talk, 1 / (0.35 * SR)))
    mix = voice + music * (1 - dk * (1 - 10 ** (-12 / 20))) + sfx * 0.55 * (1 - dk * (1 - 10 ** (-4 / 20))) + amb * 0.35 * (1 - dk * 0.5)
    mix = np.tanh(mix[: int(total * SR)] * 1.1) / 1.1
    raw = os.path.join(out_dir, "_raw.wav"); sf.write(raw, np.stack([mix, np.concatenate([np.zeros(10, np.float32), mix[:-10]])], 1), SR)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af", "loudnorm=I=-14:TP=-1.0:LRA=11", "-ar", str(SR), os.path.join(out_dir, "audio.wav")], check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", os.path.join(out_dir, "audio.wav"), "-c:a", "aac", "-b:a", "192k", os.path.join(out_dir, "audio.m4a")], check=True)
    os.remove(raw)
    json.dump(dict(events=tl, duration=round(total, 3), lips={k: [round(float(v), 3) for v in a] for k, a in lips.items()},
                   round={k: [round(float(v), 2) for v in a] for k, a in rounds.items()}), open(os.path.join(out_dir, "timeline.json"), "w"))
    json.dump(dict(episode=n, title=ep["title"], lines=qa, mean_score=round(float(np.mean([q["score"] for q in qa])), 3),
                   mean_entonacao=round(float(np.mean([q["entonacao_st"] for q in qa])), 2)), open(os.path.join(out_dir, "qa.json"), "w"), ensure_ascii=False, indent=1)
    print(f"EP{n:02d} v2 '{ep['title']}': {total:.1f}s, {len(qa)} falas, pronúncia {np.mean([q['score'] for q in qa]):.2f}, entonação {np.mean([q['entonacao_st'] for q in qa]):.2f} st")


if __name__ == "__main__":
    build(int(sys.argv[1]))
