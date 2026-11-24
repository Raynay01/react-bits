# Pesquisa de tecnologias (novembro de 2026)

**Legenda:** ✅ testado neste projeto · 📄 apenas documentação ou relatos verificados · ⛔ não foi possível testar aqui.

**Ambiente atual:** contêiner sem GPU (4 núcleos de CPU, 15 GB de RAM). A rede bloqueia `huggingface.co`, `api.elevenlabs.io` e `freesound.org`. PyPI e downloads de releases do GitHub funcionam. Por isso, **nenhum dos motores novos abaixo pôde ser testado ainda**: os pesos ficam no Hugging Face, e a API da ElevenLabs está bloqueada.

## 1. Síntese de voz

| Ferramenta | Naturalidade e emoção | pt-BR | Consistência | Licença (pesos) | Hardware | Status |
|---|---|---|---|---|---|---|
| **ElevenLabs v3** | Muito alta. *Audio tags* inline ([sussurra], [suspira], [ri]) e endpoint **Text-to-Dialogue** para conversas com interrupções. | Português suportado; sotaque pt-BR não confirmado na documentação. | Alta (voz salva por ID). Permite **criar vozes originais por descrição (Voice Design)**, sem clonar ninguém. | Comercial, pago por caractere. | Nuvem | 📄 ⛔ |
| **Chatterbox Multilingual** (Resemble AI) | Alta. Controle explícito de **exagero emocional** (`exaggeration`) e de ritmo (`cfg_weight`). | **Finetune dedicado pt-BR** publicado pela Resemble. | Alta, com áudio de referência fixo por personagem. | **MIT** (uso comercial OK) | Roda em CPU (lento); GPU recomendada. | 📄 ⛔ (pesos no HF) |
| **Qwen3-TTS** (Alibaba) | Alta. Emoção e estilo por **instrução em linguagem natural**. O modelo **VoiceDesign cria vozes originais a partir de uma descrição.** | Português suportado. | Alta (mesma descrição ou mesma referência). | **Apache-2.0** | CPU possível, mas 10–50× mais lento que GPU. | 📄 ⛔ (pesos no HF/ModelScope) |
| F5-TTS pt-BR (firstpixel) | Boa naturalidade, emoção limitada à referência. | Sim (finetune, "teste preliminar"). | Média | **CC-BY-NC-4.0 (não comercial)** | GPU | 📄 |
| XTTS-v2 (Coqui) | Boa | Sim | Média (oscila entre gerações) | **CPML: não comercial**. A empresa encerrou e o fork é mantido pela comunidade. | GPU recomendada | 📄 |
| Fish Speech / OpenAudio S1-mini | Alta, com marcadores de emoção | pt listado | Alta | **CC-BY-NC-SA (não comercial)**. O S1 está sendo descontinuado. | GPU | 📄 |
| Voxtral TTS (Mistral) | Alta (segundo o fabricante) | Sim | Alta | **CC-BY-NC (não comercial)** | GPU | 📄 |
| OpenVoice V2 | Transfere timbre, mas não atua. | **Sem pt nativo** | — | MIT | GPU/CPU | 📄 |
| Kokoro v1.0 + Piper (atual) | Média. **Sem controle de emoção** (ver medições no DIAGNOSTICO.md). | 3 vozes Kokoro + 6 Piper. | Alta | Apache / MIT | CPU, rápido | ✅ |

**Leitura crítica:**
- Os listões "melhor TTS de 2026" na web se contradizem e não testam pt-BR com emoção.
- Um estudo acadêmico (STIL 2026) aponta que os modelos neurais ainda têm desempenho reduzido em pt-BR para **vozes infantis e prosódia emocional**. Isso afeta exatamente a Pipoca.
- **Atenção à licença:** se a série for monetizada no TikTok ou no YouTube, os modelos marcados como não comerciais (F5, XTTS, Fish, Voxtral) são arriscados.

### Recomendação
1. **Melhor qualidade, menor esforço: ElevenLabs v3.** Usar Voice Design para criar 9 vozes originais e Text-to-Dialogue para cenas com interrupções. O roteiro inteiro tem **cerca de 6.300 caracteres** (140 falas). Mesmo gerando 3 tomadas por fala, o volume cabe num plano de entrada. **Requer** uma chave de API sua e a liberação de `api.elevenlabs.io` no ambiente.
2. **Melhor alternativa aberta e de uso comercial livre: Chatterbox Multilingual pt-BR (MIT) + Qwen3-TTS VoiceDesign (Apache-2.0).**
   - O Qwen3 cria, a partir de descrições, uma voz-referência original de cerca de 10 s para cada personagem, sem clonar pessoas reais.
   - O Chatterbox gera todas as falas com controle de emoção, sempre a partir dessa mesma referência.
   - **Requer** a liberação de `huggingface.co`. Em CPU, a geração será lenta (estimativa não medida: horas para a série inteira).
3. **Manter o sistema atual** só como plano de contingência. As medições mostram que ele não atua.

**Recomendação final:** opção 1, ou opção 2 se você preferir não pagar nem depender de nuvem. Antes de gravar a série inteira, fazer um **teste de elenco** com as mesmas 3 frases emocionais por personagem, comparando a versão 1 com a nova pelas mesmas métricas.

## 2. Sincronização labial
| Ferramenta | Como funciona | Encaixe no projeto | Licença | Status |
|---|---|---|---|---|
| **Rhubarb Lip Sync** | Gera formas de boca A–H/X a partir do áudio. Modo `phonetic` para idiomas que não são inglês. | **Encaixe direto:** os rostos já são desenhados em canvas, basta desenhar 9 bocas. | MIT | Binário baixado do GitHub; **a execução foi bloqueada pela política do ambiente** e precisa da sua autorização. |
| Alinhamento de fonemas do próprio TTS | Piper e Kokoro fornecem os fonemas, que viram formas de boca. | Sem binário externo. Funciona com as vozes atuais. | — | 📄 (a API do Piper expõe `phoneme_alignments`) |

## 3. Trilha, efeitos e ambiência
- **Trilha:** substituir a síntese por código por faixas de biblioteca livre de royalties (Biblioteca de áudio do YouTube, Pixabay Music), escolhidas por clima. Modelos generativos (MusicGen, Stable Audio Open) têm licenças restritivas ou não comerciais nos pesos.
- **Efeitos e ambiência:** Freesound (filtrar por CC0) e pacotes royalty-free (Sonniss GDC). **Bloqueados na rede atual**, mas você pode enviar os arquivos ou liberar o host.
- **Acústica por cenário:** reverberação por convolução no ffmpeg (`afir`) com respostas a impulsos simples geradas por código. Não depende de rede.

## Fontes
- Listas e comparativos (tratados como pistas, não como evidência): [AssemblyAI](https://www.assemblyai.com/blog/free-open-source-text-to-speech), [Pinggy](https://pinggy.io/blog/best_open_source_self_hosted_text_to_speech_models/), [tts.ai](https://tts.ai/blog/open-source-text-to-speech-guide-2026/), [findskill.ai](https://findskill.ai/blog/best-open-source-tts-2026/)
- Estudo pt-BR: [STIL 2026](https://aclanthology.org/2026.stil-1.29.pdf)
- ElevenLabs: [Eleven v3](https://elevenlabs.io/pt/blog/eleven-v3), [audio tags](https://elevenlabs.io/pt/blog/v3-audiotags), [preços da API](https://elevenlabs.io/pricing/api)
- Chatterbox: [model card](https://huggingface.co/ResembleAI/chatterbox/blob/main/README.md), [repositório](https://docsearch.algolia.com/mcp/docs/repo/resemble-ai/chatterbox)
- Qwen3-TTS: [GitHub](https://github.com/QwenLM/Qwen3-TTS), [artigo](https://arxiv.org/html/2601.15621), [FAQ](https://www.mintlify.com/QwenLM/Qwen3-TTS/resources/faq)
- F5-TTS pt-BR: [firstpixel/F5-TTS-pt-br](https://huggingface.co/firstpixel/F5-TTS-pt-br)
- XTTS-v2: [model card](https://huggingface.co/coqui/XTTS-v2/blob/v2.0.1/README.md?code=true), [docs](https://coqui-tts.readthedocs.io/en/latest/_sources/models/xtts.md.txt)
- Fish Audio: [S1-mini](https://huggingface.co/fishaudio/openaudio-s1-mini/blob/main/README.md), [changelog](https://docs.fish.audio/changelog)
- Voxtral: [Mistral](https://mistral.ai/news/voxtral-tts/), [model card](https://huggingface.co/mistralai/voxtral-4b-tts-2603)
- OpenVoice: [OpenVoiceV2](https://huggingface.co/myshell-ai/OpenVoiceV2)
- Rhubarb: [releases](https://github.com/DanielSWolf/rhubarb-lip-sync/releases)
