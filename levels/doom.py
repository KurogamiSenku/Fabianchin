"""
Nivel 8 - DOOM: "Las profundidades del sistema"
Vulnerabilidad: SSH + Linux + permisos (escalada de privilegios).

El jugador recorre un laberinto en pseudo-3D (raycaster) hasta una consola.
Allí tiene una SHELL simulada como un usuario sin privilegios ('fabian'). La
flag está en /root/flag.txt (solo root). Hay una MALA CONFIGURACIÓN de sudo:
el usuario puede ejecutar /usr/bin/cat como root sin contraseña. El jugador
debe descubrirlo (sudo -l) y leer la flag con sudo.

SEGURIDAD: NO hay shell real. Se interpreta un set reducido de comandos contra
un sistema de archivos y permisos ficticios, en memoria. Contenido y sin riesgo.
"""
from flask import Blueprint, request, jsonify, session
import config

bp = Blueprint("doom", __name__, url_prefix="/level/doom")
FLAG = config.LEVEL_FLAGS[8]

USER = "fabian"

# Archivos y a quién pertenecen / si son legibles por el usuario normal
FS = {
    "/home/fabian": {"type": "dir", "list": ["notas.txt", ".bashrc"], "readable": True},
    "/home/fabian/notas.txt": {"type": "file", "readable": True,
        "content": "El admin dejo sudo medio configurado. Revisa 'sudo -l'."},
    "/home/fabian/.bashrc": {"type": "file", "readable": True, "content": "# bashrc"},
    "/root": {"type": "dir", "list": ["flag.txt"], "readable": False},      # solo root
    "/root/flag.txt": {"type": "file", "readable": False, "content": FLAG}, # solo root
    "/etc/passwd": {"type": "file", "readable": True,
        "content": "root:x:0:0:root:/root:/bin/bash\nfabian:x:1001:1001::/home/fabian:/bin/bash"},
}
HOME = "/home/fabian"
SUDO_RULE = "(root) NOPASSWD: /usr/bin/cat"   # <- la mala configuración


def _resolve(p):
    if not p:
        return HOME
    if not p.startswith("/"):
        p = HOME + "/" + p
    parts = []
    for seg in p.split("/"):
        if seg in ("", "."):
            continue
        if seg == "..":
            parts and parts.pop()
            continue
        parts.append(seg)
    return "/" + "/".join(parts)


def _cat(path, as_root=False):
    node = FS.get(path)
    if not node:
        return f"cat: {path}: No existe el archivo o el directorio"
    if node["type"] == "dir":
        return f"cat: {path}: Es un directorio"
    if node["readable"] or as_root:
        return node["content"]
    return f"cat: {path}: Permiso denegado"


def run(cmd):
    cmd = cmd.strip()
    if not cmd:
        return ""
    parts = cmd.split()
    name = parts[0]
    args = parts[1:]

    if name == "whoami":
        return USER
    if name == "id":
        return f"uid=1001({USER}) gid=1001({USER}) groups=1001({USER})"
    if name == "pwd":
        return HOME
    if name == "help":
        return "comandos: whoami, id, pwd, ls, cat, sudo, help"
    if name == "ls":
        paths = [a for a in args if not a.startswith("-")]
        target = _resolve(paths[0]) if paths else HOME
        node = FS.get(target)
        if not node:
            return f"ls: no se puede acceder a '{paths[0] if paths else target}': No existe"
        if node["type"] == "file":
            return target.split("/")[-1]
        if not node["readable"]:
            return f"ls: no se puede abrir el directorio '{paths[0] if paths else target}': Permiso denegado"
        return "  ".join(node["list"])
    if name == "cat":
        if not args:
            return "cat: falta operando de archivo"
        return _cat(_resolve(args[0]))
    if name == "sudo":
        if args and args[0] == "-l":
            return (f"El usuario {USER} puede ejecutar los siguientes comandos:\n    {SUDO_RULE}")
        if not args:
            return "uso: sudo <comando>"
        # Solo 'cat' está permitido como root (la mala config)
        if args[0] == "cat" or args[0] == "/usr/bin/cat":
            fileargs = args[1:]
            if not fileargs:
                return "cat: falta operando de archivo"
            out = _cat(_resolve(fileargs[0]), as_root=True)
            if FLAG in out:
                session.setdefault("found", {})
                session["found"]["8"] = True
                session.modified = True
            return out
        return f"Lo siento, el usuario {USER} no puede ejecutar '/usr/bin/{args[0]}' como root."
    return f"{name}: orden no encontrada"


@bp.route("/shell", methods=["POST"])
def shell():
    cmd = request.form.get("cmd", "")
    return jsonify(output=run(cmd))


@bp.route("/submit", methods=["POST"])
def submit():
    sent = (request.form.get("flag") or "").strip()
    if sent == FLAG:
        prog = config.PROGRESSION
        unlocked = session.get("unlocked", [1])
        if 8 in prog:
            i = prog.index(8)
            if i + 1 < len(prog) and prog[i + 1] not in unlocked:
                unlocked.append(prog[i + 1])
        if 8 not in unlocked:
            unlocked.append(8)
        session["unlocked"] = unlocked
        session.modified = True
        return jsonify(ok=True, message="¡Flag correcta! Profundidad conquistada. Siguiente nivel desbloqueado.")
    return jsonify(ok=False, message="Flag incorrecta. Sigue explorando el sistema.")
