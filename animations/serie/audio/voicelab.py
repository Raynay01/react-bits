"""Laboratório de vozes da série — implementação da Bíblia Vocal.

Cada personagem usa um MODELO NEURAL DIFERENTE (nenhum modelo é compartilhado),
com uma cadeia de pós-produção própria. As emoções alteram velocidade,
variação prosódica, altura, intensidade e timbre de forma consistente.

Motores (todos locais, offline):
  - Piper (VITS) pt-BR / pt-PT  -> vits-piper-*/
  - Kokoro v1.0 (pt-br)         -> kokoro-v1.0.onnx + voices-v1.0.bin
Diretório dos modelos: variável de ambiente VOICE_MODELS.
"""
import glob, os, re, subprocess, tempfile, zlib
import numpy as np
import soundfile as sf

MODELS = os.environ.get("VOICE_MODELS", os.path.join(os.path.dirname(__file__), "models"))
SR = 44100

# ---------------------------------------------------------------- BÍBLIA VOCAL
# engine/model: modelo neural exclusivo do personagem
# speed: ritmo base | pitch: semitons | formant: 'preserved' (mesma pessoa) ou 'shifted' (outro corpo/idade)
# noise: variação prosódica (Piper) | fx: cadeia de timbre (ffmpeg)
VOICES = {
    "noob": dict(engine="kokoro", model="pm_alex", speed=0.98, pitch=1.0, formant="preserved",
                 fx="equalizer=f=3200:t=q:w=1.2:g=2,acompressor=threshold=-20dB:ratio=2.5:attack=8:release=120"),
    "pro": dict(engine="piper", model="pt_BR-jeff-medium", speed=1.04, pitch=0.8, formant="preserved", noise=0.75,
                fx="highpass=f=110,equalizer=f=2500:t=q:w=1:g=4,acompressor=threshold=-22dB:ratio=4:attack=4:release=80"),
    "luna": dict(engine="piper", model="pt_BR-dii-high", speed=1.0, pitch=1.2, formant="preserved", noise=0.7,
                 fx="highpass=f=140,equalizer=f=6000:t=q:w=1:g=2.5,acompressor=threshold=-20dB:ratio=3:attack=6:release=100"),
    "pipoca": dict(engine="kokoro", model="pf_dora", speed=1.1, pitch=4.5, formant="shifted",
                   fx="highpass=f=180,equalizer=f=4000:t=q:w=1:g=2,acompressor=threshold=-20dB:ratio=2.5"),
    "vovo": dict(engine="kokoro", model="pm_santa", speed=0.88, pitch=-1.0, formant="preserved",
                 fx="vibrato=f=5:d=0.025,lowpass=f=7500,equalizer=f=220:t=q:w=1:g=3,acompressor=threshold=-20dB:ratio=2"),
    "ze": dict(engine="piper", model="pt_PT-tugao-medium", speed=0.95, pitch=-1.2, formant="preserved", noise=0.6,
               fx="equalizer=f=180:t=q:w=1:g=3,equalizer=f=900:t=q:w=1:g=2,lowpass=f=8000,acompressor=threshold=-20dB:ratio=2.5"),
    "vortex": dict(engine="piper", model="pt_BR-miro-high", speed=0.88, pitch=-2.0, formant="shifted", noise=0.45,
                   fx="lowpass=f=8000,equalizer=f=90:t=q:w=1:g=5,equalizer=f=2500:t=q:w=1:g=3,"
                      "chorus=0.85:0.9:25:0.15:0.2:1.5,aecho=0.9:0.45:70|120:0.1|0.06,acompressor=threshold=-18dB:ratio=4"),
    # VÓRTEX redimido (EP10): MESMO modelo e identidade, sem a "armadura" de coro e eco
    "vbot": dict(engine="piper", model="pt_BR-miro-high", speed=0.95, pitch=-0.5, formant="preserved", noise=0.6,
                 fx="highpass=f=90,equalizer=f=3000:t=q:w=1:g=2,aecho=0.6:0.3:30:0.15,acompressor=threshold=-20dB:ratio=2.5"),
    "sistema": dict(engine="piper", model="pt_BR-cadu-medium", speed=1.0, pitch=0.0, formant="preserved", noise=0.33,
                    fx="highpass=f=300,lowpass=f=5200,acrusher=bits=10:mix=0.25,aecho=0.6:0.4:35:0.25"),
    "drone": dict(engine="piper", model="pt_BR-faber-medium", speed=1.05, pitch=-1.0, formant="preserved", noise=0.3,
                  fx="highpass=f=400,lowpass=f=4000,acrusher=bits=7:mix=0.5,tremolo=f=38:d=0.35"),
}

# ---------------------------------------------------------------- EMOÇÕES
# Ajustes somados ao perfil do personagem.
EMOTIONS = {
    "neutro":    dict(),
    "calmo":     dict(speed=-0.05, pitch=-0.3),
    "ironia":    dict(speed=-0.08, pitch=-0.5, noise=+0.05),
    "alegria":   dict(speed=+0.04, pitch=+0.6, gain=+1.5, noise=+0.05),
    "empolgado": dict(speed=+0.07, pitch=+0.9, gain=+2.5, noise=+0.06),
    "raiva":     dict(speed=+0.03, pitch=+0.8, gain=+3.0, drive=True),
    "grito":     dict(speed=+0.0, pitch=+1.0, gain=+4.0, drive=True),
    "medo":      dict(speed=+0.06, pitch=+0.8, gain=-1.0, tremble=True, noise=+0.06),
    "desespero": dict(speed=+0.06, pitch=+1.1, gain=+2.0, tremble=True, drive=True),
    "tristeza":  dict(speed=-0.16, pitch=-1.0, gain=-3.0, soft=True, noise=-0.05),
    "choro":     dict(speed=-0.12, pitch=+0.8, gain=-2.0, tremble=True, soft=True, noise=+0.1),
    "surpresa":  dict(speed=+0.0, pitch=+1.1, gain=+1.5, noise=+0.06),
    "sussurro":  dict(speed=-0.06, pitch=-0.2, gain=-7.0, whisper=True),
    "ameaca":    dict(speed=-0.10, pitch=-0.8, gain=+1.0),
    "orgulho":   dict(speed=-0.02, pitch=+0.4, gain=+1.5),
}

LEXICON = {"Noob": "Nub", "Noobs": "Nubs", "Pro": "Prô", "obby": "óbi", "Patch": "Pétchi", "Reset": "Rizét", "hack": "réqui",
           "ranking": "rênkin", "admin": "ádmin", "VÓRTEX": "Vórtex", "Uhuuul": "Uhúúl", "Cocoricó": "Có-có-ri-có"}

_cache = {}


def _piper(model, text, speed, noise):
    from piper import PiperVoice
    from piper.config import SynthesisConfig
    if model not in _cache:
        d = glob.glob(f"{MODELS}/vits-piper-{model}")[0]
        _cache[model] = PiperVoice.load(glob.glob(f"{d}/*.onnx")[0], config_path=glob.glob(f"{d}/*.onnx.json")[0])
    v = _cache[model]
    cfg = SynthesisConfig(length_scale=1.0 / speed, noise_scale=noise, noise_w_scale=0.8)
    x = np.concatenate([c.audio_float_array for c in v.synthesize(text, cfg)])
    return x.astype(np.float32), v.config.sample_rate


def _kokoro(model, text, speed):
    from kokoro_onnx import Kokoro
    if "_kokoro" not in _cache:
        _cache["_kokoro"] = Kokoro(f"{MODELS}/kokoro-v1.0.onnx", f"{MODELS}/voices-v1.0.bin")
    s, sr = _cache["_kokoro"].create(text, voice=model, speed=speed, lang="pt-br")
    return s.astype(np.float32), sr


def _ffmpeg(x, sr, chain):
    with tempfile.TemporaryDirectory() as d:
        a, b = f"{d}/a.wav", f"{d}/b.wav"
        sf.write(a, x, sr)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", a, "-af", chain, "-ar", str(SR), "-ac", "1", b], check=True)
        y, _ = sf.read(b, dtype="float32")
    return y


def _trim(x, thr=0.01):
    idx = np.where(np.abs(x) > thr)[0]
    if not len(idx):
        return x
    return x[max(0, idx[0] - int(0.02 * SR)): idx[-1] + int(0.06 * SR)]


def breath(dur=0.32, level=0.035, rng=None):
    """Respiração curta (ruído filtrado com envelope de inspiração)."""
    rng = rng or np.random.default_rng(1)
    n = int(dur * SR)
    w = rng.standard_normal(n)
    k = np.exp(-np.arange(400) / 60.0); k /= k.sum()
    w = np.convolve(w, k, mode="same")
    w = w - np.convolve(w, np.ones(30) / 30, mode="same")   # tira o grave
    env = np.sin(np.linspace(0, np.pi, n)) ** 1.5
    return (w * env / (np.abs(w).max() + 1e-9) * level).astype(np.float32)


def speak(who, text, emo="neutro", seed=0):
    """Sintetiza UMA fala de um personagem com emoção. Devolve áudio mono 44.1 kHz.

    Reticências ('...') viram pausas reais com respiração, em vez de serem lidas.
    """
    p = dict(VOICES[who]); e = EMOTIONS[emo]
    speed = p["speed"] * (1 + e.get("speed", 0))
    noise = float(np.clip(p.get("noise", 0.667) + e.get("noise", 0), 0.2, 1.0))
    pitch = p["pitch"] + e.get("pitch", 0)
    # pronúncia: palavras estrangeiras/gamer reescritas foneticamente para o pt-BR
    for k, v in LEXICON.items():
        text = re.sub(rf"\b{k}\b", v, text, flags=re.I)
    # palavras em CAIXA ALTA seriam soletradas pelo fonetizador: a ênfase vem da emoção
    text = re.sub(r"\b[A-ZÀ-Ý]{2,}\b", lambda m: m.group(0).lower(), text)
    parts = [s.strip() for s in re.split(r"\.\.\.|…", text) if s.strip()]
    rng = np.random.default_rng(zlib.crc32(f"{who}|{text}|{seed}".encode()))
    chunks = []
    for i, part in enumerate(parts):
        if i < len(parts) - 1 and not re.search(r"[.!?,]$", part):
            part += ","
        if p["engine"] == "piper":
            x, sr = _piper(p["model"], part, speed, noise)
        else:
            # o Kokoro corta o final da frase acima de ~1.1x: o excesso vira time-stretch
            ks = min(speed, 1.0)
            x, sr = _kokoro(p["model"], part, ks)
            if speed / ks > 1.01:
                x = _ffmpeg(x, sr, f"atempo={speed / ks:.3f}")
                sr = SR
        chunks.append((x, sr))
    out = []
    for i, (x, sr) in enumerate(chunks):
        y = _process(x, sr, p, e, pitch)
        out.append(_trim(y))
        if i < len(chunks) - 1:   # pausa dramática + respiração
            pause = 0.30 + 0.12 * rng.random()
            out.append(np.zeros(int(pause * 0.4 * SR), np.float32))
            if who not in ("sistema", "drone", "vortex"):
                out.append(breath(pause * 0.6, 0.02, rng))
            else:
                out.append(np.zeros(int(pause * 0.6 * SR), np.float32))
    y = np.concatenate(out)
    # respiração antes de falas emocionais (exceto vozes artificiais)
    if who not in ("sistema", "drone", "vortex") and emo in ("medo", "desespero", "choro", "surpresa", "grito", "tristeza"):
        y = np.concatenate([breath(0.28, 0.03 if emo != "tristeza" else 0.02, rng), np.zeros(int(0.03 * SR), np.float32), y])
    return y


def _process(x, sr, p, e, pitch):
    chain = [p["fx"]]
    ratio = 2 ** (pitch / 12)
    if e.get("tremble"):
        chain.append("vibrato=f=6.5:d=0.12")
    if e.get("soft"):
        chain.append("lowpass=f=5200")
    if e.get("drive"):
        chain.append("equalizer=f=3000:t=q:w=1:g=2.5,acompressor=threshold=-24dB:ratio=5:attack=3:release=60:makeup=2")
    if e.get("whisper"):
        chain.append("highpass=f=600,equalizer=f=5000:t=q:w=1:g=6")
    chain.append(f"volume={e.get('gain', 0):+.1f}dB")
    pad = np.zeros(int(0.8 * sr), np.float32)
    x = np.concatenate([pad, x, pad])
    if abs(pitch) > 0.05:   # passe separado: o rubberband não pode ser encadeado com outros filtros
        x = _ffmpeg(x, sr, f"rubberband=pitch={ratio:.4f}:formant={p['formant']}:pitchq=quality"); sr = SR
    y = _ffmpeg(x, sr, ",".join(chain))
    if e.get("whisper"):
        rng = np.random.default_rng(3)
        env = np.abs(y); env = np.convolve(env, np.ones(400) / 400, mode="same")
        y = y * 0.5 + rng.standard_normal(len(y)).astype(np.float32) * env * 0.9
    return y.astype(np.float32)
