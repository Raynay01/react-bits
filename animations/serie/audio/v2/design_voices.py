"""Fase 3 — criação das vozes ORIGINAIS dos personagens (sem clonar ninguém).

Usa o Qwen3-TTS VoiceDesign (Apache-2.0): a voz nasce de uma descrição textual.
Cada personagem ganha um áudio-referência de ~10 s em pt-BR, que depois serve de
identidade fixa para toda a série (Chatterbox pt-BR, MIT).

Uso: python design_voices.py <saida> [personagem ...] [--takes N]
"""
import os, sys, time, json
import numpy as np, soundfile as sf, torch
from qwen_tts import Qwen3TTSModel

# descrições de elenco (em inglês, idioma em que o modelo segue melhor instruções)
CAST = {
 "noob": ("A friendly young Brazilian man, about 19 years old, warm mid-range voice with a soft smile in it, relaxed and playful, "
          "naturally ironic, clear diction, unhurried rhythm, Brazilian Portuguese accent from São Paulo.",
          "Relaxa, sério. Eu já caí em lugar muito pior... tipo o tutorial. Mas olha, se a gente ficar junto, dá certo. Confia em mim."),
 "pro":  ("An arrogant, energetic Brazilian teenage boy, about 14 years old, slightly raspy voice that is breaking, fast and punchy speech, "
          "competitive gamer slang, loud and cocky, Brazilian Portuguese accent from Rio de Janeiro.",
          "Sai da frente, novato! Quem manda nesse servidor sou eu, beleza? Eu sou top um do ranking, mano. Ninguém me vence."),
 "luna": ("A sharp, confident Brazilian young woman, about 20 years old, crisp clear mid-high voice, dry sarcastic delivery, "
          "short precise sentences, calm under pressure, Brazilian Portuguese accent.",
          "Três robôs, dois caminhos, um plano. Tenta acompanhar. E não, eu não vou explicar duas vezes."),
 "pipoca": ("A hyperactive Brazilian child, about 8 years old, high bright voice, very excited, speaks fast and giggles, "
            "innocent and curious, Brazilian Portuguese.",
            "Eu só apertei um botãozinho! Era vermelho e brilhava! Aí todo mundo sumiu... mas tudo bem, agora eu tenho vocês!"),
 "vovo": ("A wise, warm elderly Brazilian man, about 75 years old, deep velvety voice with a slight tremble of age, "
          "slow storyteller pace with long pauses, gentle and melancholic, formal Brazilian Portuguese.",
          "Eu construí o primeiro bloco deste mundo, meu jovem... e vi cada um deles cair. Mas ainda acredito em vocês."),
 "ze":   ("A cheerful, exaggerated Portuguese merchant from Lisbon, about 50 years old, warm full baritone, sing-song salesman rhythm, "
          "European Portuguese accent from Portugal, jovial and a bit of a trickster.",
          "Ó pá, aqui no Limbo tudo se vende! Até a esperança, e hoje com desconto. Pois, pois, aproveite, que amanhã sobe o preço!"),
 "vortex": ("A colossal, cold artificial intelligence with a very deep, slow, resonant male voice, emotionless and absolute, "
            "every word deliberate, synthetic but intelligible, neutral Portuguese.",
            "Todo erro será apagado. Todo jogador é um erro. A ordem será restaurada. Não há o que negociar."),
 "sistema": ("A neutral male public-address announcer voice, medium pitch, flat and mechanical delivery, very clear articulation, "
             "Brazilian Portuguese.",
             "Atenção. Jogadores banidos detectados no setor sete. O Grande Reset começará em vinte e quatro horas."),
 "drone": ("A small robot with a clipped, metallic, monotone voice, slightly nasal, speaks in short commands, neutral Portuguese.",
           "Erro detectado. Iniciando remoção. Alvo identificado. Aguarde."),
}

def main():
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    names = [a for a in sys.argv[2:] if not a.startswith("--") and not a.isdigit()] or list(CAST)
    takes = int(sys.argv[sys.argv.index("--takes") + 1]) if "--takes" in sys.argv else 2
    torch.set_num_threads(os.cpu_count())
    t0 = time.time()
    m = Qwen3TTSModel.from_pretrained("Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign", device_map="cpu", dtype=torch.float32)
    print(f"modelo carregado em {time.time()-t0:.0f}s", flush=True)
    for n in names:
        instr, text = CAST[n]
        for k in range(takes):
            torch.manual_seed(1000 + k)
            t = time.time()
            wavs, sr = m.generate_voice_design(text=text, instruct=instr, language="Portuguese", do_sample=True, temperature=0.8)
            sf.write(f"{out}/{n}_{k}.wav", wavs[0], sr)
            print(f"{n} take{k}: {len(wavs[0])/sr:.1f}s de áudio em {time.time()-t:.0f}s", flush=True)
    json.dump({n: CAST[n] for n in names}, open(f"{out}/cast.json", "w"), ensure_ascii=False, indent=1)

if __name__ == "__main__":
    main()
