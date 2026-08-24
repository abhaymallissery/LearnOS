from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings
import os

# Create SQLite directory if it's being used
if not settings.DATABASE_URL:
    os.makedirs(os.path.dirname(settings.SQLITE_URL.replace("sqlite:///", "")), exist_ok=True)

# Use Postgres (Neon) if configured, otherwise fallback to SQLite
if settings.DATABASE_URL:
    # Postgres doesn't need check_same_thread
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300
    )
else:
    engine = create_engine(
        settings.SQLITE_URL, connect_args={"check_same_thread": False}
    )
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
