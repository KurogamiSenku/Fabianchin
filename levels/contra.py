"""
Nivel 2 - Contra: "La base militar fantasma"
Vulnerabilidad: Carga insegura de archivos (file upload bypass).

El puesto de guardia pide subir una "credencial de acceso". El formulario del
cliente SOLO acepta imágenes (.jpg/.png), pero el servidor NO revalida el tipo.
El jugador debe evadir la validación del cliente (F12 / renombrar / reenviar)
y subir una credencial tipo script (.php, etc.). Al detectar ese bypass, el
servidor entrega la flag.

SEGURIDAD: el archivo subido NO se ejecuta ni se guarda en disco. Solo se
inspeccionan el nombre y los primeros bytes en memoria para detectar el bypass
y responder. Contenido y sin riesgo (no hay RCE ni webshell real).
"""
from flask import Blueprint, request, jsonify, session
import config

bp = Blueprint("contra", __name__, url_prefix="/level/contra")

FLAG = config.LEVEL_FLAGS[2]
DANGER_EXT = {"php", "phtml", "php5", "sh", "jsp", "asp", "aspx", "py", "cgi", "pl"}
IMG_EXT = {"jpg", "jpeg", "png", "gif", "webp", "bmp"}


@bp.route("/upload", methods=["POST"])
def upload():
    f = request.files.get("cred")
    if not f or not f.filename:
        return jsonify(ok=False, message="No se recibió ningún archivo.")
    name = f.filename
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
    head = f.read(4096)  # solo un vistazo en memoria; NO se ejecuta ni se guarda
    has_shell = (b"<?php" in head) or head.startswith(b"#!")

    # El servidor NO revalida el tipo: si logras subir algo que el cliente
    # debía bloquear (una "credencial" ejecutable), has evadido la validación.
    if ext in DANGER_EXT or has_shell:
        session.setdefault("found", {})
        session["found"]["2"] = True
        session.modified = True
        return jsonify(
            ok=True, bypass=True,
            message=("¡Validación evadida! El puesto aceptó una credencial "
                     "ejecutable que el formulario debía bloquear. El servidor "
                     "nunca revalidó el tipo del archivo."),
            flag_hint=FLAG,
        )
    if ext in IMG_EXT:
        return jsonify(
            ok=True, bypass=False,
            message=(f"Imagen '{name}' aceptada… pero el guardia no la reconoce "
                     "como credencial de acceso. Necesita algo que 'ejecute', no una foto."),
        )
    return jsonify(
        ok=True, bypass=False,
        message=(f"Archivo '{name}' recibido, pero no sirve como credencial. "
                 "(El puesto procesa credenciales tipo script.)"),
    )


@bp.route("/submit", methods=["POST"])
def submit():
    sent = (request.form.get("flag") or "").strip()
    if sent == FLAG:
        prog = config.PROGRESSION
        unlocked = session.get("unlocked", [1])
        if 2 in prog:
            i = prog.index(2)
            if i + 1 < len(prog) and prog[i + 1] not in unlocked:
                unlocked.append(prog[i + 1])
        if 2 not in unlocked:
            unlocked.append(2)
        session["unlocked"] = unlocked
        session.modified = True
        return jsonify(ok=True, message="¡Flag correcta! Base militar tomada. Siguiente nivel desbloqueado.")
    return jsonify(ok=False, message="Flag incorrecta. Sigue buscando en el puesto de guardia.")
