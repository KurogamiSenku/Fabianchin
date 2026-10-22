from PIL import Image
import os

SRC = "/opt/ctf/web/static/images/skeli_sheet.png"
OUT_DIR = "/opt/ctf/web/static/images/raw_frames"
FRAME_SIZE = 256

ANIMATIONS = {
    "idle":   {"row": 0, "frames": 4},
    "walk":   {"row": 1, "frames": 6},
    "jump":   {"row": 2, "frames": 4},
    "attack": {"row": 3, "frames": 4},
}

os.makedirs(OUT_DIR, exist_ok=True)
sheet = Image.open(SRC).convert("RGBA")

for anim_name, info in ANIMATIONS.items():
    row = info["row"]
    for i in range(info["frames"]):
        x = i * FRAME_SIZE
        y = row * FRAME_SIZE
        tile = sheet.crop((x, y, x + FRAME_SIZE, y + FRAME_SIZE))
        tile.save(os.path.join(OUT_DIR, f"{anim_name}_{i}.png"))

print("Frames crudos exportados.")
