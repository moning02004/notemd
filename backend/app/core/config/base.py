import os

from fastapi_clean_archi.core.config import AbstractSettings


class BaseAbstractSettings(AbstractSettings):
    APP_NAME: str = "NoteMD Backend"

    # JWT settings
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: str = os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "15D")
    REFRESH_TOKEN_EXPIRE_MINUTES: str = os.environ.get("REFRESH_TOKEN_EXPIRE_MINUTES", "14D")

    # Application settings
    DEBUG: bool = os.environ.get("DEBUG", "true").lower() == "true"

    # storage
    STORAGE = {
        "type": "local",
        "name": "uploads",
    }
