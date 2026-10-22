from flask import Blueprint, session

bp = Blueprint("level2", __name__)


def is_unlocked(level_id):
    return level_id in session.get("unlocked", [])


@bp.route("/documentation")
def documentation():
    # Nivel 2: la flag real está escondida aquí, en un comentario,
    # solo visible para quien decide mirar el código fuente de esta ruta
    # (que a su vez solo se descubre si ya enumeró /robots.txt).
    return (
        "<h2>Documentación interna</h2>"
        "<p>Sección en construcción.</p>"
        "<!-- FLAG{enumeracion_web_completada} -->"
    ), 200


@bp.route("/robots.txt")
def robots():
    return (
        "User-agent: *\n"
        "Disallow: /admin\n"
        "Disallow: /uploads\n"
        "Disallow: /documentation\n"
    ), 200, {"Content-Type": "text/plain"}
