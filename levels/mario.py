"""
Nivel 1 - Super Mario Bros.: "El reino de las tuberías"
Vulnerabilidad: SQL Injection (login bypass -> sesión de administrador).

Fabiancho recorre el Mundo 1-1, baja por la PRIMERA tubería y cae a la sala
subterránea. La tubería de salida (para volver a subir) está bloqueada por el
"Guardián del Reino": solo se abre con una SESIÓN DE ADMINISTRADOR. El panel de
acceso de esa tubería es vulnerable a SQL Injection: la consulta concatena la
entrada del jugador sin sanear. Al entrar como admin, la tubería se desbloquea,
el jugador resurge y completa el nivel.

SEGURIDAD: se usa una base SQLite EN MEMORIA creada por cada intento, con datos
ficticios. La inyección es auténtica (los payloads SQL se ejecutan de verdad),
pero está contenida: no hay datos reales, no toca disco ni SO; lo máximo que se
puede leer es la flag ficticia, que es el objetivo del reto.

Mismo patrón que levels/bomberman.py (login SQLi + submit de flag), adaptado a
la mecánica de tuberías del nivel Mario.
"""
import sqlite3
from flask import Blueprint, request, jsonify, session
import config

bp = Blueprint("mario", __name__, url_prefix="/level/mario")

FLAG = config.LEVEL_FLAGS[1]

# La nota del admin entrega la flag al conseguir la sesión privilegiada.
ADMIN_NOTE = (FLAG + "   ·   Llave maestra del Reino: la tubería de salida "
              "obedece solo a una sesión de administrador.")


def _build_db():
    """Crea una BD en memoria con datos ficticios para el reto."""
    con = sqlite3.connect(":memory:")
    cur = con.cursor()
    cur.execute("CREATE TABLE usuarios (user TEXT, pass TEXT, role TEXT, nota TEXT)")
    cur.executemany(
        "INSERT INTO usuarios VALUES (?,?,?,?)",
        [
            ("admin", "P3ach_Tube!1985", "admin", ADMIN_NOTE),
            ("toad", "hongo123", "user", "Hongo sin privilegios."),
            ("luigi", "mansion", "user", "Cuenta secundaria, nada interesante."),
        ],
    )
    con.commit()
    return con


@bp.route("/login", methods=["POST"])
def login():
    user = request.form.get("user", "")
    pwd = request.form.get("pass", "")

    # CONSULTA VULNERABLE A PROPÓSITO (concatenación directa, sin parámetros).
    query = ("SELECT user, role, nota FROM usuarios "
             "WHERE user = '" + user + "' AND pass = '" + pwd + "'")

    con = _build_db()
    result = {"query": query}
    try:
        rows = con.execute(query).fetchall()
    except sqlite3.Error as e:
        con.close()
        result.update(ok=False, error="SQL error: " + str(e))
        return jsonify(result)
    con.close()

    if not rows:
        result.update(ok=False, message="Acceso denegado: credenciales inválidas.")
        return jsonify(result)

    # ¿Alguna fila con rol admin? -> sesión privilegiada -> tubería desbloqueada
    admin_rows = [r for r in rows if r[1] == "admin"]
    if admin_rows:
        nota = admin_rows[0][2]
        session.setdefault("found", {})
        session["found"]["1"] = True       # el servidor marca que el reto fue resuelto
        session.modified = True
        result.update(
            ok=True, admin=True,
            message="Acceso concedido como ADMIN. ¡La tubería de salida se desbloquea!",
            rows=[{"user": r[0], "role": r[1]} for r in rows],
            flag_hint=nota,                 # la nota del admin contiene la flag
        )
    else:
        result.update(
            ok=True, admin=False,
            message="Acceso concedido, pero sin privilegios de administrador. La tubería sigue cerrada.",
            rows=[{"user": r[0], "role": r[1]} for r in rows],
        )
    return jsonify(result)


@bp.route("/status", methods=["GET"])
def status():
    """El juego consulta esto para saber si la tubería ya está desbloqueada
    (la verdad la tiene el SERVIDOR, no el cliente)."""
    solved = bool(session.get("found", {}).get("1"))
    return jsonify(unlocked=solved)


@bp.route("/submit", methods=["POST"])
def submit():
    sent = (request.form.get("flag") or "").strip()
    if sent == FLAG:
        prog = config.PROGRESSION
        unlocked = session.get("unlocked", [1])
        if 1 in prog:
            i = prog.index(1)
            if i + 1 < len(prog) and prog[i + 1] not in unlocked:
                unlocked.append(prog[i + 1])
        if 1 not in unlocked:
            unlocked.append(1)
        session["unlocked"] = unlocked
        session.modified = True
        return jsonify(ok=True, message="¡Flag correcta! Reino liberado. Siguiente nivel desbloqueado.")
    return jsonify(ok=False, message="Flag incorrecta. Vuelve a mirar la nota del admin.")
