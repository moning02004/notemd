import os

from app.core.config.base import BaseAbstractSettings

os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")
class Settings(BaseAbstractSettings):
    SECRET_KEY: str = "abcabc"

    # Database settings
    DATABASE = {
        "driver": "sqlite",
        "name": "sqlite.db",
    }

    # CORS settings
    CORS_ORIGINS = [
        os.environ["FRONTEND_URL"],
    ]
