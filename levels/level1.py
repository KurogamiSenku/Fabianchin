from flask import Blueprint, render_template, session

from config import FLAGS

bp = Blueprint("level1", __name__)


@bp.route("/")
def home():
    # Nivel 1 no requiere nada previo: es la puerta de entrada.
    # La flag está oculta en el comentario HTML de este template,
    return render_template("index.html")


def unlock_level1():
    """Se llama cuando el jugador demuestra que encontró la flag del nivel 1."""
    session.setdefault("unlocked", [])
    if "level1" not in session["unlocked"]:
        session["unlocked"].append("level1")
        session.modified = True
