"""
Lógica ÚNICA de progreso del jugador (lado servidor).

Todos los niveles usan estas funciones para no repetir (ni romper) la lógica
de desbloqueo. Reglas:
  * El nivel 1 siempre está disponible.
  * Un nivel solo se puede completar si ya estaba desbloqueado.
  * Al completar el nivel N se desbloquea el siguiente según config.PROGRESSION.
"""
from flask import session

import config


def dev_mode():
    """True si está activo el modo revisión (global o solo en esta sesión)."""
    return bool(config.DEV_UNLOCK_ALL or session.get("dev_mode"))


def get_unlocked():
    """Lista de niveles desbloqueados (enteros), siempre con el nivel 1."""
    if dev_mode():
        return list(config.PROGRESSION)
    unlocked = [x for x in session.get("unlocked", []) if isinstance(x, int)]
    first = config.PROGRESSION[0]
    if first not in unlocked:
        unlocked.insert(0, first)
    if unlocked != session.get("unlocked"):
        session["unlocked"] = unlocked
        session.modified = True
    return unlocked


def is_unlocked(level_id):
    return level_id in get_unlocked()


def complete_level(level_id):
    """Marca el nivel como completado y desbloquea el siguiente.
    Devuelve False si el nivel todavía estaba bloqueado."""
    unlocked = get_unlocked()
    if level_id not in unlocked:
        return False

    completed = [x for x in session.get("completed", []) if isinstance(x, int)]
    if level_id not in completed:
        completed.append(level_id)
    session["completed"] = completed

    prog = config.PROGRESSION
    if level_id in prog:
        i = prog.index(level_id)
        if i + 1 < len(prog) and prog[i + 1] not in unlocked:
            unlocked.append(prog[i + 1])
    if not dev_mode():
        session["unlocked"] = unlocked
    session.modified = True
    return True


LOCKED_MSG = "Este nivel sigue bloqueado: completa primero los niveles anteriores."
