"""Gera vozes (espeak-ng pt-BR), trilha sonora, efeitos sonoros e o envelope
de sincronização labial para "O NOOB QUE NÃO PODIA MORRER".

Saídas (no diretório passado como argumento, padrão: ./build):
  audio.wav    – mixagem final (45 s, 44.1 kHz, estéreo)
  lipsync.json – abertura da boca por personagem, 30 fps
"""
import json, os, subprocess, sys, wave
import numpy as np

SR = 44100
DUR = 45.0
FPS = 30
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "build")
os.makedirs(OUT, exist_ok=True)
N = int(SR * DUR)
rng = np.random.default_rng(7)

# ----------------------------------------------------------------- falas
# (personagem, início em s, voz espeak, pitch, velocidade, texto)
LINES = [
    ("pro",   0.55, "pt-br+m3", 45, 190, "VOCÊ NÃO VAI SOBREVIVER NEM DEZ SEGUNDOS!"),
    ("noob",  3.55, "pt-br+m7", 75, 155, "Quer apostar?"),
    ("pro",   8.30, "pt-br+m3", 50, 185, "HA HA HA! EU AVISEI!"),
    ("noob", 12.30, "pt-br+m7", 75, 160, "Hmm, hambúrguer."),
    ("pro",  19.00, "pt-br+m3", 55, 200, "QUE TIPO DE HACK É ESSE?!"),
    ("noob", 20.35, "pt-br+m7", 75, 168, "Eu não tenho hack... tenho uma coisa melhor."),
    ("pro",  27.10, "pt-br+m3", 40, 140, "Não... pode... ser."),
    ("noob", 35.15, "pt-br+m7", 80, 190, "HA HA HA HA!"),
    ("noob", 38.25, "pt-br+m7", 90, 170, "Ué?!"),
    ("giant", 39.40, "pt-br+m1", 5, 120, "Você também está usando hack, Noob."),
]


def tts(voice, pitch, speed, text):
    path = os.path.join(OUT, "_tts.wav")
    subprocess.run(["espeak-ng", "-v", voice, "-p", str(pitch), "-s", str(speed),
                    "-w", path, text], check=True)
    with wave.open(path) as w:
        sr = w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    # reamostra para 44.1 kHz
    t_new = np.arange(int(len(x) * SR / sr)) / SR
    return np.interp(t_new, np.arange(len(x)) / sr, x)


def onepole(x, a):
    """Passa-baixa de um polo (resposta ao impulso truncada, convolução via FFT)."""
    k = int(min(len(x), max(8, 7 / max(a, 1e-4))))
    kern = a * (1 - a) ** np.arange(k)
    n = len(x) + k
    m = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(kern, m), m)[: len(x)]


voice = np.zeros(N)
lips = {c: np.zeros(int(DUR * FPS)) for c in ("pro", "noob", "giant")}
for who, start, v, p, s, text in LINES:
    x = tts(v, p, s, text)
    if who == "giant":
        # voz gigante: mais grave (desacelera) + distorção leve + eco
        x = np.interp(np.arange(int(len(x) * 1.18)) / 1.18, np.arange(len(x)), x)
        x = np.tanh(x * 2.2) * 0.8
        echo = np.zeros(len(x) + int(SR * 0.9))
        echo[: len(x)] += x
        for d, g in ((0.17, 0.45), (0.34, 0.25), (0.55, 0.12)):
            o = int(SR * d); echo[o:o + len(x)] += x * g
        x = echo
    if who == "pro":
        x = np.tanh(x * 1.6) * 0.9  # gritado
    i0 = int(start * SR)
    seg = x[: max(0, N - i0)]
    voice[i0:i0 + len(seg)] += seg * (1.1 if who != "giant" else 1.3)
    # envelope para lip sync
    hop = SR // FPS
    for f in range(len(seg) // hop):
        rms = np.sqrt(np.mean(seg[f * hop:(f + 1) * hop] ** 2))
        fi = int(start * FPS) + f
        if fi < len(lips[who]):
            lips[who][fi] = max(lips[who][fi], min(1.0, rms * 7))

with open(os.path.join(OUT, "lipsync.json"), "w") as fh:
    json.dump({k: [round(float(v), 3) for v in arr] for k, arr in lips.items()}, fh)

# ----------------------------------------------------------------- utilidades
t_all = np.arange(N) / SR
music = np.zeros(N)
sfx = np.zeros(N)


def env_exp(n, decay):
    return np.exp(-np.arange(n) / (SR * decay))


def put(buf, start, x, gain=1.0):
    i0 = int(start * SR)
    if i0 >= N:
        return
    x = x[: N - i0]
    buf[i0:i0 + len(x)] += x * gain


def tone(freq, dur, kind="sine", decay=None):
    n = int(dur * SR); t = np.arange(n) / SR
    ph = 2 * np.pi * freq * t
    if kind == "sine":
        x = np.sin(ph)
    elif kind == "square":
        x = np.sign(np.sin(ph)) * 0.5
    elif kind == "saw":
        x = 2 * ((freq * t) % 1) - 1
    elif kind == "tri":
        x = 2 * np.abs(2 * ((freq * t) % 1) - 1) - 1
    a = np.minimum(1, np.arange(n) / (SR * 0.005))
    if decay:
        a = a * env_exp(n, decay)
    else:
        a = a * np.minimum(1, (n - np.arange(n)) / (SR * 0.02))
    return x * a


def noise(dur):
    return rng.standard_normal(int(dur * SR))


def explosion(dur=2.2, size=1.0):
    n = noise(dur)
    boom = onepole(n, 0.02 / size) * 9
    crack = onepole(n, 0.25) * env_exp(len(n), 0.08)
    sub = tone(48 / size, dur, decay=0.5) * 0.9
    x = (boom * env_exp(len(n), 0.55 * size) + crack * 0.5 + sub)
    return np.tanh(x * 1.5) * 0.9


def whoosh(dur=0.6, up=True):
    n = noise(dur)
    e = np.sin(np.linspace(0, np.pi, len(n))) ** 2
    return onepole(n, 0.08) * e * 1.2


def ding(f1=1318.5, f2=1760):
    a = np.pad(tone(f1, 0.6, decay=0.18) * 0.5, (0, int(0.09 * SR)))
    b = np.pad(tone(f2, 0.6, decay=0.25) * 0.5, (int(0.09 * SR), 0))
    return a + b


def clang():
    x = sum(tone(f, 0.7, decay=0.15) * g for f, g in ((1840, .5), (2633, .35), (3910, .2), (5120, .1)))
    return x + onepole(noise(0.7), 0.5) * env_exp(int(0.7 * SR), 0.02) * 0.6


def oof():
    # som curto e cartunesco de dano (sintetizado, original)
    n = int(0.28 * SR); t = np.arange(n) / SR
    f = 260 - 140 * t / 0.28
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 0.12) * 0.6


def boing(dur=0.5, f0=180, f1=520):
    n = int(dur * SR); t = np.arange(n) / SR
    f = f0 + (f1 - f0) * (t / dur) + 30 * np.sin(2 * np.pi * 18 * t)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, dur / 2) * 0.5


def cluck():
    out = np.zeros(int(0.9 * SR))
    for k, (o, f) in enumerate(((0, 620), (0.16, 700), (0.34, 980))):
        n = int(0.14 * SR) if k < 2 else int(0.45 * SR)
        t = np.arange(n) / SR
        ff = f * (1 + 0.25 * np.sin(2 * np.pi * 9 * t)) * (1 + 0.6 * t)
        x = np.sign(np.sin(2 * np.pi * np.cumsum(ff) / SR)) * 0.25 * env_exp(n, 0.12 if k < 2 else 0.3)
        i = int(o * SR); out[i:i + n] += x
    return out


def riser(dur, f0=200, f1=1200):
    n = int(dur * SR); t = np.arange(n) / SR
    f = f0 * (f1 / f0) ** (t / dur)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * (t / dur) ** 2 * 0.3 + onepole(noise(dur), 0.3) * (t / dur) ** 3 * 0.25


def snap():
    return onepole(noise(0.12), 0.9) * env_exp(int(0.12 * SR), 0.012) * 1.4


def rumble(dur):
    return onepole(noise(dur), 0.006) * 14 * np.sin(np.linspace(0, np.pi, int(dur * SR)))


def lava_bed(dur):
    n = noise(dur)
    bub = np.zeros_like(n)
    for _ in range(int(dur * 3)):
        i = rng.integers(0, len(n) - 4000)
        bub[i:i + 4000] += tone(rng.uniform(90, 240), 4000 / SR, decay=0.03)[:4000] * 0.25
    return onepole(n, 0.01) * 3 + bub


# ----------------------------------------------------------------- trilha
def note(m):
    return 440 * 2 ** ((m - 69) / 12)

bpm = 120; beat = 60 / bpm
# Suspense 0–23 s: drone grave + pulso
drone = (tone(note(38), 23, "saw") * 0.12 + tone(note(45), 23, "sine") * 0.18)
drone = onepole(drone, 0.05) * np.minimum(1, t_all[: len(drone)] / 0.8)
put(music, 0, drone)
for i in range(int(23 / beat)):
    put(music, i * beat, tone(note(26), 0.35, decay=0.15) * 0.55)
    if i % 2 == 1:
        put(music, i * beat, onepole(noise(0.05), 0.6) * env_exp(int(0.05 * SR), 0.01) * 0.25)
# ostinato tenso nos ataques 13–23
ost = [62, 65, 62, 66, 62, 65, 62, 69]
for i in range(int(10 / (beat / 2))):
    put(music, 13 + i * beat / 2, tone(note(ost[i % 8]), 0.2, "square", decay=0.08) * 0.10)
# Revelação 23–29: pads crescendo
for k, ch in enumerate(([50, 57, 62], [48, 55, 63], [46, 53, 62])):
    for m in ch:
        p = tone(note(m), 2.2, "tri") * np.linspace(0.05, 0.16, int(2.2 * SR))
        put(music, 23 + k * 2, p)
put(sfx, 26.3, riser(2.7), 1.0)
# Humor 29.6–37: melodia saltitante
mel = [72, 76, 79, 76, 77, 74, 71, 74, 72, 76, 79, 84, 83, 79, 77, 74]
bass = [48, 55, 53, 55]
for i in range(int(7.4 / (beat / 2))):
    put(music, 29.6 + i * beat / 2, tone(note(mel[i % 16]), 0.22, "square", decay=0.09) * 0.13)
    if i % 2 == 0:
        put(music, 29.6 + i * beat / 2, tone(note(bass[(i // 2) % 4]), 0.25, "tri", decay=0.12) * 0.35)
    if i % 4 == 2:
        put(music, 29.6 + i * beat / 2, onepole(noise(0.08), 0.7) * env_exp(int(0.08 * SR), 0.02) * 0.2)
# Virada 37.3–43.5: suspense grave
put(music, 37.3, onepole(tone(note(31), 6.2, "saw"), 0.03) * 0.5)
put(music, 39.3, tone(note(37), 4.2, "sine") * 0.25)
put(music, 39.3, explosion(3, 1.6) * 0.6)  # impacto do gigante
# "PARTE 2?"
put(music, 44.0, explosion(1.0, 0.7) * 0.5)
put(music, 44.0, tone(note(50), 1.0, "saw", decay=0.4) * 0.2)

# ----------------------------------------------------------------- efeitos
put(sfx, 0, lava_bed(43.4), 0.35)
put(sfx, 0.4, clang(), 0.5)                      # espada apontada
put(sfx, 3.0, whoosh(0.5), 0.6)                  # zoom
put(sfx, 5.4, whoosh(0.4), 0.7); put(sfx, 5.55, oof(), 0.8)  # empurrão
put(sfx, 6.0, whoosh(1.2), 0.6)                  # queda
put(sfx, 7.25, explosion(3.0, 1.4), 1.0)         # explosão na lava
put(sfx, 10.4, lava_bed(0.6), 1.2)               # mão saindo da lava
put(sfx, 11.0, boing(0.6, 120, 600), 0.6)        # pulo pra fora
put(sfx, 12.1, boing(0.4, 300, 700), 0.4)
put(sfx, 13.4, whoosh(0.3), 0.7); put(sfx, 13.6, clang(), 0.8)   # espadada
put(sfx, 14.0, clang(), 0.6)
put(sfx, 15.0, whoosh(0.9), 0.6); put(sfx, 15.8, explosion(2.0, 1.0), 0.9)  # foguete
put(sfx, 17.2, explosion(2.0, 0.9), 0.9)        # dinamite
put(sfx, 18.0, explosion(1.6, 0.8), 0.7)
put(sfx, 18.5, explosion(1.6, 1.1), 0.8)
put(sfx, 24.8, ding(), 0.8)                       # menu
put(sfx, 25.6, ding(988, 1318), 0.6)
put(sfx, 29.0, snap(), 1.0)                       # estalo
put(sfx, 29.1, boing(0.8, 200, 900), 0.6)         # transformação
put(sfx, 29.9, cluck(), 0.9); put(sfx, 32.6, cluck(), 0.8); put(sfx, 34.4, cluck(), 0.7)
put(sfx, 30.5, rumble(4.5), 0.9)                  # cenário tremendo
put(sfx, 37.4, ding(523, 392), 0.9)               # aviso de expulsão (descendente)
put(sfx, 38.5, rumble(4.8), 1.1)

mix = voice * 0.95 + music * 0.55 + sfx * 0.6
mix[int(43.5 * SR):int(44.0 * SR)] *= 0.0         # corte seco para o preto
peak = np.max(np.abs(mix)); mix = mix / peak * 0.92
# leve estéreo
L = mix; R = np.concatenate([np.zeros(12), mix[:-12]])
stereo = (np.stack([L, R], 1) * 32767).astype(np.int16)
with wave.open(os.path.join(OUT, "audio.wav"), "w") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(stereo.tobytes())
os.remove(os.path.join(OUT, "_tts.wav"))
print("ok", OUT)
