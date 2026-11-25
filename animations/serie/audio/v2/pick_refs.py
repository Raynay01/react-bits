"""Seleção do elenco vocal v2 (teste de elenco objetivo).

Para cada personagem há 2+ vozes candidatas criadas por descrição. Escolhe a
combinação que:
  1. tem boa pronúncia (Whisper) e
  2. deixa as vozes o mais DIFERENTES possível entre si (embeddings de locutor).
Copia as escolhidas para refs/<personagem>.wav e grava refs/selecao.json.

    python pick_refs.py <dir_candidatas>
"""
import glob, itertools, json, os, shutil, sys
import numpy as np, soundfile as sf, librosa, sherpa_onnx

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import build_episode as B
from voicelab import MODELS

src = sys.argv[1]
CAST = json.load(open(f"{src}/cast.json"))
ext = sherpa_onnx.SpeakerEmbeddingExtractor(sherpa_onnx.SpeakerEmbeddingExtractorConfig(model=f"{MODELS}/wespeaker_en_voxceleb_resnet34.onnx", num_threads=4))
cands = {}
for who in CAST:
    for p in sorted(glob.glob(f"{src}/{who}_*.wav")):
        y, sr = sf.read(p, dtype="float32")
        y44 = librosa.resample(y, orig_sr=sr, target_sr=B.SR)
        sc = B.score(CAST[who][1], B.asr(y44))
        y16 = librosa.resample(y, orig_sr=sr, target_sr=16000)
        st = ext.create_stream(); st.accept_waveform(16000, y16); st.input_finished()
        e = np.array(ext.compute(st)); e /= np.linalg.norm(e)
        f0, _, _ = librosa.pyin(y16, fmin=60, fmax=700, sr=16000); f = f0[~np.isnan(f0)]
        cands.setdefault(who, []).append(dict(path=p, score=sc, emb=e, f0=float(np.median(f)), st=float(np.std(12 * np.log2(f / np.median(f))))))
        print(f"{os.path.basename(p):12s} pronúncia={sc:.2f} f0={np.median(f):5.0f}Hz entonação={cands[who][-1]['st']:.2f}st")
names = list(cands)
# faixa de altura esperada (Hz) por personagem: evita, p.ex., um "barítono" com voz aguda
F0 = {"noob": (90, 190), "pro": (120, 230), "luna": (170, 330), "pipoca": (260, 600), "vovo": (70, 150), "ze": (75, 160),
      "vortex": (50, 140), "sistema": (80, 180), "drone": (80, 320)}
best = None
for combo in itertools.product(*[range(len(cands[n])) for n in names]):
    sel = [cands[n][k] for n, k in zip(names, combo)]
    if min(c["score"] for c in sel) < 0.4: continue   # a referência só define o timbre; a fala final é regerada
    if any(not (F0[n][0] <= c["f0"] <= F0[n][1]) for n, c in zip(names, sel)): continue   # idade/gênero coerentes
    sims = [float(a["emb"] @ b["emb"]) for a, b in itertools.combinations(sel, 2)]
    cost = max(sims) + 0.3 * np.mean(sims) - 0.2 * np.mean([c["score"] for c in sel])
    if best is None or cost < best[0]: best = (cost, combo)
os.makedirs(f"{HERE}/refs", exist_ok=True)
rep = {}
for n, k in zip(names, best[1]):
    c = cands[n][k]; shutil.copy(c["path"], f"{HERE}/refs/{n}.wav")
    rep[n] = dict(origem=os.path.basename(c["path"]), descricao=CAST[n][0], pronuncia=round(c["score"], 3), f0_hz=round(c["f0"]), entonacao_st=round(c["st"], 2))
sel = [cands[n][k] for n, k in zip(names, best[1])]
M = [[round(float(a["emb"] @ b["emb"]), 2) for b in sel] for a in sel]
json.dump(dict(escolhas=rep, nomes=names, similaridade=M), open(f"{HERE}/refs/selecao.json", "w"), ensure_ascii=False, indent=1)
print("\nescolhidas:", {n: rep[n]["origem"] for n in names})
print("          " + " ".join(f"{n[:6]:>6s}" for n in names))
for n, row in zip(names, M): print(f"{n:9s} " + " ".join(f"{v:6.2f}" for v in row))
