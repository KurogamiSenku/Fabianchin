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
    "level1": "FLAG{primera_bandera_oculta_en_el_codigo}",
    "level2": "FLAG{enumeracion_web_completada}",
}

# --- Progresión del mapa (ids numéricos, solo niveles con sprite) ---
PROGRESSION = [1, 2, 3, 5, 8, 9, 14]

# MODO DESARROLLO: desbloquea TODOS los niveles para poder probarlos directo.
# Pon esto en False cuando quieras la progresión real (desbloqueo por flags).
DEV_UNLOCK_ALL = True

# Flags por id de nivel del mapa (placeholders; cambiar por las reales en la VM)
# Nivel 5 = flag en DOS mitades: la 1a por SQLi, la 2a por IDOR (sector oculto, F12)
LEVEL5_HALF1 = "FLAG{bomberman_"
LEVEL5_HALF2 = "sqli_e_idor}"
LEVEL_FLAGS = {
    1: "FLAG{mario_sqli_tuberia_admin}",
    2: "FLAG{contra_file_upload_bypass}",
    5: LEVEL5_HALF1 + LEVEL5_HALF2,   # FLAG{bomberman_sqli_e_idor}
    8: "FLAG{doom_sudo_privesc_root}",
    9: "FLAG{sonic_datos_en_metadatos}",
    14: "FLAG{liga_config_expuesta_pwned}",
}
