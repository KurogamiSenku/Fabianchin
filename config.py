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
