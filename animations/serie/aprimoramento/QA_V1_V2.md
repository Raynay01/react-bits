# Controle de qualidade: v1 × v2 (Fase 6)

Todos os números abaixo foram medidos neste projeto. Dados brutos em `aprimoramento/qa/expressividade_v2.json` e em `build*/epXX/qa.json`.

## 1. Expressividade: mesma frase, 5 emoções, motor de cada versão
**Frase:** "Eu não acredito que você fez isso comigo depois de tudo."

**Métrica:** variação do contorno de altura (desvio-padrão em semitons). Valores maiores indicam entonação mais viva. A **diferença entre emoções** mostra se a voz realmente muda de interpretação.

| Personagem | v1 (5 emoções) | v2 (5 emoções) | Diferença entre emoções v1 → v2 |
|---|---|---|---|
| Noob | 2,41–3,31 | 2,39–3,90 | 0,90 → **1,51** |
| Pro | 1,10–1,28 | 1,59–2,01 | 0,18 → **0,42** |
| Luna | 2,01–2,18 | 2,57–3,31 (*) | 0,17 → **0,74** |
| Pipoca | 2,50–3,12 | 2,18–3,27 | 0,62 → 1,09 |

(*) Duas gerações isoladas da Luna (raiva e medo) **alucinaram**: fala esticada por 8–20 s. Elas foram excluídas da faixa. Na produção, esse problema é barrado pelo filtro de duração (ver §3).

**Leitura honesta:**
- **Noob e Luna** ganharam interpretação perceptível: a tristeza fica mais contida, e o medo e a alegria ficam mais amplos.
- **O Pro melhorou cerca de 50%**, mas continua o mais contido do elenco. A referência dele é o timbre da v1, que já era monótono, e o Chatterbox herda parte disso.
- **A Pipoca não melhorou de forma mensurável.** A voz infantil exigiu reduzir o exagero (`ex_scale` 0,7) para evitar alucinações. Isso confirma o que a literatura aponta sobre vozes infantis em pt-BR.
- A emoção do Chatterbox também aparece em energia, ritmo e timbre, que essa métrica de altura não captura.

## 2. Pronúncia e distinção entre vozes (série completa)
| Métrica | v1 | v2 |
|---|---|---|
| Falas | 140 | 157 (+17 de correções de roteiro) |
| Pronúncia média (Whisper) | 0,88 | **0,92** |
| Falas com pronúncia ≥ 0,75 | 87% | **92%** |
| Maior similaridade entre dois personagens principais | 0,88 (Pro × Zé) | **0,74** (Vovô × Zé) |
| Duração total | 11,5 min | 14,0 min |

O aumento da duração vem das falas novas (recapitulação, cumplicidade Noob–Pro, revelação da origem do VÓRTEX) e de uma fala cerca de 9% mais pausada.

## 3. Problemas encontrados no motor v2 e como foram tratados
| Problema | Tratamento | Situação |
|---|---|---|
| Alucinações: repetição ou fala esticada (até 28 s numa frase de 3 s) | Duração esperada por fala; tomadas acima de 1,7× são penalizadas, com até 6 tomadas por fala. | Corrigido. Nenhuma fala final acima do limite. |
| Sílabas extras isoladas no fim | Corte inteligente que remove trechos curtos isolados. Só é aplicado se a pronúncia não piorar. | Corrigido. |
| Palavras isoladas ("VOCÊ!") saíam ininteligíveis | Falas expandidas ("Você! É você!"). | Corrigido. |
| Pipoca lenta demais (1,54× a v1) | Andamento 1,22× por personagem (rubberband, sem alterar a altura). | Corrigido. |
| Vozes masculinas criadas por descrição saíram agudas (Pro e Zé) | Timbre da v1 usado como referência. | Corrigido. |

## 4. Falas que ainda merecem uma revisão humana
Notas baixas na checagem automática, que pode errar em palavras soltas:
- EP2 VÓRTEX: "Entreguem o Noob. Ou a vila inteira será apagada." (0,57; os efeitos do gigante atrapalham a transcrição)
- EP4 Pro: "Hah... valeu, Noob." (0,40)
- EP8 Pro (galinha): "Corre! Não para! Cocoricó!" (0,44)

## 5. Imagem
- **Boca:** passou a ter 2 parâmetros, abertura e arredondamento (O/U contra A/E), estimados do espectro da própria fala.
- **Quem escuta:** vira a cabeça para quem fala.
- **Recapitulação:** "ANTERIORMENTE" no início de cada episódio.
- **Pipoca:** o chaveiro do botão vermelho aparece em cena.
- Conferido por folhas de contato e quadros extraídos dos MP4. **Os episódios não foram assistidos quadro a quadro.**

## 6. Limitações que continuam
- Ainda não há formas de boca por fonema (M/B/F). O Rhubarb continua dependendo da sua autorização para executar o binário.
- A trilha ainda é a de código da v1, porque nenhuma faixa royalty-free foi fornecida.
- A sobreposição de falas é limitada a interrupções. Não há fala simultânea contínua.
- **Eu não consigo ouvir o áudio.** A avaliação é feita por métricas e transcrição. A palavra final sobre naturalidade é sua.
