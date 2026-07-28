import os

from fastapi_clean_archi.core.config import AbstractSettings


class BaseAbstractSettings(AbstractSettings):
    APP_NAME: str = "NoteMD Backend"

    # JWT settings
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: str = os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "15M")
    REFRESH_TOKEN_EXPIRE_MINUTES: str = os.environ.get("REFRESH_TOKEN_EXPIRE_MINUTES", "14D")

    # Application settings
    DEBUG: bool = os.environ.get("DEBUG", "true").lower() == "true"

    MEILISEARCH_URL = os.environ.get("MEILISEARCH_URL")
    MEILISEARCH_MASTER_KEY = os.environ.get("MEILISEARCH_MASTER_KEY", "")
    MEILISEARCH_INDEX_UID = os.environ.get("MEILISEARCH_INDEX_UID")

    KEK = os.environ.get("KEK")
    KEK_VERSION = os.environ.get("KEK_VERSION")

    # Celery / Redis settings
    REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

    # 휴지통에 들어간 노트를 영구 삭제하기까지의 보관 기간(일)
    TRASH_RETENTION_DAYS = int(os.environ.get("TRASH_RETENTION_DAYS", "30"))

    # storage
    STORAGE = {
        "type": "local",
        "name": "uploads",
    }
