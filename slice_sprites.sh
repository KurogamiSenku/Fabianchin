#!/bin/bash
set -e

SRC=/opt/ctf/web/static/images/skeli_sheet.png
OUT=/opt/ctf/web/static/images/frames
TMP=/opt/ctf/web/static/images/tmp_tiles
SIZE=256
PAD=6

mkdir -p "$OUT" "$TMP"
rm -f "$TMP"/*.png "$OUT"/*.png

declare -A ROWS=( [idle]=0 [walk]=1 [jump]=2 [attack]=3 )
declare -A FRAMES=( [idle]=4 [walk]=6 [jump]=4 [attack]=4 )

for anim in "${!ROWS[@]}"; do
    row=${ROWS[$anim]}
    count=${FRAMES[$anim]}

    minx=999999; miny=999999; maxx=-999999; maxy=-999999

    # Paso 1: recorta cada celda cruda (256x256) y mide su bounding box real
    for ((i=0; i<count; i++)); do
        x=$((i * SIZE))
        y=$((row * SIZE))
        tile="$TMP/${anim}_${i}_raw.png"
        convert "$SRC" -crop "${SIZE}x${SIZE}+${x}+${y}" +repage "$tile"

        # formato de salida: WxH+OFFX+OFFY (bounding box del contenido no transparente)
        bbox=$(convert "$tile" -trim -format "%wx%h%O" info:)
        w=$(echo "$bbox" | sed -E 's/x.*//')
        h=$(echo "$bbox" | sed -E 's/^[0-9]+x([0-9]+).*/\1/')
        offx=$(echo "$bbox" | sed -E 's/^[0-9]+x[0-9]+\+([0-9]+)\+.*/\1/')
        offy=$(echo "$bbox" | sed -E 's/^[0-9]+x[0-9]+\+[0-9]+\+(-?[0-9]+)/\1/')

        endx=$((offx + w))
        endy=$((offy + h))

        if (( offx < minx )); then minx=$offx; fi
        if (( offy < miny )); then miny=$offy; fi
        if (( endx > maxx )); then maxx=$endx; fi
        if (( endy > maxy )); then maxy=$endy; fi
    done

    # recuadro único para toda la animación, con margen
    cropx=$(( minx - PAD > 0 ? minx - PAD : 0 ))
    cropy=$(( miny - PAD > 0 ? miny - PAD : 0 ))
    cropw=$(( maxx - minx + PAD * 2 ))
    croph=$(( maxy - miny + PAD * 2 ))

    echo "Animación '$anim': recuadro común ${cropw}x${croph}+${cropx}+${cropy}"

    # Paso 2: aplica el MISMO recuadro a cada frame crudo
    for ((i=0; i<count; i++)); do
        convert "$TMP/${anim}_${i}_raw.png" -crop "${cropw}x${croph}+${cropx}+${cropy}" +repage \
            "$OUT/${anim}_${i}.png"
        echo "Generado: ${anim}_${i}.png"
    done
done

rm -rf "$TMP"
