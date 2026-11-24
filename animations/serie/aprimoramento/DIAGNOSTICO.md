# Diagnóstico da série (versão 1)

Material analisado: os 10 roteiros (`episodes/`), as linhas do tempo e os relatórios de pronúncia (`build/epXX/qa.json`), as folhas de contato com um quadro por cena, o código de voz (`audio/voicelab.py`) e o motor visual (`engine/`). Nada foi alterado nesta fase.

## 1. O que já funciona (preservar)
- **Arco principal sólido e com começo, meio e fim.** Exílio, mentor, treino, traição, perda do mentor, resgate, sacrifício e renascimento.
- **Plantar e pagar:** "a chave só funciona quando..." (EP3, paga no EP4), "só pode ser dada" (EP7, paga no EP9), "Quer apostar?" (piloto, paga no EP10).
- **Contagem do Reset coerente** (72h, 60h, 48h, 24h, 5 min, pausada). Ela dá urgência real.
- **Ganchos de fim de episódio fortes**, especialmente no EP3, EP4, EP5, EP7 e EP9.
- **Identidade visual consistente** entre os episódios: avatares, cenários, interface e legendas.
- **Mixagem básica correta:** música abaixa quando há fala e o volume segue o padrão de plataforma (−14 LUFS).

## 2. Problemas de história e continuidade
Detalhes e propostas estão em `CONTINUIDADE.md` §4.

| Gravidade | Problema |
|---|---|
| **Alta** | **P1:** a frase-gancho do EP1 ("foi você que começou tudo isso") nunca é explicada. |
| **Alta** | **P7:** a traição do EP5–EP6 não dói tanto quanto deveria, porque a amizade Noob–Pro nunca foi construída. A Luna diz "vendeu o seu amigo", mas o espectador não viu essa amizade. |
| Média | **P2:** a Luna não tem passado nem motivo próprio. Ela é só uma função ("a hacker"). |
| Média | **P3:** "Kauã" aparece do nada no EP4. |
| Média | **P6:** o Zé some depois do EP8 e a Vila não tem desfecho. |
| Média | **P4:** o botão vermelho da Pipoca resolve o clímax do EP9 sem ter sido visto antes. Soa como solução conveniente. |
| Baixa | **P5, P8, P9, P10:** detalhes implícitos ou apressados. |

## 3. Diálogos e ritmo
- **Exposição demais em bloco.** No EP3, o Vovô explica Chave, VÓRTEX e Reset em 3 falas seguidas (cerca de 25 s). Falas como "Então é por isso que o VÓRTEX quer o Noob" e "O portal! Do outro lado está o servidor... e o Vovô Byte" narram o que a imagem já mostra.
- **Cadência mecânica:** todas as falas têm o mesmo intervalo (0,18 s antes e 0,22 s depois), sem interrupções, sem sobreposições e sem reações curtas ("hã?", risos, suspiros). O resultado é uma conversa em fila, não uma conversa viva.
- **Vozes pouco distintas na escrita:** Luna, Noob e Pro às vezes falam da mesma forma. Faltam marcas próprias, como gírias de gamer para o Pro, frases técnicas e curtas para a Luna e expressões de Portugal para o Zé (hoje restritas a "Ó pá").
- **Fórmula repetida:** todo episódio abre com o mesmo plano de 3 s com título. Falta uma recapitulação de 2–3 s ("Anteriormente...") para quem chega pelo feed.
- Duração de 59 a 81 s por episódio: adequada ao formato vertical.

## 4. Dublagem (prioridade máxima), com medições
**Teste objetivo:** a mesma frase em 5 emoções, medindo a variação da entonação (desvio do contorno de altura, em semitons) e a faixa de altura usada.

| Personagem | Neutro | Raiva | Tristeza | Medo | Alegria | Faixa típica |
|---|---|---|---|---|---|---|
| Noob | 3,11 | 3,30 | 2,41 | 3,31 | 3,10 | ~10 st |
| **Pro** | **1,10** | **1,26** | **1,28** | **1,24** | **1,27** | **~3 st** |
| Luna | 2,06 | 2,18 | 2,10 | 2,09 | 2,01 | ~7,5 st |
| Pipoca | 2,66 | 3,12 | 2,50 | 2,77 | 2,69 | ~9 st |

O que os números mostram:
1. **As "emoções" quase não mudam a interpretação.** A variação de entonação fica praticamente igual em todas as emoções. O sistema atual só desloca a altura média, muda a velocidade e aplica efeitos (equalização, vibrato, compressão). É pós-produção, não atuação.
2. **O Pro é o personagem mais monótono** (faixa de cerca de 3 semitons), justamente o mais emocional da história.
3. **A causa está na origem:** os modelos atuais (Piper e Kokoro) não têm controle de emoção, e cada fala é gerada isoladamente, sem o contexto da cena. Ajustar parâmetros não resolve. **É preciso outro motor de voz.**
4. **Pronúncia:** 85% das falas com nota ≥ 0,75 na checagem automática (média 0,86). As falhas se concentram em exclamações curtas e em falas rápidas do Pro.
5. **A troca do Zé no meio da produção** (modelo de Portugal incompreensível) mostra que o elenco precisa de testes de seleção antes de gravar a série.
6. **Respiração e sussurro são ruído sintético filtrado**, e não respiração real.

## 5. Imagem, animação e som
| Área | Situação atual | Problema |
|---|---|---|
| Sincronização labial | Boca abre e fecha conforme o volume (1 parâmetro). | Sem formas de boca por som (M/B fechados, O arredondado, F/V). A boca "bate" e não articula. |
| Expressões | Uma expressão por fala, definida pela emoção. | Sem transições nem microexpressões. **Quem ouve fica com o rosto parado.** |
| Corpo | Poses procedurais em loop. | Gestos genéricos (seno). Sem reação ao que o outro diz. |
| Câmera | Enquadramento automático com desvio de obstáculos. | Ainda há planos com personagem na frente da câmera ou de costas (vistos nas folhas de contato do EP1, EP4, EP5 e EP8). |
| Trilha | Sintetizada por código (estilo chiptune). | Os mesmos timbres em todos os climas. Soa amadora perto da imagem. |
| Efeitos sonoros | Sintetizados por código. | Pouca ambientação por cenário (a Vila não tem vozes nem vento, a prisão não tem zumbido de dados). Foley quase inexistente. |
| Mixagem | Ducking de −11 dB, −14 LUFS. | **Vozes "secas" em todos os cenários.** Falta a acústica de cada lugar: eco na prisão branca, ar livre no servidor. |

## 6. Conclusão
A **história é boa e merece ser preservada.** Ela precisa de 6 a 8 correções pontuais de roteiro, a maioria adições curtas. O **maior salto de qualidade possível está na voz**, e ele depende de trocar o motor de síntese: os testes acima provam que os motores atuais não conseguem atuar. Em seguida vêm a **articulação labial com formas de boca**, as **reações de quem ouve** e uma **trilha e ambientação de verdade**.
