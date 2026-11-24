from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BASE_DIR.parent


class Settings(BaseSettings):
    DATABASE_URL: str = f"sqlite:///{(BASE_DIR / 'photobooth.db').as_posix()}"
    DATABASE_URL_UNPOOLED: Optional[str] = None
    STORAGE_DIR: str = str(BASE_DIR / "storage")
    MEMORY_EXPIRATION_DAYS: int = 7
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    model_config = SettingsConfigDict(
        env_file=(
            ROOT_DIR / ".env",
            BASE_DIR / ".env",
            ROOT_DIR / ".env.local",
            BASE_DIR / ".env.local",
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
