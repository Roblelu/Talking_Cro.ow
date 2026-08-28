"""
Módulo: database.py

Gestiona la conexión y la estructura de la base de datos local (SQLite).
Decisión Arquitectónica: Se usa SQLite de forma local para garantizar que la aplicación pueda
funcionar sin requerir bases de datos externas (como MySQL o Postgres), manteniendo la
portabilidad (Desktop app) y evitando costos fijos de bases de datos en la nube.
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "database.db")

def get_db_connection():
    """
    Establece y retorna una conexión a la base de datos SQLite local.
    Por qué: Se utiliza row_factory = sqlite3.Row para acceder a los resultados
    como diccionarios, lo que facilita enormemente la serialización a JSON en las rutas de la API.
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """
    Inicializa la estructura de la base de datos de manera idempotent (segura de llamar múltiples veces).
    Crea las tablas necesarias (settings, gifts) si no existen y maneja migraciones de columnas
    (como las de TTS) usando excepciones de SQLite.
    Por qué: Al ser una aplicación local (Desktop app), las migraciones deben ser robustas y auto-ejecutadas
    al iniciar, sin requerir herramientas externas (como Alembic), reduciendo así la complejidad y las dependencias.
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    # Tabla Configuración
    c.execute('''
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tiktok_username TEXT DEFAULT '',
            base_audio_path TEXT DEFAULT ''
        )
    ''')
    
    # Insertar configuración por defecto si no existe
    c.execute('SELECT COUNT(*) FROM settings')
    if c.fetchone()[0] == 0:
        c.execute("INSERT INTO settings (tiktok_username) VALUES ('')")
        
    # Migración: Añadir nuevas columnas TTS si no existen
    try:
        c.execute("ALTER TABLE settings ADD COLUMN tts_voice TEXT DEFAULT 'es-MX-DaliaNeural'")
        c.execute("ALTER TABLE settings ADD COLUMN tts_rate TEXT DEFAULT '+0%'")
        c.execute("ALTER TABLE settings ADD COLUMN tts_volume TEXT DEFAULT '+0%'")
    except sqlite3.OperationalError:
        pass # Las columnas ya existen

    try:
        c.execute("ALTER TABLE settings ADD COLUMN tts_read_username INTEGER DEFAULT 1")
    except sqlite3.OperationalError:
        pass

    try:
        c.execute("ALTER TABLE settings ADD COLUMN tts_delay INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass
        
    # Tabla Regalos
    c.execute('''
        CREATE TABLE IF NOT EXISTS gifts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            trigger_value TEXT NOT NULL,
            script TEXT NOT NULL
        )
    ''')
    
    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
