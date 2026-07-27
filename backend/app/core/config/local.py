import os

from app.core.config.base import BaseAbstractSettings

os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")
class Settings(BaseAbstractSettings):
    SECRET_KEY: str = "abcabc"

    # Database settings
    DATABASE = {
        "driver": "postgresql",
        "name": os.environ["DB_NAME"],
        "user": os.environ["DB_USER"],
        "password": os.environ["DB_PASSWORD"],
        "host": "postgres",
        "port": "5432",
    }

    # CORS settings
    CORS_ORIGINS = [
        os.environ["FRONTEND_URL"],
        "http://192.168.0.4:3001",
        "http://localhost:3001",
        "http://192.168.0.4:3000",
    ]
