import os
import secrets

# Clave secreta para firmar las cookies de sesión.
# En producción real esto no se genera random cada reinicio,
# pero para tu VM de práctica está bien así (se regenera al reiniciar el proceso,
# lo que de hecho resetea el progreso de todos — útil para pruebas).
SECRET_KEY = secrets.token_hex(32)

# --- Progresión del mapa (ids numéricos PROGRESIVOS, 7 niveles) ---
#   1 Mario · 2 Contra · 3 Mega Man · 4 Bomberman · 5 DOOM · 6 Sonic · 7 Pokémon
PROGRESSION = [1, 2, 3, 4, 5, 6, 7]

# MODO DESARROLLO: desbloquea TODOS los niveles para poder probarlos directo.
# Debe quedar en False: los niveles se desbloquean EN ORDEN al enviar la flag
# del nivel anterior. Ponlo en True solo para probar niveles sueltos.
DEV_UNLOCK_ALL = False

# MODO REVISIÓN (para el equipo): desbloquea todo SOLO en tu navegador, sin
# reiniciar el servidor ni tocar este archivo. Abre en el navegador:
#   /dev/revisar?clave=<DEV_KEY>   -> todos los niveles abiertos (solo tú)
#   /dev/normal                    -> vuelve a la progresión real
#   /dev/reiniciar                 -> borra tu progreso (empiezas en el nivel 1)
# Cambia la clave antes de presentar (el repo es público), o defínela con la
# variable de entorno CTF_DEV_KEY.
DEV_KEY = os.environ.get("CTF_DEV_KEY", "besto-revision-2026")

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
