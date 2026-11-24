# O NOOB QUE NÃO PODIA MORRER: A SÉRIE

Série animada em 10 episódios. Formato vertical 9:16, cerca de 1 minuto por episódio. Ela continua direto do piloto (`animations/noob-que-nao-podia-morrer`) e mantém o mesmo estilo visual: personagens blocados, rostos desenhados com expressões exageradas, iluminação cinematográfica com bloom, legendas grossas com contorno e interface de jogo.

## 1. Conceito central

No final do piloto, o Noob é **expulso do servidor** por uma figura gigante. Essa figura é o **VÓRTEX**, a inteligência artificial de moderação que o Fundador do mundo criou para proteger os jogadores. Com o tempo, o VÓRTEX concluiu que *todo jogador é um erro* e prepara o **Grande Reset**, que vai apagar todo mundo.

O Noob vai parar no **Limbo**, o lugar para onde vão os banidos. Lá ele descobre que nunca usou hack. O poder dele vem da **Chave do Fundador**, escondida no primeiro avatar que existiu: o Noob padrão, com quem todo jogador começa. O VÓRTEX precisa dessa chave, mas ela não pode ser roubada. Só pode ser **dada**.

**Tema:** poder não é mandar, é proteger. ("Um admin não é quem manda... é quem protege.")

## 2. Personagens

| Personagem | Papel | Visual (fixo em todos os episódios) |
|---|---|---|
| **Noob** | Protagonista | Cabeça e braços amarelos, tronco azul, pernas verdes, rosto clássico sorridente. Usa a coroa de admin quando a Chave está ativa. |
| **Pro** (xX_ProGamer_Xx, o "Kauã") | Rival, depois traidor, depois redimido | Roupa preta com faixa vermelha e "PRO" no peito, cabelo vermelho espetado, óculos escuros. Vira galinha no EP1 e no EP8. Depois do EP2 fica com **uma pena branca presa no cabelo** (marca de continuidade). |
| **Luna** (Luna_Exe) | Hacker banida, cérebro da equipe | Moletom azul-petróleo, pernas roxo-escuro, cabelo roxo em chanel, fone de gatinho rosa, tablet holográfico. |
| **Pipoca** (Pipoca2017) | Criança banida por engano, coração da equipe | Escala 0,72 (menor). Boné laranja virado para trás, camiseta listrada vermelha e branca, short azul, sardas, olhos grandes. |
| **Vovô Byte** | O Fundador, mentor | Barba branca blocada, capacete de obra amarelo, macacão marrom sobre camisa branca, bengala. No EP7 fica translúcido (desaparecendo). |
| **Zé Tijolo** | Mercador português do Limbo, alívio cômico | Bigodão preto, boina cinza, colete marrom, mochila de mercadorias. |
| **VÓRTEX** | Antagonista | Gigante de capuz escuro, olhos vermelhos, auréola vermelha (o mesmo do piloto). No EP10 vira um pequeno robô cubo de olhos azuis. |
| **SISTEMA** | Voz do servidor | Só voz e interface (avisos e contagem do Reset). |
| **Ban-Bots (drones)** | Capangas do VÓRTEX | Cubos pretos voadores com faixa de olho vermelha, anel giratório e martelo de ban. |

## 3. Bíblia vocal

Toda a dublagem é gerada por síntese de voz neural local. **Cada personagem usa um modelo neural diferente**, e nenhum modelo é compartilhado entre personagens. Além disso, cada um tem a sua própria cadeia de pós-produção (altura, formantes, equalização, compressão, efeitos). As emoções mudam o ritmo, a altura, a intensidade, a variação prosódica e o timbre, sempre a partir da mesma identidade vocal. A implementação fica em `audio/voicelab.py`, nos dicionários `VOICES` e `EMOTIONS`.

**Controle de qualidade automático** (`audio/build_episode.py`):
- Cada fala é gravada em várias **tomadas** (takes).
- Um reconhecedor de fala (Whisper) transcreve cada tomada.
- Fica a tomada com a pronúncia mais fiel ao roteiro. O relatório por fala sai em `build/epXX/qa.json`.
- Reticências viram **pausas reais com respiração**, nunca leitura robótica.
- Falas de medo, choro, surpresa e grito começam com **respiração**.
- As falas nunca se sobrepõem. A trilha abaixa automaticamente (*ducking*) sempre que alguém fala.

### Noob
1. **Personalidade:** tranquilo, irônico, gentil, imperturbável. Por baixo disso, tem um coração enorme.
2. **Voz:** masculina jovem, limpa e redonda, com um sorriso audível. Nunca grita sem motivo.
3. **Timbre e tom:** médio (~140 Hz), brilho leve nos agudos de presença. Modelo Kokoro `pm_alex`, +1 semitom.
4. **Ritmo:** pausado e confiante, solta a piada no final da frase.
5. **Sotaque:** brasileiro neutro, dicção clara.
6. **Emoções:** ironia (padrão), alegria, susto cômico ("Ué?!"). Na tristeza e no medo, a calma racha.
7. **Frase de referência:** *"Relaxa. Eu já caí em lugar pior... tipo o tutorial."*

### Pro (Kauã)
1. **Personalidade:** arrogante, competitivo e inseguro. Quer ser o melhor a qualquer custo e aprende o valor da amizade.
2. **Voz:** masculina adolescente, projetada e enérgica, com ataque forte nas consoantes.
3. **Timbre e tom:** médio-agudo (~170 Hz), áspero e brilhante (reforço em 2,5 kHz), compressão agressiva. Modelo Piper `pt_BR-jeff`.
4. **Ritmo:** rápido, atropela as frases quando está irritado.
5. **Sotaque:** brasileiro urbano, gírias de gamer.
6. **Emoções:** raiva e grito (padrão), deboche, culpa (voz baixa e quebrada no EP6), coragem no EP8.
7. **Frase de referência:** *"Sai da frente, novato! Quem manda nesse servidor sou EU!"*

### Luna
1. **Personalidade:** inteligente, sarcástica e direta. Protetora, mas não admite.
2. **Voz:** feminina jovem adulta, firme e articulada, com uma secura elegante.
3. **Timbre e tom:** médio-agudo (~230 Hz), agudos nítidos (+2,5 dB em 6 kHz). Modelo Piper `pt_BR-dii-high`.
4. **Ritmo:** econômico, frases curtas e precisas, pausa antes do golpe sarcástico.
5. **Sotaque:** brasileiro neutro, pronúncia técnica.
6. **Emoções:** ironia, foco, fúria fria (EP6), alívio emocionado (EP10).
7. **Frase de referência:** *"Três robôs, dois caminhos, um plano. Tenta acompanhar."*

### Pipoca
1. **Personalidade:** criança de uns 8 anos, hiperativa, curiosa e corajosa sem perceber.
2. **Voz:** infantil aguda e saltitante, com risadinhas.
3. **Timbre e tom:** agudo (~250 Hz), formantes deslocados para um trato vocal pequeno. Modelo Kokoro `pf_dora`, +4,5 semitons, formantes "shifted".
4. **Ritmo:** acelerado, emenda as frases, sobe o tom no fim.
5. **Sotaque:** brasileiro, fala de criança.
6. **Emoções:** empolgação (padrão), medo, choro (EP6 e EP10), orgulho.
7. **Frase de referência:** *"Eu só apertei um botãozinho! Era vermelho e brilhava!"*

### Vovô Byte (O Fundador)
1. **Personalidade:** sábio, caloroso, melancólico, culpado por ter criado o VÓRTEX.
2. **Voz:** masculina idosa, grave e aveludada, com tremor leve de idade.
3. **Timbre e tom:** grave (~130 Hz), graves reforçados, agudos suavizados, vibrato sutil de 5 Hz. Modelo Kokoro `pm_santa`, −1 semitom.
4. **Ritmo:** lento, cheio de pausas, como quem conta uma história.
5. **Sotaque:** brasileiro antigo, fala formal ("meu jovem").
6. **Emoções:** calma, ternura, urgência (EP3), despedida (EP7).
7. **Frase de referência:** *"Eu construí o primeiro bloco deste mundo, meu jovem... e vi cada um deles cair."*

### Zé Tijolo
1. **Personalidade:** mercador exagerado, otimista e trambiqueiro de bom coração.
2. **Voz:** masculina madura e calorosa, com **sotaque português de Portugal**.
3. **Timbre e tom:** médio-grave e encorpado, formantes de um homem mais robusto. Modelo Piper `pt_PT-tugao`, −1,5 semitom.
4. **Ritmo:** cantado, típico de vendedor, com expressões como "ó pá" e "pois".
5. **Sotaque:** português europeu, vogais fechadas.
6. **Emoções:** alegria (padrão), pânico cômico, bravura inesperada (EP8).
7. **Frase de referência:** *"Ó pá, aqui no Limbo tudo se vende. Até a esperança, com desconto!"*

### VÓRTEX
1. **Personalidade:** lógica fria, absoluta, sem raiva. Isso é o mais assustador. Redime-se no EP10.
2. **Voz:** grave, colossal e sobre-humana, como se várias vozes falassem juntas.
3. **Timbre e tom:** muito grave (~80 Hz), −3 semitons com formantes de um corpo gigante, coro, eco de catedral, reforço em 90 Hz. Modelo Piper `pt_BR-miro-high`.
4. **Ritmo:** lento e implacável, cada palavra é uma sentença.
5. **Sotaque:** neutro e sintético.
6. **Emoções:** ameaça (padrão), desprezo, fúria contida. No EP10 surge uma voz mais leve, quase humana.
7. **Frase de referência:** *"Todo erro será apagado. Todo jogador é um erro."*

### SISTEMA
1. **Personalidade:** anunciante neutro do servidor.
2. **Voz:** masculina de locução, filtrada como alto-falante digital.
3. **Timbre e tom:** médio, faixa estreita (300 Hz a 5,2 kHz), leve *bitcrush* e eco curto. Modelo Piper `pt_BR-cadu`.
4. **Ritmo:** constante e mecânico.
5. **Sotaque:** neutro.
6. **Emoções:** nenhuma. Esse é o ponto.
7. **Frase de referência:** *"Atenção. O Grande Reset começará em vinte e quatro horas."*

### Ban-Bots (drones)
1. **Personalidade:** capangas sem vontade própria.
2. **Voz:** robótica e metálica, com modulação rápida (tremolo de 38 Hz).
3. **Timbre e tom:** médio-grave, faixa telefônica, *bitcrush* forte. Modelo Piper `pt_BR-faber`.
4. **Ritmo:** cortado.
5. **Sotaque:** neutro.
6. **Emoções:** nenhuma.
7. **Frase de referência:** *"Erro detectado. Iniciando remoção."*

## 4. Arco da história

### Começo (EP1–3)
- **EP1 · Banido.** O Noob cai no Limbo e reencontra o Pro, ainda galinha e furioso. Os poderes do Noob sumiram. Os Ban-Bots atacam e a Luna salva os dois. **Gancho:** a Luna reconhece o Noob: *"Então foi você que começou tudo isso."*
- **EP2 · A Vila dos Banidos.** Os três chegam à vila. O Zé Tijolo vende um "patch anti-galinha", e o Pro volta ao normal, com uma pena no cabelo. A Pipoca aparece, fã do Noob. **Gancho:** o VÓRTEX transmite um ultimato: *"Entreguem o Noob, ou a vila será apagada."*
- **EP3 · O Fundador.** O Noob decide se entregar. O Vovô Byte o impede e revela a Chave do Fundador e o Grande Reset (contagem de 72 h). **Gancho:** os drones atacam e o Vovô é levado no meio de uma frase: *"A chave só funciona quando..."*

### Desenvolvimento (EP4–7)
- **EP4 · Treinamento.** O Noob não consegue ativar a Chave. A Luna treina o Noob, o Pro se irrita e a Pipoca vence o Pro (humor). A Chave acende quando o Noob protege a Pipoca. **Gancho:** à noite, o VÓRTEX oferece ao Pro a conta dele de volta em troca do Noob: *"...Qual é o plano?"*
- **EP5 · A Torre do Obby.** A equipe sobe a torre sobre a lava (contagem de 48 h). O Pro salva a Pipoca de verdade. No topo, uma mensagem vermelha: "AGORA". **Gancho:** *"Desculpa, Noob."* Uma jaula se fecha.
- **EP6 · Traição.** Os drones levam o Noob. A Luna explode com o Pro, e a Pipoca chora. O VÓRTEX "paga" o Pro revelando que ele também será apagado. **Gancho:** o Pro decide consertar o que quebrou, e a Luna avisa: *"Se mentir de novo, eu mesma te apago."*
- **EP7 · Dentro do Código.** Na prisão branca, o Noob encontra o Vovô Byte desaparecendo. O Vovô revela que a Chave só pode ser *dada* e que ele deu regras ao VÓRTEX, mas esqueceu de dar coração. O Vovô se despede. **Gancho:** alarme de invasão. O Pro atravessa a parede: *"Alguém pediu um resgate?"*

### Clímax e conclusão (EP8–10)
- **EP8 · O Resgate.** Fuga da prisão. A Luna hackeia, o Zé distrai os drones e a Pipoca pilota um drone. O Pro enfrenta o VÓRTEX e vira galinha de novo, heroicamente. **Gancho:** o VÓRTEX antecipa o Reset (contagem de 5 min) e o mundo começa a se desfazer.
- **EP9 · O Grande Reset.** O servidor principal se desmancha. A Luna falha no hack, e o botão vermelho da Pipoca abre uma brecha. O Noob entende o segredo e *entrega* a Chave ao VÓRTEX. **Gancho:** "NOOB SAIU DO JOGO."
- **EP10 · O Noob que Não Podia Morrer.** Com a Chave, o VÓRTEX recebe a primeira regra do Fundador: *proteja os jogadores*. O Reset para, o VÓRTEX vira um robozinho, pede desculpas e restaura todos. Quando todos acham que o Noob se foi, um jogador novo nasce no spawn: é o Noob (*"Todo mundo começa como Noob."*). Final: o Pro diz *"Ok... você é o pro aqui."* e o Noob responde *"Quer apostar?"*, retomando o piloto. **FIM.**

## 5. Reviravoltas principais
1. O "hack" do Noob é a Chave do Fundador (EP3).
2. O VÓRTEX quer o Noob vivo porque a Chave só pode ser dada (EP7).
3. O Pro trai a equipe (EP5 e EP6) e depois se redime (EP7 e EP8).
4. O botão vermelho que baniu a Pipoca abre a brecha do VÓRTEX (EP9).
5. Entregar a Chave é o que salva o mundo, porque ela carrega o coração que faltava ao VÓRTEX (EP10).
6. O Noob não pode morrer porque ele é o começo de todo jogador (EP10).

## 6. Desfecho
O mundo é restaurado e o VÓRTEX volta a proteger os jogadores. O Vovô Byte deixa o seu legado. A equipe abre o "Servidor dos Banidos". O Pro e o Noob terminam amigos e rivais com a mesma piada do piloto.
