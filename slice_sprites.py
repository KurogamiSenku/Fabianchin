from PIL import Image
import os

SRC = "/opt/ctf/web/static/images/skeli_sheet.png"
OUT_DIR = "/opt/ctf/web/static/images/frames"
FRAME_SIZE = 256
ALPHA_THRESHOLD = 170
MARGIN = 10

ANIMATIONS = {
    "idle":   {"row": 0, "frames": 4},
    "walk":   {"row": 1, "frames": 6},
    "jump":   {"row": 2, "frames": 4},
    "attack": {"row": 3, "frames": 4},
}

os.makedirs(OUT_DIR, exist_ok=True)

sheet = Image.open(SRC).convert("RGBA")
print(f"Hoja cargada: {sheet.size}")


def masked_bbox(tile):
    alpha = tile.split()[-1]
    mask = alpha.point(lambda a: 255 if a > ALPHA_THRESHOLD else 0)
    return mask.getbbox()


for anim_name, info in ANIMATIONS.items():
    row = info["row"]
    count = info["frames"]

    tiles = []
    min_x, min_y = FRAME_SIZE, FRAME_SIZE
    max_x, max_y = 0, 0

    for i in range(count):
        x = i * FRAME_SIZE
        y = row * FRAME_SIZE
        tile = sheet.crop((x, y, x + FRAME_SIZE, y + FRAME_SIZE))
        tiles.append(tile)

        bbox = masked_bbox(tile)
        if bbox is None:
            continue
        tx0, ty0, tx1, ty1 = bbox
        min_x = min(min_x, tx0)
        min_y = min(min_y, ty0)
        max_x = max(max_x, tx1)
        max_y = max(max_y, ty1)

    # UN SOLO recuadro para TODA la animación: así el ancla (torso/cadera)
    # queda en la misma coordenada de píxel en todos los frames,
    # porque es literalmente el mismo recorte, solo que el contenido
    # dentro de él cambia (eso sí es la animación real).
    crop_x0 = max(0, min_x - MARGIN)
    crop_y0 = max(0, min_y - MARGIN)
    crop_x1 = min(FRAME_SIZE, max_x + MARGIN)
    crop_y1 = min(FRAME_SIZE, max_y + MARGIN)

    print(f"Animación '{anim_name}': recuadro único "
          f"{crop_x1 - crop_x0}x{crop_y1 - crop_y0} desde ({crop_x0},{crop_y0})")

    for i, tile in enumerate(tiles):
        cropped = tile.crop((crop_x0, crop_y0, crop_x1, crop_y1))
        out_path = os.path.join(OUT_DIR, f"{anim_name}_{i}.png")
        cropped.save(out_path)
        print(f"  Generado: {anim_name}_{i}.png ({cropped.size[0]}x{cropped.size[1]})")

print("Listo.")
