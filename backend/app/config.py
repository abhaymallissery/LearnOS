"""
Central configuration for the AI Learning OS backend.
All values are free-tier / local-first by default and can be overridden with
environment variables (see .env.example).
"""
from pydantic_settings import BaseSettings
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


class Settings(BaseSettings):
    APP_NAME: str = "AI Learning OS"
    ENV: str = "development"

    # Auth
    SECRET_KEY: str = "change-this-secret-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Storage
    SQLITE_URL: str = f"sqlite:///{BASE_DIR}/storage/app.db"
    UPLOAD_DIR: str = str(BASE_DIR / "storage" / "uploads")
    CHROMA_DIR: str = str(BASE_DIR / "storage" / "chroma_db")

    # LLM APIs (Groq & Gemini)
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.1-8b-instant"
    
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # CORS
    ALLOWED_ORIGINS: list[str] = ["*"]

    # Database
    DATABASE_URL: str | None = None

    # SMTP Settings
    SMTP_SERVER: str | None = None
    SMTP_PORT: int | str = 587
    SMTP_USERNAME: str | None = None
    SMTP_PASSWORD: str | None = None

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
