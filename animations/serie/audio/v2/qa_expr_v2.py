"""Fase 6 — teste controlado de expressividade v2 (mesma frase e emoções do diagnóstico da v1).
Gera com o Chatterbox (rodar no ambiente dele): python qa_expr_v2.py <saida>"""
import os, sys, torch, soundfile as sf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cbvoice
from bible_v2 import VOICES, EMOTIONS, ref_path
T = "Eu não acredito que você fez isso comigo depois de tudo."
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
torch.set_num_threads(os.cpu_count()); m = cbvoice.load()
for who in ["noob", "pro", "luna", "pipoca"]:
    for emo in ["neutro", "raiva", "tristeza", "medo", "alegria"]:
        p = dict(EMOTIONS[emo]); p["ex"] *= VOICES[who].get("ex_scale", 1.0); p["temp"] = min(p["temp"], VOICES[who].get("temp", 9))
        torch.manual_seed(11)
        w = m.generate(T, language_id="pt", audio_prompt_path=ref_path(VOICES[who]["ref"]), exaggeration=p["ex"], cfg_weight=p["cfg"], temperature=p["temp"])
        sf.write(f"{out}/{who}_{emo}.wav", w.squeeze(0).numpy(), m.sr); print(who, emo, flush=True)
