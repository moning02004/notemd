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

    # 프론트엔드 주소(scheme://host). 내보낸 파일 속 노트 링크를 이 주소로 적는다.
    FRONTEND_URL: str = os.environ.get("FRONTEND_URL", "").rstrip("/")

    # 공동 편집 서버(collab)와 백엔드가 내부 API 로 서로를 확인하는 비밀. 비어 있으면 내부 API 를 막는다.
    COLLAB_SECRET: str = os.environ.get("COLLAB_SECRET", "")
    # 백엔드가 collab 을 부를 주소(에이전트 덧붙이기를 열려 있는 문서에 넣을 때). COLLAB_SECRET 이 있을 때만 쓴다.
    COLLAB_INTERNAL_URL: str = os.environ.get("COLLAB_INTERNAL_URL", "http://collab:1234").rstrip("/")

    # 관리자 가입에 필요한 키. 비어 있으면 관리자 가입을 받지 않는다.
    ADMIN_KEY: str = os.environ.get("ADMIN_KEY", "")

    # Celery / Redis settings
    REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

    # 휴지통에 들어간 노트를 영구 삭제하기까지의 보관 기간(일)
    TRASH_RETENTION_DAYS = int(os.environ.get("TRASH_RETENTION_DAYS", "30"))

    # 자동 백업. BACKUP_DIR 이 비어 있으면 하지 않는다. 사용자마다 '전체 내보내기' zip 을 그 아래에 매일 남긴다.
    # zip 에는 암호화한 노트도 풀려서 들어가므로(설정의 데이터 내보내기와 같다) 이 폴더는 KEK 만큼 지켜야 한다.
    BACKUP_DIR: str = os.environ.get("BACKUP_DIR", "")
    # 사용자마다 남겨 둘 백업 수. 넘치면 오래된 것부터 지운다.
    BACKUP_KEEP: int = int(os.environ.get("BACKUP_KEEP", "7"))

    # storage
    STORAGE = {
        "type": "local",
        "name": "uploads",
    }
