"""Nivel 3 - Mega Man: recorrido vertical y visor de archivos simulado."""
import posixpath

from flask import Blueprint, jsonify, request, session

import config

bp = Blueprint("megaman", __name__, url_prefix="/level/megaman")

FLAG = config.LEVEL_FLAGS[3]
PUBLIC_ROOT = "/srv/wily/public"

# El reto usa un sistema de archivos virtual: ninguna ruta se lee del servidor.
VIRTUAL_FILES = {
    f"{PUBLIC_ROOT}/README.txt": (
        "Visor publico del laboratorio Wily.\n"
        "Los planos del reactor estan fuera de esta carpeta. "
        "El registro indica que se guardaron en /opt/wily/secure/flag.txt."
    ),
    "/opt/wily/secure/flag.txt": f"FLAG={FLAG}",
}


@bp.route("/read", methods=["POST"])
def read_file():
    requested_path = (request.form.get("path") or "").strip()
    if not requested_path or "\x00" in requested_path:
        return jsonify(ok=False, message="Indica una ruta válida.")

    virtual_path = posixpath.normpath(
        posixpath.join(PUBLIC_ROOT, requested_path.lstrip("/"))
    )
    content = VIRTUAL_FILES.get(virtual_path)
    if content is None:
        return jsonify(
            ok=False,
            path=virtual_path,
            message="El visor no encontró ese archivo.",
        )

    if virtual_path == "/opt/wily/secure/flag.txt":
        session.setdefault("found", {})
        session["found"]["3"] = True
        session.modified = True

    return jsonify(ok=True, path=virtual_path, content=content)


@bp.route("/submit", methods=["POST"])
def submit():
    sent = (request.form.get("flag") or "").strip()
    if sent != FLAG:
        return jsonify(ok=False, message="Flag incorrecta. Revisa los archivos del laboratorio.")

    unlocked = session.get("unlocked", [1])
    if 3 in config.PROGRESSION:
        index = config.PROGRESSION.index(3)
        if index + 1 < len(config.PROGRESSION):
            next_level = config.PROGRESSION[index + 1]
            if next_level not in unlocked:
                unlocked.append(next_level)
    if 3 not in unlocked:
        unlocked.append(3)
    session["unlocked"] = unlocked
    session.modified = True
    return jsonify(ok=True, message="¡Flag correcta! Laboratorio Wily superado. Siguiente nivel desbloqueado.")
