"""
Nivel 9 - Sonic: "La carrera de los datos perdidos"
Vulnerabilidad: Esteganografía / análisis de metadatos.

Al llegar a la meta, el jugador recupera un "archivo de datos perdido" (una
imagen PNG). La flag está oculta en los METADATOS del PNG (un chunk tEXt),
así que no se ve abriendo la imagen: hay que analizarla con herramientas como
strings, exiftool o binwalk.

SEGURIDAD: solo se genera y sirve una imagen con un comentario de texto. No hay
ejecución ni datos reales. Es un reto de forense/esteganografía introductorio.
"""
import io
from flask import Blueprint, send_file, request, jsonify, session
from PIL import Image, ImageDraw, PngImagePlugin
import config

bp = Blueprint("sonic", __name__, url_prefix="/level/sonic")
FLAG = config.LEVEL_FLAGS[9]


@bp.route("/datos.png")
def datos():
    # Imagen que parece "datos recuperados" (bloques de ruido de colores)
    import random
    random.seed(1337)
    img = Image.new("RGB", (320, 180), (14, 18, 30))
    d = ImageDraw.Draw(img)
    for _ in range(420):
        x = random.randint(0, 319); y = random.randint(0, 179)
        c = (random.randint(20, 90), random.randint(120, 255), random.randint(120, 255))
        d.rectangle([x, y, x + random.randint(2, 8), y + random.randint(2, 8)], fill=c)
    d.text((10, 10), "DATA RECOVERY", fill=(180, 230, 255))

    # La flag va escondida en los metadatos (chunk tEXt), NO en los píxeles visibles
    meta = PngImagePlugin.PngInfo()
    meta.add_text("Software", "ZoneDataRecovery v1.0")
    meta.add_text("Comentario", "fragmento recuperado -> " + FLAG)

    buf = io.BytesIO()
    img.save(buf, "PNG", pnginfo=meta)
    buf.seek(0)
    return send_file(buf, mimetype="image/png", download_name="datos_perdidos.png")


@bp.route("/submit", methods=["POST"])
def submit():
    sent = (request.form.get("flag") or "").strip()
    if sent == FLAG:
        prog = config.PROGRESSION
        unlocked = session.get("unlocked", [1])
        if 9 in prog:
            i = prog.index(9)
            if i + 1 < len(prog) and prog[i + 1] not in unlocked:
                unlocked.append(prog[i + 1])
        if 9 not in unlocked:
            unlocked.append(9)
        session["unlocked"] = unlocked
        session.modified = True
        return jsonify(ok=True, message="¡Flag correcta! Datos recuperados. Siguiente nivel desbloqueado.")
    return jsonify(ok=False, message="Flag incorrecta. Revisa bien los metadatos del archivo.")
