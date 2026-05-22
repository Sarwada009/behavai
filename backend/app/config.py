from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480
    upload_dir: str = "uploads"
    expo_push_url: str = "https://exp.host/--/api/v2/push/send"

    class Config:
        env_file = ".env"


settings = Settings()
