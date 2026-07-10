import pytest
from fastapi.testclient import TestClient
from fastapi_clean_archi.core.db.base import Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.session import get_db
from main import app

TEST_DATABASE_URL = "sqlite://"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture()
def db_session():
    """모듈 전체(app/modules/*/infrastructure/models)에서 정의한 테이블을
    테스트마다 새로운 sqlite in-memory DB에 생성/정리한다. 운영 DB(Postgres)에는 접근하지 않는다."""
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture()
def client(db_session):
    def _get_test_db():
        yield db_session

    app.dependency_overrides[get_db] = _get_test_db
    yield TestClient(app)
    app.dependency_overrides.clear()


SIGNUP_PAYLOAD = {
    "username": "tester",
    "password1": "password123!",
    "password2": "password123!",
    "name": "테스터",
}


def signup(client, **overrides):
    payload = {**SIGNUP_PAYLOAD, **overrides}
    return client.post("/users", json=payload)


def login(client, password=None):
    return client.post("/auth/obtain-token", json={
        "username": SIGNUP_PAYLOAD["username"],
        "password": password or SIGNUP_PAYLOAD["password1"],
    })


@pytest.fixture()
def access_token(client):
    """회원가입 + 로그인까지 끝낸 상태가 필요한 테스트용 액세스 토큰."""
    signup(client)
    return login(client).json()["access_token"]


@pytest.fixture()
def auth_headers(access_token):
    return {"Authorization": f"Bearer {access_token}"}
