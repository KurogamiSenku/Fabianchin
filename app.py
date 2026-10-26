import os
import threading
from flask import (
    Flask, render_template, request, redirect, url_for,
    flash, session, jsonify,
)
import config
from levels.level1 import bp as level1_bp
from levels.level2 import bp as level2_bp
from levels.bomberman import bp as bomberman_bp
from levels.contra import bp as contra_bp
from levels.sonic import bp as sonic_bp
from levels.doom import bp as doom_bp

app = Flask(__name__)
app.config["SECRET_KEY"] = config.SECRET_KEY

app.register_blueprint(level1_bp)
app.register_blueprint(level2_bp)
app.register_blueprint(bomberman_bp)
app.register_blueprint(contra_bp)
app.register_blueprint(sonic_bp)
app.register_blueprint(doom_bp)

# Mapea id de nivel -> plantilla del reto (solo los que ya están construidos)
LEVEL_TEMPLATES = {
    2: "levels/contra.html",
    5: "levels/bomberman.html",
    8: "levels/doom.html",
    9: "levels/sonic.html",
}


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
    if getattr(config, "DEV_UNLOCK_ALL", False):
        # Modo desarrollo: todos los niveles desbloqueados
        session["unlocked"] = list(config.PROGRESSION)
    elif "unlocked" not in session:
        session["unlocked"] = [1]
    elif 1 not in session["unlocked"]:
        session["unlocked"].insert(0, 1)
        session.modified = True

    return render_template(
        "map.html",
        unlocked_levels=session["unlocked"],
    )


@app.route("/level/<int:level_id>")
def level_view(level_id):
    # En modo desarrollo se salta el candado para poder probar directo
    if not getattr(config, "DEV_UNLOCK_ALL", False):
        unlocked = session.get("unlocked", [1])
        if level_id != 1 and level_id not in unlocked:
            return render_template("levels/locked.html", level_id=level_id), 403
    template = LEVEL_TEMPLATES.get(level_id)
    if not template:
        return render_template("levels/coming_soon.html", level_id=level_id)
    return render_template(template, level_id=level_id)


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
