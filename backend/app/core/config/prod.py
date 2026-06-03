import os

from app.core.config.base import BaseAbstractSettings


class Settings(BaseAbstractSettings):
    SECRET_KEY: str = os.environ["SECRET_KEY"]

    OPENSEARCH_HOST: str = os.environ["OPENSEARCH_HOST"],
    OPENSEARCH_PORT: int = os.environ["OPENSEARCH_PORT"],
    OPENSEARCH_USER: str = os.environ["OPENSEARCH_USER"],
    OPENSEARCH_PASSWORD: str = os.environ["OPENSEARCH_PASSWORD"]

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
