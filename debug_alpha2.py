from PIL import Image

SRC = "/opt/ctf/web/static/images/skeli_sheet.png"
sheet = Image.open(SRC).convert("RGBA")

# Primer frame de "walk" (fila 1, columna 0): celda (0,256)-(256,512)
tile = sheet.crop((0, 256, 256, 512))
alpha = tile.split()[-1]

print("Bounding box con distintos umbrales de alfa:")
for threshold in [0, 10, 30, 60, 100, 128, 150, 180, 200, 220, 240]:
    mask = alpha.point(lambda a: 255 if a > threshold else 0)
    bbox = mask.getbbox()
    print(f"  umbral={threshold}: bbox={bbox}")

print("\nHistograma completo de valores alfa (solo valores con conteo > 0):")
hist = alpha.histogram()
for i, count in enumerate(hist):
    if count > 0:
        print(f"  alfa={i}: {count} px")
