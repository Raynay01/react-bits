# Bíblia Vocal v2 (documento permanente)

Este documento é a referência obrigatória para a voz de cada personagem, nesta versão e em todos os episódios futuros. A configuração técnica fica em `audio/v2/bible_v2.py`, e os áudios de referência em `audio/v2/refs/`.

## Como as vozes são produzidas
1. **Identidade (timbre):** cada personagem tem um áudio-referência fixo de cerca de 10 s em `refs/<personagem>.wav`.
   - Sete referências foram **criadas do zero a partir de uma descrição** com o Qwen3-TTS VoiceDesign (Apache-2.0).
   - As do **Pro** e do **Zé** reaproveitam o timbre da v1, que também é sintético.
   - **Nenhuma voz de pessoa real foi clonada.**
2. **Interpretação:** cada fala é gerada pelo **Chatterbox Multilingual V3, finetune pt-BR (MIT)**, a partir dessa referência. A emoção é controlada por:
   - `ex` (intensidade expressiva);
   - `cfg` (ritmo: menor é mais solto);
   - `temp` (variação entre tomadas).
3. **Seleção:** são gravadas 2 tomadas por fala. Fica a de melhor pronúncia, verificada pelo Whisper; no empate, a de entonação mais viva.
4. **Cena:** o ritmo entre falas depende do contexto, as interrupções cortam a fala anterior de verdade, e cada cenário tem sua acústica e sua ambiência.
5. **Marca d'água:** o Chatterbox inclui uma marca d'água inaudível (Perth) em todo áudio gerado. Ela foi mantida ativa.

## Por que o elenco mudou da v1 para a v2 (decisão de produção)
- **O problema medido:** na v1 as emoções não alteravam a interpretação. O Pro tinha só 1,1 a 1,3 semitons de variação de entonação. Detalhes em `DIAGNOSTICO.md` §4.
- **O que a v2 resolve:** o Chatterbox gera emoção real a partir da mesma identidade.
- **Pro e Zé mantêm o timbre da v1:** as vozes criadas por descrição saíram agudas demais para um adolescente masculino e para um barítono (230–370 Hz).
  - No teste, o timbre da v1 do Pro passou para 2,8 semitons de variação, com pronúncia perfeita.
  - O Zé manteve o sotaque de Portugal.
- **Distinção entre vozes:** a maior similaridade entre dois personagens principais caiu de 0,88 (v1) para 0,74 (v2). Matriz completa em `refs/selecao.json`.

## Fichas

### Noob
- **Psicologia:** calmo, irônico, generoso. Esconde a insegurança atrás da piada e só perde a calma quando alguém que ele ama corre perigo.
- **Idade vocal:** cerca de 19 anos. **Timbre:** masculino jovem, médio-grave (cerca de 104 Hz na referência), redondo, com um sorriso na voz.
- **Ferramenta:** referência VoiceDesign `noob.wav`, criada pela descrição "friendly young Brazilian man, ~19, warm mid-range, relaxed and playful, ironic, São Paulo accent".
- **Velocidade:** pausada. Ele solta a piada no fim da frase.
- **Entonação habitual:** descendente e relaxada, com subidas irônicas.
- **Expressões:** "Ué...", "Relaxa", "Quer apostar?".
- **Em situações extremas:** a calma racha. Fala rápida e falhada no medo; grito curto e cortante ("PIPOCA!"); choro contido.

### Pro (Kauã)
- **Psicologia:** arrogante e competitivo, com medo de não ser ninguém. Trai por insegurança e se redime pela coragem.
- **Idade vocal:** 14–16 anos. **Timbre:** masculino adolescente, médio (cerca de 164 Hz), áspero e projetado.
- **Ferramenta:** referência `pro.wav`, com o timbre da v1 (Piper `pt_BR-jeff`).
- **Velocidade:** rápida. Atropela as palavras quando está irritado.
- **Entonação habitual:** ataques fortes, fins de frase em subida desafiadora.
- **Expressões:** "mano", "top um do ranking", "beleza?".
- **Em situações extremas:** grito rouco na raiva; voz baixa e quebrada na culpa (EP6); determinação firme no resgate (EP7–EP8).

### Luna (Luna_Exe)
- **Psicologia:** ex-moderadora voluntária, banida por investigar o VÓRTEX. Sarcástica, controlada e protetora, sem admitir.
- **Idade vocal:** cerca de 20 anos. **Timbre:** feminino, médio-agudo (cerca de 313 Hz), nítido e seco.
- **Ferramenta:** referência VoiceDesign `luna.wav`, criada pela descrição "sharp, confident young woman, crisp clear voice, dry sarcastic delivery, short precise sentences".
- **Velocidade:** econômica, com frases curtas.
- **Entonação habitual:** plana e seca. A ênfase vem da pausa, não do volume.
- **Expressões:** "Tenta acompanhar.", "Anotado."
- **Em situações extremas:** fúria fria e baixa (EP6); desespero que acelera e quebra a frase (EP9); alívio que quase ri (EP10).

### Pipoca (Pipoca2017)
- **Psicologia:** cerca de 8 anos, hiperativo e curioso, corajoso sem perceber. Carrega o chaveiro com o botão vermelho.
- **Timbre:** infantil e agudo (cerca de 503 Hz), saltitante.
- **Ferramenta:** referência VoiceDesign `pipoca.wav`, criada pela descrição "hyperactive child, ~8, high bright voice, speaks fast and giggles".
- **Velocidade:** acelerada, emendando as frases.
- **Entonação habitual:** sobe no fim das frases.
- **Expressões:** "É ELE!", "Ganhei!", "Uhul!".
- **Em situações extremas:** choro com soluço (EP3, EP6, EP10); medo agudo (EP5).

### Vovô Byte (o Fundador)
- **Psicologia:** sábio, caloroso e culpado por ter criado o VÓRTEX. Fala como quem conta uma história.
- **Idade vocal:** cerca de 75 anos. **Timbre:** masculino grave (cerca de 89 Hz), aveludado, com leve tremor.
- **Ferramenta:** referência VoiceDesign `vovo.wav`, criada pela descrição "wise warm elderly man, ~75, deep velvety voice, slight tremble, slow storyteller pace".
- **Velocidade:** lenta, cheia de pausas.
- **Entonação habitual:** descendente e terna.
- **Expressões:** "meu jovem".
- **Em situações extremas:** urgência que atropela a calma (EP3); despedida serena (EP7).

### Zé Tijolo
- **Psicologia:** mercador português, otimista e trambiqueiro de bom coração. Lidera a vila no clímax.
- **Idade vocal:** cerca de 50 anos. **Timbre:** barítono (cerca de 82 Hz), encorpado, com **sotaque de Portugal**.
- **Ferramenta:** referência `ze.wav`, com o timbre da v1 (Kokoro `im_nicola` com fonetização de Portugal).
- **Velocidade:** cantada, de vendedor.
- **Expressões:** "Ó pá", "pois, pois", "cá em baixo".
- **Em situações extremas:** pânico cômico (EP8); bravura inesperada (EP8–EP10).

### VÓRTEX
- **Psicologia:** lógica fria e absoluta, sem raiva. Isso é o mais assustador. Redimido no EP10.
- **Timbre:** muito grave (cerca de 79 Hz), sobre-humano.
- **Ferramenta:** referência VoiceDesign `vortex.wav`, criada pela descrição "colossal cold AI, very deep slow resonant voice". Recebe ainda o pós-processamento `post`: −3 semitons com formantes de gigante, coro, eco de catedral e graves reforçados.
- **Velocidade:** lenta e implacável.
- **Expressões:** "Todo erro será apagado."
- **Em situações extremas:** fúria contida, com mais peso e sem gritar.
- **EP10 (`vbot`):** mesma referência, **sem a armadura de efeitos**. A voz fica mais próxima, quase humana. É uma mudança justificada pela narrativa.

### SISTEMA
- **Timbre:** locutor neutro, médio (cerca de 118 Hz), filtrado como alto-falante digital (`post`).
- **Ferramenta:** referência VoiceDesign `sistema.wav`. **Velocidade:** constante. **Emoção:** nenhuma.

### Ban-Bots (drones)
- **Timbre:** robótico e metálico, nasal, com modulação rápida e *bitcrush* (`post`).
- **Ferramenta:** referência VoiceDesign `drone.wav`. **Velocidade:** cortada. **Emoção:** nenhuma.

## Tabela de emoções (Chatterbox)
| Emoção | ex | cfg | temp | Quando usar |
|---|---|---|---|---|
| neutro | 0,45 | 0,50 | 0,80 | informação |
| calmo | 0,35 | 0,55 | 0,70 | consolo, mentor |
| ironia | 0,55 | 0,45 | 0,85 | Luna, Noob |
| alegria | 0,70 | 0,45 | 0,85 | |
| empolgado | 0,85 | 0,35 | 0,90 | Pipoca, Zé |
| raiva | 0,90 | 0,35 | 0,85 | |
| grito | 1,10 | 0,30 | 0,90 | |
| medo | 0,80 | 0,35 | 0,90 | |
| desespero | 1,00 | 0,30 | 0,95 | |
| tristeza | 0,35 | 0,60 | 0,75 | |
| choro | 0,70 | 0,45 | 0,90 | |
| surpresa | 0,75 | 0,40 | 0,90 | |
| sussurro | 0,30 | 0,60 | 0,70 | |
| ameaça | 0,55 | 0,55 | 0,70 | VÓRTEX |
| orgulho | 0,60 | 0,45 | 0,80 | |

Uma fala pode sobrescrever esses valores com o campo `ex: { ex, cfg, temp }` no roteiro.
