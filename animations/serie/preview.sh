#!/usr/bin/env bash
# Gera uma folha de contato com um quadro por evento do episódio (para revisão de enquadramento).
# Uso: ./preview.sh <n> <dir node_modules/three>
set -e
cd "$(dirname "$0")"
N=$(printf "%02d" "$1")
TIMES=$(node -e "const t=require('./build/ep$N/timeline.json');console.log(t.events.map(e=>((e.start+e.end)/2).toFixed(1)).join(','))")
rm -f build/ep$N/prev_*.png
node render.mjs "$1" --three "$2" --preview "$TIMES"
ffmpeg -y -loglevel error -pattern_type glob -i "build/ep$N/prev_*.png" -vf "scale=180:-1,tile=8x3:padding=4" -frames:v 1 "build/ep$N/sheet.png"
echo "build/ep$N/sheet.png"
