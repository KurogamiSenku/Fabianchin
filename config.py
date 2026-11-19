import secrets

# Clave secreta para firmar las cookies de sesión.
# En producción real esto no se genera random cada reinicio,
# pero para tu VM de práctica está bien así (se regenera al reiniciar el proceso,
# lo que de hecho resetea el progreso de todos — útil para pruebas).
SECRET_KEY = secrets.token_hex(32)

# Lista ordenada de niveles. El id define el orden de desbloqueo.
LEVEL_ORDER = [
    "level1",
    "level2",
    # aquí iremos agregando level3, level4... según avancemos
]

FLAGS = {
    "level1": "mario_sqli_tuberia_admin",
    "level2": "enumeracion_web_completada",
}

# --- Progresión del mapa (ids numéricos PROGRESIVOS, 7 niveles) ---
#   1 Mario · 2 Contra · 3 Mega Man · 4 Bomberman · 5 DOOM · 6 Sonic · 7 Pokémon
PROGRESSION = [1, 2, 3, 4, 5, 6, 7]

# MODO DESARROLLO: desbloquea TODOS los niveles para poder probarlos directo.
# Pon esto en False cuando quieras la progresión real (desbloqueo por flags).
DEV_UNLOCK_ALL = True

# Flags por id de nivel del mapa (placeholders; cambiar por las reales en la VM)
# Nivel 4 (Bomberman) = flag en dos mitades: la 1a por SQLi, la 2a por IDOR.
BOMBERMAN_HALF1 = "bomberman_"
BOMBERMAN_HALF2 = "sqli_idor"
LEVEL_FLAGS = {
    1: "mario_sqli_tuberia_admin",
    2: "contra_file_upload_bypass",
    3: "megaman_wily_lab",
    4: BOMBERMAN_HALF1 + BOMBERMAN_HALF2,
    5: "doom_sudo_root",
    6: "sonic_datos_en_metadatos",
    7: "pokemon_liga_backup",
}
