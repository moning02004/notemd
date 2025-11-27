from pydantic.v1 import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "FastAPI clean architecture"

    DEBUG: bool = True
    SECRET_KEY: str = "dLRfqVOKp6FEEGZNlOoCwVJNPdWGo5zAFUsFshfO4aQ"

    DATABASE_URL: str = "sqlite:///./sqlite3.db"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: str = "1D"
    REFRESH_TOKEN_EXPIRE_MINUTES: str = "30D"

    CORS_ORIGINS = [
        "http://localhost:3000",
    ]

    class Config:
        env_file = ".env"  # It must be located at the project root.


settings = Settings()
