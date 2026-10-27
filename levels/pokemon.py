"""
Nivel 14 - Pokémon: "La Liga de los administradores" (reto final)
Vulnerabilidad: configuración insegura / exposición de archivos de respaldo.

Fabiancho recorre el pueblo (vista isométrica) hasta el Centro de la Liga. Allí
hay un panel de administración. Los administradores dejaron un RESPALDO de
configuración accesible públicamente, que filtra el usuario y la contraseña del
admin. El jugador correlaciona ese hallazgo y entra al panel para obtener la
flag final.

SEGURIDAD: solo se sirve un texto de configuración ficticio y se validan unas
credenciales en memoria. Sin datos reales ni ejecución.
"""
from flask import Blueprint, request, jsonify, session, Response
import config

bp = Blueprint("pokemon", __name__, url_prefix="/level/pokemon")
FLAG = config.LEVEL_FLAGS[14]

ADMIN_USER = "liga_admin"
ADMIN_PASS = "ServidorLiga#2024!"   # se filtra por el respaldo expuesto


@bp.route("/config.bak")
def config_bak():
    # Respaldo de configuración expuesto por error (configuración insegura)
    texto = (
        "# ====== RESPALDO DE CONFIGURACION - NO SUBIR A PRODUCCION ======\n"
        "[servidor]\n"
        "host = liga.interna\n"
        "debug = true\n"
        "\n"
        "[admin]\n"
        f"usuario = {ADMIN_USER}\n"
        f"password = {ADMIN_PASS}\n"
        "\n"
        "# recordatorio: rotar credenciales antes del torneo\n"
    )
    return Response(texto, mimetype="text/plain")


@bp.route("/login", methods=["POST"])
def login():
    u = request.form.get("user", "")
    p = request.form.get("pass", "")
    if u == ADMIN_USER and p == ADMIN_PASS:
        session.setdefault("found", {})
        session["found"]["14"] = True
        session.modified = True
        return jsonify(ok=True, message="Acceso de ADMIN concedido. Panel de la Liga abierto.", flag_hint=FLAG)
    return jsonify(ok=False, message="Credenciales inválidas. Solo el administrador de la Liga puede entrar.")


@bp.route("/submit", methods=["POST"])
def submit():
    sent = (request.form.get("flag") or "").strip()
    if sent == FLAG:
        session.setdefault("completed", [])
        if 14 not in session["completed"]:
            session["completed"].append(14)
        # desbloquear (aunque es el último) y marcar como resuelto
        unlocked = session.get("unlocked", [1])
        if 14 not in unlocked:
            unlocked.append(14)
        session["unlocked"] = unlocked
        session.modified = True
        return jsonify(ok=True, final=True,
                       message="¡FLAG FINAL CORRECTA! Has conquistado la Liga de los administradores. ¡Fin del CTF!")
    return jsonify(ok=False, message="Flag incorrecta. La respuesta está en el panel de admin.")
