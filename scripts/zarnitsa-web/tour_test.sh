#!/bin/bash
# Автопрогон 3D до EndScreen с корректной остановкой
set -u
cd /home/z/my-project

agent-browser open "http://localhost:3000/?tour=1" >/dev/null 2>&1
sleep 3
START=$(agent-browser snapshot -i 2>/dev/null | grep -oE 'button "⚔ Выйти в ночь" \[ref=e[0-9]+' | grep -oE 'e[0-9]+' | head -1)
agent-browser click @$START >/dev/null 2>&1
sleep 2

for i in $(seq 1 80); do
  SNAP=$(agent-browser snapshot -i 2>/dev/null)
  if echo "$SNAP" | grep -q "Три ночи прошли"; then
    echo "STEP $i: END SCREEN «Три ночи прошли» достигнут"
    agent-browser screenshot scripts/zarnitsa-web/shot3d_end.png >/dev/null 2>&1
    echo "$SNAP" | grep -E 'heading|Летопись похода' | head -4
    exit 0
  fi
  REF=$(echo "$SNAP" | awk '/heading/{f=1; next} f && /button "/{match($0, /ref=e[0-9]+/); print substr($0, RSTART+4, RLENGTH-4); exit}')
  if [ -n "$REF" ]; then
    LABEL=$(echo "$SNAP" | grep -oE "button \"[^\"]+\" \[$REF\]" | head -1 | cut -c1-60)
    echo "STEP $i: click $REF $LABEL"
    # не жмём рестарт финала
    if echo "$LABEL" | grep -q "Пройти поход снова"; then
      echo "END SCREEN (по кнопке рестарта)"
      agent-browser screenshot scripts/zarnitsa-web/shot3d_end.png >/dev/null 2>&1
      exit 0
    fi
    agent-browser click @$REF >/dev/null 2>&1
    sleep 1.1
  else
    agent-browser press e >/dev/null 2>&1
    sleep 3.2
  fi
done
echo "не дошёл за 80 шагов"
