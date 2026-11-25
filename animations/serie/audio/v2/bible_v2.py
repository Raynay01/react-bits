"""BÍBLIA VOCAL v2 — configuração única e permanente das vozes da série.

Pipeline: cada personagem tem uma VOZ ORIGINAL criada por descrição (Qwen3-TTS
VoiceDesign, Apache-2.0; nenhuma pessoa real foi clonada). Esse áudio-referência
é a identidade fixa do personagem; todas as falas são geradas pelo Chatterbox
Multilingual V3 pt-BR (MIT) a partir dele, com a emoção controlada por:
  ex   = intensidade expressiva (exaggeration)
  cfg  = aderência/ritmo (cfg_weight: menor = mais solto e rápido)
  temp = variação entre tomadas (temperature)
Personagens artificiais (VÓRTEX, SISTEMA, drones) recebem também um tratamento
de áudio próprio (`post`), que faz parte da identidade deles.

Para trocar a voz de um personagem é preciso justificativa narrativa ou decisão
de produção registrada em aprimoramento/BIBLIA_VOCAL_V2.md.
"""
import os

REFS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "refs")


def ref_path(name):
    return os.path.join(REFS, name)


VOICES = {
    "noob":    dict(ref="noob.wav",    post=None),
    "pro":     dict(ref="pro.wav",     post=None),
    "luna":    dict(ref="luna.wav",    post=None),
    "pipoca":  dict(ref="pipoca.wav",  post=None, ex_scale=0.7, temp=0.7, tempo=1.22),   # voz infantil é instável com exagero alto
    "vovo":    dict(ref="vovo.wav",    post=None),
    "ze":      dict(ref="ze.wav",      post=None, tempo=1.15),
    "vortex":  dict(ref="vortex.wav",  post="rubberband=pitch=0.84:formant=shifted;;lowpass=f=8000,equalizer=f=90:t=q:w=1:g=5,chorus=0.85:0.9:25:0.15:0.2:1.5,aecho=0.9:0.45:70|120:0.1|0.06,acompressor=threshold=-18dB:ratio=4"),
    # VÓRTEX redimido (EP10): mesma referência, sem a "armadura" de efeitos
    "vbot":    dict(ref="vortex.wav",  post="highpass=f=90,equalizer=f=3000:t=q:w=1:g=2,aecho=0.6:0.3:30:0.15"),
    "sistema": dict(ref="sistema.wav", post="highpass=f=300,lowpass=f=5200,acrusher=bits=10:mix=0.25,aecho=0.6:0.4:35:0.25"),
    "drone":   dict(ref="drone.wav",   post="highpass=f=400,lowpass=f=4000,acrusher=bits=7:mix=0.5,tremolo=f=38:d=0.35"),
}

EMOTIONS = {
    "neutro":    dict(ex=0.45, cfg=0.50, temp=0.80),
    "calmo":     dict(ex=0.35, cfg=0.55, temp=0.70),
    "ironia":    dict(ex=0.55, cfg=0.45, temp=0.85),
    "alegria":   dict(ex=0.70, cfg=0.45, temp=0.85),
    "empolgado": dict(ex=0.85, cfg=0.35, temp=0.90),
    "raiva":     dict(ex=0.90, cfg=0.35, temp=0.85),
    "grito":     dict(ex=1.10, cfg=0.30, temp=0.90),
    "medo":      dict(ex=0.80, cfg=0.35, temp=0.90),
    "desespero": dict(ex=1.00, cfg=0.30, temp=0.95),
    "tristeza":  dict(ex=0.35, cfg=0.60, temp=0.75),
    "choro":     dict(ex=0.70, cfg=0.45, temp=0.90),
    "surpresa":  dict(ex=0.75, cfg=0.40, temp=0.90),
    "sussurro":  dict(ex=0.30, cfg=0.60, temp=0.70),
    "ameaca":    dict(ex=0.55, cfg=0.55, temp=0.70),
    "orgulho":   dict(ex=0.60, cfg=0.45, temp=0.80),
}

# pronúncia de termos estrangeiros/gamer
LEXICON = {"Noob": "Nub", "Noobs": "Nubs", "VÓRTEX": "Vórtex", "Reset": "Rizét", "obby": "óbi", "hack": "réqui",
           "Patch": "Pétchi", "ranking": "rânquin", "admin": "ádmin"}

# acústica por cenário (aplicada às vozes na mixagem)
ROOMS = {
    "limbo":    "aecho=0.8:0.5:90|180:0.18|0.1",
    "vila":     "aecho=0.8:0.3:40:0.08",
    "torre":    "aecho=0.8:0.35:60|140:0.08|0.05",
    "prisao":   "aecho=0.85:0.55:35|70|120:0.22|0.14|0.08",
    "servidor": "aecho=0.8:0.25:30:0.05",
    "arena":    "aecho=0.8:0.3:60:0.08",
}
