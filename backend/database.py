import os
from pathlib import Path
from dotenv import load_dotenv

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(BACKEND_DIR.parent / ".env")
configured_database_path = os.getenv("DATABASE_PATH", "telugu_rl.db")
DATABASE_PATH = Path(configured_database_path)
if not DATABASE_PATH.is_absolute():
    database_root = BACKEND_DIR if configured_database_path == "telugu_rl.db" else BACKEND_DIR.parent
    DATABASE_PATH = database_root / DATABASE_PATH
DATABASE_URL = f"sqlite:///{DATABASE_PATH.as_posix()}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
