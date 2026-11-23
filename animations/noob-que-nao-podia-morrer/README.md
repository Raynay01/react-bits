# O NOOB QUE NÃO PODIA MORRER

Uma animação 3D de 45 segundos em formato vertical 9:16, feita em Three.js, com personagens blocados no estilo Roblox.

- `o_noob_que_nao_podia_morrer.mp4`: vídeo final (1080×1920, 30 fps, H.264 + AAC).
- `index.html`: a cena completa. Abra a página por um servidor estático (`npx serve .`) e clique em **ASSISTIR** para ver em tempo real, com som.
- `gen_audio.py`: gera as vozes em pt-BR (espeak-ng), a trilha, os efeitos sonoros e o `lipsync.json` (abertura da boca a 30 fps, calculada a partir da própria voz).
- `render.mjs`: renderiza a página quadro a quadro com Playwright e monta o MP4 com ffmpeg.

## Roteiro

| Tempo | Cena |
|---|---|
| 0–5s | **Gancho.** O Pro aponta a espada e diz: "Você não vai sobreviver nem 10 segundos!". A câmera faz um zoom rápido no Noob, que responde: "Quer apostar?". Um cronômetro de 10s aparece na tela. |
| 5–13s | **O desafio.** O Pro empurra o Noob, que cai na lava e provoca uma explosão gigante. O Pro grita "HAHAHA! Eu avisei!". Uma mão amarela sai da lava, o Noob aparece intacto com um hambúrguer e dá um superpulo de volta. |
| 13–23s | **O mistério.** O Pro ataca com espada, foguete, dinamite e bombas, e cada ataque gera uma explosão de cor diferente. O Noob continua comendo e sorrindo. O Pro: "Que tipo de hack é esse?!". O Noob: "Eu não tenho hack... tenho uma coisa melhor." |
| 23–35s | **A revelação.** A câmera se aproxima devagar do Noob. Ele abre o menu e aparece **ADMINISTRADOR DO SERVIDOR**, junto com uma coroa e uma aura dourada. O Pro fica paralisado e diz "Não... pode... ser.". O Noob estala os dedos, há um flash, e o Pro vira uma galinha gigante. O cenário inteiro treme. |
| 35–45s | **A reviravolta.** O Noob gargalha até aparecer o aviso **VOCÊ FOI EXPULSO DO SERVIDOR**. Ele olha assustado para a câmera ("Ué?!"). Uma figura gigante de olhos vermelhos surge atrás dele: "Você também está usando hack, Noob." Corte seco para o preto e entra **PARTE 2?**. |

## Como gerar o vídeo de novo

```bash
sudo apt-get install -y espeak-ng ffmpeg
python3 gen_audio.py build                  # build/audio.wav + build/lipsync.json
npm i three@0.180.0 playwright              # em uma pasta de trabalho
node render.mjs node_modules/three build build/video.mp4
node render.mjs node_modules/three build --preview 4,15.3,29.2   # só alguns quadros em PNG
```
