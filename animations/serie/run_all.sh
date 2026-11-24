#!/usr/bin/env bash
# Produz a série inteira: dublagem/mixagem de cada episódio e, em seguida, o vídeo.
# Uso: ./run_all.sh <dir node_modules/three> [episódios...]   (padrão: 1..10)
set -e
cd "$(dirname "$0")"
THREE="$1"; shift || true
EPS="${@:-1 2 3 4 5 6 7 8 9 10}"
for i in $EPS; do (cd audio && python3 build_episode.py "$i" --takes 5 2>&1 | grep -E "^EP|score=0\.[0-5]|Error|Traceback") ; done
# renderiza em 2 processos paralelos
printf "%s\n" $EPS | xargs -P 2 -I{} sh -c "node render.mjs {} --three '$THREE' 2>&1 | grep -E '^ok|error|Error'"
