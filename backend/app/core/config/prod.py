import os

from app.core.config.base import BaseAbstractSettings


class Settings(BaseAbstractSettings):
    SECRET_KEY: str = os.environ["SECRET_KEY"]

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
    ]
