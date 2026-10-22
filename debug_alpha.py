from PIL import Image

SRC = "/opt/ctf/web/static/images/skeli_sheet.png"
sheet = Image.open(SRC).convert("RGBA")

# Tomamos el primer frame de "idle" (fila 0, columna 0): celda (0,0)-(256,256)
tile = sheet.crop((0, 0, 256, 256))

print("Esquina superior-izquierda (0,0):", tile.getpixel((0, 0)))
print("Esquina superior-derecha (255,0):", tile.getpixel((255, 0)))
print("Esquina inferior-izquierda (0,255):", tile.getpixel((0, 255)))
print("Esquina inferior-derecha (255,255):", tile.getpixel((255, 255)))
print("Centro (128,128):", tile.getpixel((128, 128)))

alpha = tile.split()[-1]
hist = alpha.histogram()
print("\nHistograma de valores alfa (0=transparente, 255=opaco):")
print("  alfa=0:", hist[0])
print("  alfa=255:", hist[255])
suma_media = sum(v for v in range(1, 255) for _ in range(hist[v]))
print("  píxeles con alfa entre 1 y 254 (semi-transparentes/ruido):",
      sum(hist[1:255]))
print("  min alfa real:", min(i for i, v in enumerate(hist) if v > 0))
print("  max alfa real:", max(i for i, v in enumerate(hist) if v > 0))
