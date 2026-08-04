from sqlalchemy import create_engine, Column, Integer, String, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./talking_crow.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class GiftAction(Base):
    __tablename__ = "gift_actions"

    id = Column(Integer, primary_key=True, index=True)
    gift_name = Column(String, unique=True, index=True) # Ej. "Rosa"
    script_path = Column(String) # Ej. "C:\scripts\lights.bat"
    tts_enabled = Column(Boolean, default=True)

class DonationHistory(Base):
    __tablename__ = "donation_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user = Column(String)
    gift_name = Column(String)
    message = Column(String)

# Crea las tablas si no existen
Base.metadata.create_all(bind=engine)
