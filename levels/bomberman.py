"""
Nivel 5 - Bomberman: "El laberinto de los comandos"
Vulnerabilidad: SQL Injection (login bypass).

El jugador recorre un mapa jugable (rejilla estilo Bomberman) con Fabiancho,
llega al "bloque-terminal" (un computador) y abre el panel de acceso. Ese panel
es vulnerable a SQL Injection: la consulta concatena la entrada sin sanear.

SEGURIDAD: se usa una base SQLite EN MEMORIA creada por cada intento, con datos
ficticios. La inyección es auténtica (los payloads SQL se ejecutan de verdad),
pero está contenida: no hay datos reales, no toca disco ni SO; lo máximo que se
puede leer es la flag ficticia, que es el objetivo del reto.
"""
import sqlite3
from flask import Blueprint, request, jsonify, session
import config

bp = Blueprint("bomberman", __name__, url_prefix="/level/bomberman")

FLAG = config.LEVEL_FLAGS[5]


def _build_db():
    """Crea una BD en memoria con datos ficticios para el reto."""
    con = sqlite3.connect(":memory:")
    cur = con.cursor()
    cur.execute("CREATE TABLE usuarios (user TEXT, pass TEXT, role TEXT, nota TEXT)")
    cur.executemany(
        "INSERT INTO usuarios VALUES (?,?,?,?)",
        [
            ("admin", "Zx9!bomba_secreta", "admin", FLAG),   # la flag vive en la nota del admin
            ("operador", "op123", "user", "sin privilegios"),
            ("invitado", "guest", "user", "cuenta de prueba"),
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

    # ¿Alguna fila con rol admin? -> acceso privilegiado -> flag
    admin_rows = [r for r in rows if r[1] == "admin"]
    if admin_rows:
        nota = admin_rows[0][2]
        result.update(
            ok=True, admin=True,
            message="Acceso concedido como ADMIN. Panel privilegiado abierto.",
            rows=[{"user": r[0], "role": r[1]} for r in rows],
            flag_hint=nota,   # la nota del admin contiene la flag
        )
        session.setdefault("found", {})
        session["found"]["5"] = True
        session.modified = True
    else:
        result.update(
            ok=True, admin=False,
            message="Acceso concedido, pero sin privilegios de administrador.",
            rows=[{"user": r[0], "role": r[1]} for r in rows],
        )
    return jsonify(result)


@bp.route("/submit", methods=["POST"])
def submit():
    sent = (request.form.get("flag") or "").strip()
    if sent == FLAG:
        prog = config.PROGRESSION
        unlocked = session.get("unlocked", [1])
        if 5 in prog:
            i = prog.index(5)
            if i + 1 < len(prog):
                nxt = prog[i + 1]
                if nxt not in unlocked:
                    unlocked.append(nxt)
        if 5 not in unlocked:
            unlocked.append(5)
        session["unlocked"] = unlocked
        session.modified = True
        return jsonify(ok=True, message="¡Flag correcta! Bloque destruido. Siguiente nivel desbloqueado.")
    return jsonify(ok=False, message="Flag incorrecta. Vuelve a mirar la nota del admin.")
