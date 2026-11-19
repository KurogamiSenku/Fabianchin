import os
import threading
from flask import Flask, render_template, session, request, redirect, url_for, abort
import config
from levels.level2 import bp as level2_bp
from levels.bomberman import bp as bomberman_bp
from levels.contra import bp as contra_bp
from levels.sonic import bp as sonic_bp
from levels.doom import bp as doom_bp
from levels.pokemon import bp as pokemon_bp
from levels.mario import bp as mario_bp
from levels.megaman import bp as megaman_bp
from levels import progress

app = Flask(__name__)
app.config["SECRET_KEY"] = config.SECRET_KEY

app.register_blueprint(level2_bp)


app.register_blueprint(bomberman_bp)
app.register_blueprint(contra_bp)
app.register_blueprint(sonic_bp)
app.register_blueprint(doom_bp)
app.register_blueprint(pokemon_bp)
app.register_blueprint(mario_bp)
app.register_blueprint(megaman_bp)


# Mapea id de nivel -> plantilla del reto (orden PROGRESIVO 1..7)
LEVEL_TEMPLATES = {
    1: "levels/mario.html",
    2: "levels/contra.html",
    3: "levels/megaman.html",
    4: "levels/bomberman.html",
    5: "levels/doom.html",
    6: "levels/sonic.html",
    7: "levels/pokemon.html",
}

# Título/música por nivel (coincide con static/img/titles/title_<nombre>.png)
LEVEL_MUSIC = {1: "mario", 2: "contra", 3: "megaman", 4: "bomberman",
               5: "doom", 6: "sonic", 7: "pokemon"}


# ---------- Home (fachada arcade) ----------

# Música del inicio y del mapa (misma pista): static/audio/menu.mp3
MENU_MUSIC = "menu"


@app.route("/")
def index():
    return render_template("index.html", bg_music=MENU_MUSIC)


# ---------- Mapa / Hub ----------

@app.route("/map")
def map_view():
    unlocked = progress.get_unlocked()
    return render_template(
        "map.html",
        unlocked_levels=unlocked,
        completed_levels=session.get("completed", []),
        total_levels=len(config.PROGRESSION),
        dev_mode=progress.dev_mode(),
        bg_music=MENU_MUSIC,
    )


@app.route("/level/<int:level_id>")
def level_view(level_id):
    template = LEVEL_TEMPLATES.get(level_id)
    if not template:
        return render_template("levels/coming_soon.html", level_id=level_id)
    # El servidor decide: escribir /level/5 en la barra NO salta niveles.
    if not progress.is_unlocked(level_id):
        return render_template("levels/locked.html", level_id=level_id), 403
    return render_template(template, level_id=level_id,
                           music=LEVEL_MUSIC.get(level_id))


# ---------- Modo revisión (equipo) ----------

@app.route("/dev/revisar")
def dev_on():
    if request.args.get("clave") != config.DEV_KEY:
        abort(404)
    session["dev_mode"] = True
    return redirect(url_for("map_view"))


@app.route("/dev/normal")
def dev_off():
    session.pop("dev_mode", None)
    return redirect(url_for("map_view"))


@app.route("/dev/reiniciar")
def dev_reset():
    for k in ("dev_mode", "unlocked", "completed", "found"):
        session.pop(k, None)
    return redirect(url_for("map_view"))


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
