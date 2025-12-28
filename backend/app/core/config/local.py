from app.core.config.base import BaseAbstractSettings


class Settings(BaseAbstractSettings):
    SECRET_KEY: str = "abcabc"

    # Database settings
    DATABASE = {
        "driver": "sqlite",
        "name": "sqlite.db",
    }

    # CORS settings
    CORS_ORIGINS = [
        "http://localhost:3000",
    ]
