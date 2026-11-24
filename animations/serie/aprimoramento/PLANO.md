# Plano de aprimoramento (versão 2)

## Princípios
- **A versão 1 fica intacta:** `episodes/`, `audio/voicelab.py` e os MP4 atuais. A versão 2 nasce em pastas separadas (`episodes-v2/`, `audio/v2/`, `build-v2/`), e cada etapa vai para o Git em um commit próprio.
- **A história é a mesma.** Nenhum acontecimento importante sai. As correções são adições curtas e cirúrgicas (ver `CONTINUIDADE.md` §4).
- **Nada é dado como pronto sem comparação v1 × v2:** métricas de entonação, pronúncia e distinção entre vozes, mais folhas de contato visuais.

## Fase 3 — Identidade vocal (depende da sua decisão de motor)
1. **Teste de elenco:** 2–3 vozes candidatas por personagem, cada uma criada por descrição (sem clonar ninguém) e gravando as mesmas 3 frases (neutra, raiva, tristeza).
2. **Escolha por métricas e por audição sua:** variação de entonação, pronúncia (Whisper) e distância entre vozes.
3. **Bíblia Vocal v2:** ID e configuração exata de cada voz, idade vocal, textura, ritmo, expressões características e comportamento em situações extremas.

## Fase 4 — Roteiros v2 (pode começar já, sem depender do motor)
| Ep. | Mudanças principais |
|---|---|
| Todos | Recapitulação de 2–3 s ("Anteriormente..."). Reações curtas (risos, "hã?", suspiros). Ritmo variável entre falas: interrupções e pausas dramáticas onde fizer sentido. |
| EP1 | O Pro como galinha ganha gírias de gamer. A frase da Luna ganha o peso de quem já sabia de algo. |
| EP2 | A Luna lê o perfil do Pro ("Kauã") (P3). A Pipoca mostra o chaveiro-botão vermelho (P4). A Luna dá uma pista do próprio passado (P2). |
| EP3 | A exposição do Vovô dividida em diálogo com perguntas e interrupções. **Revelação de P1:** o uso da Chave no piloto despertou o VÓRTEX. Aldeões hostis em cena (P9). |
| EP4 | Fala ligando a falha do EP1 à regra da Chave (P5). **Momento de cumplicidade Noob–Pro** (P7). |
| EP5 | A traição mostrada em ação: o Pro aciona o sinal no tablet (P8). |
| EP6–EP8 | Polimento de diálogos. O Zé avisa que vai buscar os aldeões (P6). |
| EP9 | O botão vermelho já preparado. O Zé chega com a Vila. |
| EP10 | Reparação do VÓRTEX com a Luna (P10). A Vila no Servidor dos Banidos. O final se mantém. |

## Fase 5 — Produção
- **Dublagem com o motor escolhido**, com emoção real por fala (tags ou instrução) e diálogos gerados em conjunto quando o motor permitir.
- **Boca articulada:** formas de boca por som (Rhubarb, se você autorizar o binário, ou fonemas do próprio TTS).
- **Reações de quem ouve:** expressões e gestos de quem não está falando, com transições suaves entre expressões.
- **Acústica por cenário** (reverb) e **ambiência por set**: vozes da Vila, vento no Limbo, zumbido de dados na prisão.
- **Trilha:** faixas de biblioteca royalty-free (você escolhe ou me envia os arquivos), ou a síntese atual melhorada como contingência.

## Fase 6 — Controle de qualidade
- A mesma bateria de métricas da v1 aplicada à v2: variação de entonação por emoção, pronúncia e similaridade entre vozes.
- Folhas de contato v1 × v2 por episódio.
- Duração, picos e −14 LUFS por episódio.

## Fase 7 — Padronização
- Bíblia Vocal v2, `CONTINUIDADE.md` atualizado, um guia de produção com o passo a passo e scripts reproduzíveis (`run_all`).

## Decisões que preciso de você
1. **Motor de voz:**
   - **(A) ElevenLabs v3:** recomendado pela qualidade. Precisa da sua chave de API e da liberação de `api.elevenlabs.io`.
   - **(B) Chatterbox + Qwen3-TTS:** aberto e de uso comercial livre. Precisa da liberação de `huggingface.co` e é lento em CPU.
   - **(C) Manter o atual.**
2. **Autorizar a execução do Rhubarb Lip Sync** (binário MIT baixado do GitHub).
3. **Trilha:** você prefere escolher e enviar faixas royalty-free ou deixo a trilha por código melhorada?
