"""Motor de dublagem v2: Chatterbox Multilingual V3 — finetune pt-BR (MIT).

A identidade de cada personagem vem de uma referência ORIGINAL criada por
descrição (design_voices.py). A emoção é controlada por `exaggeration`
(intensidade expressiva), `cfg_weight` (ritmo/aderência) e `temperature`.
"""
import glob, os
from pathlib import Path
import torch
from safetensors.torch import load_file
from chatterbox.mtl_tts import ChatterboxMultilingualTTS, Conditionals
from chatterbox.models.t3 import T3
from chatterbox.models.t3.modules.t3_config import T3Config
from chatterbox.models.s3gen import S3Gen
from chatterbox.models.voice_encoder import VoiceEncoder
from chatterbox.models.tokenizers import MTLTokenizer

HUB = os.path.expanduser("~/.cache/huggingface/hub")


def snap(repo):
    return Path(glob.glob(f"{HUB}/models--{repo.replace('/', '--')}/snapshots/*")[0])


def load(device="cpu"):
    base, ptbr = snap("ResembleAI/chatterbox"), snap("ResembleAI/Chatterbox-Multilingual-pt-br")
    ve = VoiceEncoder(); ve.load_state_dict(torch.load(base / "ve.pt", map_location="cpu", weights_only=True)); ve.eval()
    t3 = T3(T3Config.multilingual())
    st = load_file(ptbr / "t3_pt_br.safetensors")
    if "model" in st: st = st["model"][0]
    t3.load_state_dict(st); t3.eval()
    s3 = S3Gen(); s3.load_state_dict(torch.load(ptbr / "s3gen_v3.pt", map_location="cpu", weights_only=True), strict=False); s3.eval()
    tok = MTLTokenizer(str(ptbr / "grapheme_mtl_merged_expanded_v1.json"))
    return ChatterboxMultilingualTTS(t3, s3, ve, tok, device, conds=None)
