"""QA da Bíblia Vocal: inteligibilidade (Whisper) + distinção entre vozes (embeddings de locutor)."""
import sys, json, numpy as np, librosa, sherpa_onnx, soundfile as sf, os
from voicelab import speak, SR, MODELS
REF = {
 "noob": ("Relaxa. Eu já caí em lugar pior... tipo o tutorial.", "ironia"),
 "pro": ("Sai da frente, novato! Quem manda nesse servidor sou EU!", "raiva"),
 "luna": ("Três robôs, dois caminhos, um plano. Tenta acompanhar.", "neutro"),
 "pipoca": ("Eu só apertei um botãozinho! Era vermelho e brilhava!", "empolgado"),
 "vovo": ("Eu construí o primeiro bloco deste mundo, meu jovem... e vi cada um deles cair.", "calmo"),
 "ze": ("Ó pá, aqui no Limbo tudo se vende. Até a esperança, com desconto!", "alegria"),
 "vortex": ("Todo erro será apagado. Todo jogador é um erro.", "ameaca"),
 "sistema": ("Atenção. O Grande Reset começará em vinte e quatro horas.", "neutro"),
 "drone": ("Erro detectado. Iniciando remoção.", "neutro"),
}
out = sys.argv[1] if len(sys.argv) > 1 else "qa"; os.makedirs(out, exist_ok=True)
w = f"{MODELS}/sherpa-onnx-whisper-small"
asr = sherpa_onnx.OfflineRecognizer.from_whisper(encoder=f"{w}/small-encoder.int8.onnx", decoder=f"{w}/small-decoder.int8.onnx", tokens=f"{w}/small-tokens.txt", language="pt", task="transcribe", num_threads=4)
ext = sherpa_onnx.SpeakerEmbeddingExtractor(sherpa_onnx.SpeakerEmbeddingExtractorConfig(model=f"{MODELS}/wespeaker_en_voxceleb_resnet34.onnx", num_threads=4))
emb = {}; rep = {}
for who, (txt, emo) in REF.items():
    y = speak(who, txt, emo); sf.write(f"{out}/{who}.wav", y, SR)
    y16 = librosa.resample(y, orig_sr=SR, target_sr=16000)
    s = asr.create_stream(); s.accept_waveform(16000, y16); asr.decode_stream(s); hyp = s.result.text.strip()
    f0, _, _ = librosa.pyin(y16, fmin=60, fmax=600, sr=16000)
    st = ext.create_stream(); st.accept_waveform(16000, y16); st.input_finished(); e = np.array(ext.compute(st)); emb[who] = e / np.linalg.norm(e)
    rep[who] = dict(ref=txt, asr=hyp, f0=float(np.nanmedian(f0)), dur=len(y) / SR)
    print(f"{who:8s} f0={rep[who]['f0']:5.0f}Hz dur={rep[who]['dur']:.1f}s | {hyp}")
names = list(emb); M = np.array([[float(emb[a] @ emb[b]) for b in names] for a in names])
print("\nSimilaridade de locutor (cosseno; mesma pessoa costuma ser > 0.6):")
print("         " + " ".join(f"{n[:6]:>6s}" for n in names))
for i, a in enumerate(names): print(f"{a:8s} " + " ".join(f"{M[i, j]:6.2f}" for j in range(len(names))))
json.dump(dict(report=rep, names=names, similarity=M.round(3).tolist()), open(f"{out}/qa.json", "w"), ensure_ascii=False, indent=1)
