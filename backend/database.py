import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "database.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    c = conn.cursor()
    
    # Tabla Configuración
    c.execute('''
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tiktok_username TEXT DEFAULT '@SoyVridel',
            base_audio_path TEXT DEFAULT ''
        )
    ''')
    
    # Insertar configuración por defecto si no existe
    c.execute('SELECT COUNT(*) FROM settings')
    if c.fetchone()[0] == 0:
        c.execute("INSERT INTO settings (tiktok_username) VALUES ('@SoyVridel')")
        
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
