"""Dublagem v2 — gera as tomadas de cada fala com o Chatterbox pt-BR.

Executar no ambiente do Chatterbox:
    python synth_v2.py <ep> [--takes 2]
Grava em build-v2/cache/<hash>_<take>.wav. A escolha da melhor tomada e a mixagem
ficam em build_v2.py (ambiente principal, que tem o Whisper para o QA).
"""
import hashlib, json, os, re, subprocess, sys, time
import numpy as np, soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
SERIE = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
from bible_v2 import VOICES, EMOTIONS, LEXICON, ref_path  # noqa: E402


def load_episode(n):
    path = os.path.join(SERIE, "episodes-v2", f"ep{n:02d}.mjs")
    js = "import(process.argv[1]).then(m=>process.stdout.write(JSON.stringify(m.default)))"
    return json.loads(subprocess.run(["node", "-e", js, path], capture_output=True, text=True, check=True).stdout)


def prep_text(text):
    for k, v in LEXICON.items():
        text = re.sub(rf"\b{k}\b", v, text, flags=re.I)
    text = re.sub(r"\b[A-ZÀ-Ý]{2,}\b", lambda m: m.group(0).capitalize(), text)   # caixa alta → ênfase vem da emoção
    return text


def line_key(who, emo, text, ex):
    gen = {k: VOICES[who][k] for k in ("ex_scale", "temp") if k in VOICES[who]}
    v = json.dumps([VOICES[who]["ref"], EMOTIONS[emo], ex, LEXICON] + ([gen] if gen else []), sort_keys=True)   # o pós-processamento (post) é aplicado na mixagem
    return hashlib.md5(f"{v}|{who}|{emo}|{text}".encode()).hexdigest()[:16]


def main():
    n = int(sys.argv[1]); takes = int(sys.argv[sys.argv.index("--takes") + 1]) if "--takes" in sys.argv else 2
    cache = os.path.join(SERIE, "build-v2", "cache"); os.makedirs(cache, exist_ok=True)
    ep = load_episode(n)
    # --retake: tomadas extras só para falas com pronúncia ruim no último QA
    weak = set()
    if "--retake" in sys.argv:
        qa = os.path.join(SERIE, "build-v2", f"ep{n:02d}", "qa.json")
        if os.path.exists(qa):
            weak = {l["text"] for l in json.load(open(qa))["lines"]
                    if l["score"] < 0.75 or l.get("dur", 0) > 1.7 * l.get("dur_esperada", 99)}
    todo = []
    for e in ep["events"]:
        if "say" not in e: continue
        who = e.get("voice", e["say"]); emo = e.get("emo", "neutro")
        h = line_key(who, emo, e["text"], e.get("ex"))
        for k in range(takes + (4 if e["text"] in weak else 0)):
            if not os.path.exists(f"{cache}/{h}_{k}.wav"):
                todo.append((who, emo, e["text"], e.get("ex"), h, k))
    print(f"EP{n:02d}: {len(todo)} tomadas a gerar", flush=True)
    if not todo: return
    import torch, cbvoice
    torch.set_num_threads(os.cpu_count())
    m = cbvoice.load()
    for who, emo, text, ex, h, k in todo:
        p = dict(EMOTIONS[emo]); p.update(ex or {})
        p["ex"] *= VOICES[who].get("ex_scale", 1.0); p["temp"] = min(p["temp"], VOICES[who].get("temp", 9))
        torch.manual_seed(1000 * k + 7)
        t = time.time()
        w = m.generate(prep_text(text), language_id="pt", audio_prompt_path=ref_path(VOICES[who]["ref"]),
                       exaggeration=p["ex"], cfg_weight=p["cfg"], temperature=p["temp"])
        sf.write(f"{cache}/{h}_{k}.wav", w.squeeze(0).numpy(), m.sr)
        json.dump(dict(who=who, emo=emo, text=text, take=k), open(f"{cache}/{h}_{k}.json", "w"), ensure_ascii=False)
        print(f"  {who:7s} {emo:9s} t{k} {w.shape[-1]/m.sr:4.1f}s em {time.time()-t:4.0f}s | {text[:50]}", flush=True)


if __name__ == "__main__":
    main()
