import os
import threading
from flask import (
    Flask, render_template, request, redirect, url_for,
    flash, session, jsonify,
)
import config
from levels.level1 import bp as level1_bp
from levels.level2 import bp as level2_bp

app = Flask(__name__)
app.config["SECRET_KEY"] = config.SECRET_KEY

app.register_blueprint(level1_bp)
app.register_blueprint(level2_bp)


# ---------- Helpers ----------

def next_expected_level():
    """El id del próximo nivel que el jugador debe resolver, según su progreso."""
    unlocked = session.get("unlocked", [])
    for level_id in config.LEVEL_ORDER:
        if level_id not in unlocked:
            return level_id
    return None


# ---------- Home (fachada arcade) ----------

@app.route("/")
def index():
    return render_template("index.html")


# ---------- Submit de flags ----------

@app.route("/submit", methods=["GET"])
def submit_page():
    return render_template("submit.html")


@app.route("/submit-flag", methods=["POST"])
def submit_flag():
    submitted = request.form.get("flag", "").strip()
    expected_id = next_expected_level()

    if expected_id is None:
        flash("Ya completaste todos los niveles disponibles.", "ok")
        return redirect(url_for("submit_page"))

    expected_flag = config.FLAGS.get(expected_id)

    if submitted == expected_flag:
        session.setdefault("unlocked", [])
        session["unlocked"].append(expected_id)
        session.modified = True
        flash(f"¡Correcto! Nivel {expected_id} desbloqueado.", "ok")
    else:
        flash("Flag incorrecta. Sigue buscando.", "error")

    return redirect(url_for("submit_page"))


# ---------- Mapa / Hub ----------

@app.route("/map")
def map_view():
    # Sembramos el nivel 1 si es la primera vez
    if "unlocked" not in session:
        session["unlocked"] = [1]
    else:
        # Aseguramos que el 1 siempre esté presente
        if 1 not in session["unlocked"]:
            session["unlocked"].insert(0, 1)
            session.modified = True

    return render_template(
        "map.html",
        unlocked_levels=session["unlocked"],
    )


@app.route("/api/unlock_level/<int:level_id>", methods=["POST"])
def unlock_level(level_id):
    if "unlocked" not in session:
        session["unlocked"] = [1]

    if level_id not in session["unlocked"]:
        session["unlocked"].append(level_id)
        session.modified = True

    return jsonify(status="success", unlocked=session["unlocked"])


# ---------- Shutdown ----------

@app.route("/shutdown", methods=["POST"])
def shutdown():
    def stop():
        os._exit(0)
    threading.Timer(0.3, stop).start()
    return "Apagando...", 200


# ---------- Calibración de sprites ----------

@app.route("/calibrate/<anim>")
def calibrate(anim):
    counts = {"idle": 4, "walk": 6, "jump": 4, "attack": 4}
    return render_template("calibrate.html", anim=anim, frame_count=counts.get(anim, 4))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
