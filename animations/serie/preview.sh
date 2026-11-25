#!/usr/bin/env bash
# Gera uma folha de contato com um quadro por evento do episódio (para revisão de enquadramento).
# Uso: [BUILD=build-v2] ./preview.sh <n> <dir node_modules/three>
set -e
cd "$(dirname "$0")"
N=$(printf "%02d" "$1")
TIMES=$(node -e "const t=require('./${BUILD:-build}/ep$N/timeline.json');console.log(t.events.map(e=>((e.start+e.end)/2).toFixed(1)).join(','))")
D=${BUILD:-build}; V2FLAG=""; [ "$D" = "build-v2" ] && V2FLAG="--v2"
rm -f $D/ep$N/prev_*.png
node render.mjs "$1" --three "$2" --preview "$TIMES" $V2FLAG
ffmpeg -y -loglevel error -pattern_type glob -i "$D/ep$N/prev_*.png" -vf "scale=180:-1,tile=8x4:padding=4" -frames:v 1 "$D/ep$N/sheet.png"
echo "$D/ep$N/sheet.png"
