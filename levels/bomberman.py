"""
Nivel 5 - Bomberman: "El laberinto de los comandos"
Vulnerabilidad: Command Injection (SIMULADA).

Un "terminal de diagnóstico de red" hace ping a un host. El parámetro no se
sanea, así que acepta operadores de encadenamiento (; && | || `` $()).
NO ejecutamos un shell real: interpretamos la inyección contra un sistema de
archivos virtual y un set de comandos simulados. El jugador aprende a:
  - reconocer el punto de inyección,
  - encadenar un comando con ;, && , | ...
  - enumerar con ls y leer la flag con cat.
Todo se valida del lado del servidor.
"""
import re
from flask import Blueprint, request, jsonify, session
import config

bp = Blueprint("bomberman", __name__, url_prefix="/level/bomberman")

FLAG = config.LEVEL_FLAGS[5]

# --- Sistema de archivos virtual (NO es el real) ---
VFS = {
    "/home/bomber": ["notas.txt", ".bomba"],
    "/home/bomber/notas.txt":
        "Recordatorio: el terminal de diagnostico NO filtra lo que escribo.\n"
        "El administrador deja cosas de la operacion en /opt. Revisar alli.\n",
    "/home/bomber/.bomba": "boom. aqui no hay nada util.\n",
    "/opt": ["ctf", "logs"],
    "/opt/logs": ["ping.log"],
    "/opt/logs/ping.log": "127.0.0.1 ok\n10.0.0.5 ok\n(sin novedades)\n",
    "/opt/ctf": ["flag.txt", "README"],
    "/opt/ctf/README": "Si estas leyendo esto por command injection: bien hecho.\n",
    "/opt/ctf/flag.txt": FLAG + "\n",
    "/etc/passwd": "root:x:0:0:root:/root:/bin/bash\nbomber:x:1000:1000::/home/bomber:/bin/sh\n",
}

HOME = "/home/bomber"
# Operadores que delatan intento de inyección
INJECT_RE = re.compile(r"(;|&&|\|\||\||`|\$\()")


def _resolve(path):
    """Normaliza una ruta simple (soporta rutas absolutas y relativas a HOME)."""
    if not path:
        return HOME
    if not path.startswith("/"):
        path = HOME + "/" + path
    # normalizar .. y . de forma segura dentro del VFS virtual
    parts = []
    for seg in path.split("/"):
        if seg in ("", "."):
            continue
        if seg == "..":
            if parts:
                parts.pop()
            continue
        parts.append(seg)
    return "/" + "/".join(parts)


def _run_cmd(cmd):
    """Ejecuta UN comando simulado contra el VFS. Devuelve texto."""
    cmd = cmd.strip()
    if not cmd:
        return ""
    tokens = cmd.split()
    name = tokens[0]
    args = tokens[1:]

    if name == "whoami":
        return "bomber"
    if name == "id":
        return "uid=1000(bomber) gid=1000(bomber) groups=1000(bomber)"
    if name == "pwd":
        return HOME
    if name == "echo":
        return " ".join(args)
    if name == "ls":
        # ignorar flags tipo -l -a
        paths = [a for a in args if not a.startswith("-")]
        target = _resolve(paths[0]) if paths else HOME
        entry = VFS.get(target)
        if isinstance(entry, list):
            return "  ".join(entry)
        if isinstance(entry, str):
            return target.split("/")[-1]  # es un archivo
        return f"ls: no se puede acceder a '{paths[0] if paths else target}': No existe"
    if name == "cat":
        if not args:
            return "cat: falta un archivo"
        target = _resolve(args[0])
        entry = VFS.get(target)
        if isinstance(entry, str):
            return entry.rstrip("\n")
        if isinstance(entry, list):
            return f"cat: {args[0]}: Es un directorio"
        return f"cat: {args[0]}: No existe el archivo"
    return f"sh: {name}: comando no encontrado"


def _ping_output(host):
    host = host.strip()
    if not host:
        return "ping: falta el host"
    # salida simulada de ping
    return (
        f"PING {host} ({host}) 56(84) bytes of data.\n"
        f"64 bytes from {host}: icmp_seq=1 ttl=64 time=0.041 ms\n"
        f"64 bytes from {host}: icmp_seq=2 ttl=64 time=0.038 ms\n"
        f"--- {host} ping statistics ---\n"
        f"2 packets transmitted, 2 received, 0% packet loss"
    )


@bp.route("/ping", methods=["POST"])
def ping():
    raw = (request.form.get("host") or "").strip()
    if not raw:
        return jsonify(output="Uso: introduce una IP o host para diagnosticar.")

    m = INJECT_RE.search(raw)
    if not m:
        # sin inyección: ping normal del host tal cual
        return jsonify(output=_ping_output(raw))

    # hay inyección: el host es lo que va antes del operador
    host = raw[:m.start()].strip() or "127.0.0.1"
    rest = raw[m.start():]
    # separar la cadena inyectada en comandos por los operadores
    injected = re.split(r"\s*(?:;|&&|\|\||\||`|\$\(|\))\s*", rest)
    injected = [c for c in (s.strip() for s in injected) if c]

    out = [_ping_output(host)]
    for c in injected:
        res = _run_cmd(c)
        if res:
            out.append(res)

    # si en la salida aparece la flag, marcamos el nivel como resuelto en sesión
    joined = "\n".join(out)
    if FLAG in joined:
        session.setdefault("found", {})
        session["found"]["5"] = True
        session.modified = True
    return jsonify(output=joined)


@bp.route("/submit", methods=["POST"])
def submit():
    sent = (request.form.get("flag") or "").strip()
    if sent == FLAG:
        # desbloquear el siguiente nivel de la progresión
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
    return jsonify(ok=False, message="Flag incorrecta. Sigue buscando en el sistema.")
