import os

from app.core.config.base import BaseAbstractSettings


class Settings(BaseAbstractSettings):
    SECRET_KEY: str = os.environ["SECRET_KEY"]

    # Database settings
    DATABASE = {
        # 드라이버를 적어 두지 않으면 SQLAlchemy 가 기본값을 고른다. 2.1 부터 기본값이 psycopg2 에서
        # psycopg(3) 로 바뀌어, 새로 빌드하면 설치되지 않은 psycopg 를 찾다가 뜨지 못한다.
        "driver": "postgresql+psycopg2",
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
