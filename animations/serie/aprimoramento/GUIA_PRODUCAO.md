# Guia de produção (Fase 7: padronização)

Este é o passo a passo para produzir ou refazer qualquer episódio com a mesma qualidade.

## Estrutura
| Pasta | Conteúdo |
|---|---|
| `episodes/` | Roteiros **v1** (originais, preservados). |
| `episodes-v2/` | Roteiros **v2** (aprimorados). Episódios novos nascem aqui. |
| `audio/voicelab.py`, `audio/build_episode.py` | Motor de voz v1. A v2 reaproveita os efeitos e a trilha. |
| `audio/v2/bible_v2.py` | **Bíblia vocal em código** (fonte única das configurações). |
| `audio/v2/refs/` | Áudios-referência que definem a identidade de cada voz. **Não alterar sem decisão registrada.** |
| `audio/v2/design_voices.py` | Cria vozes novas por descrição (Qwen3-TTS VoiceDesign). |
| `audio/v2/pick_refs.py` | Teste de elenco objetivo: pronúncia, distinção entre vozes e faixa de altura. |
| `audio/v2/synth_v2.py` | Gera as tomadas das falas (Chatterbox pt-BR). |
| `audio/v2/build_v2.py` | Escolhe a melhor tomada, monta o ritmo, a acústica e a ambiência, e mixa. |
| `engine/` | Motor visual, comum à v1 e à v2. |
| `aprimoramento/` | Diagnóstico, continuidade, pesquisa, bíblia vocal, QA e este guia. |

## Ambiente
- **Rede:** ambiente "react-bits (vozes HF)", que libera os hosts do Hugging Face para baixar os modelos.
- **Venvs:** dois ambientes Python separados, porque as dependências entram em conflito.
  - `venv-cb`: `pip install chatterbox-tts "setuptools<81"`
  - `venv-qw`: `pip install qwen-tts soundfile` (só para criar vozes novas)
- **Python principal:** `kokoro-onnx`, `piper-tts`, `sherpa-onnx` e `librosa`. Usado no QA com Whisper e na mixagem.
- **Sistema:** `apt-get install -y espeak-ng sox`, além de `ffmpeg` e do Playwright, que já vem instalado.
- **Modelos:** `ResembleAI/chatterbox`, `ResembleAI/Chatterbox-Multilingual-pt-br` e `Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign` (no Hugging Face). Whisper e speaker-embedding vêm das releases do sherpa-onnx no GitHub.

## Fluxo por episódio
1. **Antes de escrever:** consultar `aprimoramento/CONTINUIDADE.md` (regras, quem sabe o quê, pontas abertas).
2. **Roteiro** em `episodes-v2/epNN.mjs`:
   - campos `say`, `emo`, `text`, `interrupt`, `pre`/`post`, `ex` (sobrescreve a emoção) e `recap`;
   - **não usar falas de uma palavra só**, porque o Chatterbox as estraga; expandir ("Você! É você!").
3. **Dublagem:** `venv-cb/bin/python audio/v2/synth_v2.py NN --takes 2`
4. **Mixagem e QA:** `python3 audio/v2/build_v2.py NN`. Ler `build-v2/epNN/qa.json`.
5. **Regravar as falas fracas:** `synth_v2.py NN --takes 2 --retake`, depois `build_v2.py NN` de novo. Isso regrava falas com pronúncia < 0,75 ou duração > 1,7× a esperada.
6. **Revisão visual:** `BUILD=build-v2 ./preview.sh NN <three>` gera a folha de contato.
7. **Vídeo:** `node render.mjs NN --v2 --three <three>`
8. **Atualizar** `CONTINUIDADE.md` com o que mudou.

## Metas mínimas de qualidade (por episódio)
- Pronúncia média ≥ 0,88 e nenhuma fala < 0,6 sem revisão humana.
- Nenhuma fala com duração > 1,7× a esperada (alucinação).
- −14 LUFS e pico −1 dBTP (já automático).
- Folha de contato sem câmera dentro de personagem nem rosto de costas em plano de fala.

## Quando trocar ou criar uma voz
1. Escrever a descrição em `design_voices.py` (idade, gênero, timbre, ritmo, sotaque). **Nunca usar o nome ou a voz de uma pessoa real.**
2. Gerar 3 candidatas e rodar `pick_refs.py`. Ajustar a faixa de altura esperada (`F0`) do personagem.
3. Registrar a decisão e o motivo em `BIBLIA_VOCAL_V2.md`.
