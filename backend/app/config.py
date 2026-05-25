from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    database_url: Optional[str] = None
    secret_key: str = "default-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480
    upload_dir: str = "uploads"
    expo_push_url: str = "https://exp.host/--/api/v2/push/send"
    environment: str = "development"

    class Config:
        env_file = ".env"


settings = Settings()
