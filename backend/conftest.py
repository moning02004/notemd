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


class FakeSearchIndex:
    """Meilisearch 인덱스를 흉내 내는 인메모리 대역.

    실제 엔진에 붙으면 (1) 컨테이너 밖에서는 테스트가 아예 돌지 않고
    (2) 테스트 데이터가 개발용 인덱스에 그대로 쌓인다. 두 문제를 함께 막는다.
    검색은 title/content 부분 일치 + user_hash 필터만 흉내 낸다.
    """

    def __init__(self):
        self.documents = {}
        self.settings = None

    def add_documents(self, documents, *_args, **_kwargs):
        if isinstance(documents, dict):
            documents = [documents]
        for document in documents:
            self.documents[document["id"]] = document

    def delete_documents(self, doc_ids, *_args, **_kwargs):
        for doc_id in doc_ids:
            self.documents.pop(doc_id, None)

    def update_settings(self, settings):
        self.settings = settings

    def search(self, keyword, params=None):
        params = params or {}
        user_hashes = [
            condition.split("=", 1)[1].strip('"')
            for condition in params.get("filter", [])
            if condition.startswith("user_hash")
        ]

        hits = []
        for document in self.documents.values():
            if user_hashes and document.get("user_hash") not in user_hashes:
                continue
            haystack = f"{document.get('title') or ''} {document.get('content') or ''}"
            if keyword and keyword not in haystack:
                continue
            hits.append(document)
        return {"hits": hits}


@pytest.fixture(autouse=True)
def search_index(monkeypatch):
    """모든 테스트에서 검색 엔진을 인메모리 대역으로 바꾼다."""
    from app.core import search_engine as search_engine_module

    index = FakeSearchIndex()
    monkeypatch.setattr(search_engine_module.search_engine, "get_index", lambda index_uid=None: index)
    return index


MEMBER_PASSWORD = "0000"


def create_member(client, username="member", name="멤버"):
    """관리자가 발급하는 일반 계정. 비밀번호를 생략하면 초기값 0000 에 is_superuser=False 가 된다.

    최고 관리자는 소유자가 아닌 노트도 열 수 있으므로(서비스의 is_superuser 분기),
    '남의 노트에 접근할 수 없다' 류의 테스트는 반드시 이 일반 계정으로 해야 한다.
    """
    response = client.post("/users", json={"username": username, "name": name})
    assert response.status_code == 201, response.text
    return response.json()["user_hash"]


def login_member(client, username="member"):
    """이미 발급된 일반 계정으로 로그인해 인증 헤더를 만든다."""
    response = client.post("/auth/obtain-token", json={
        "username": username,
        "password": MEMBER_PASSWORD,
    })
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def member_headers(client, username="member", name="멤버"):
    """일반 계정을 새로 발급하고 곧바로 로그인한다."""
    create_member(client, username=username, name=name)
    return login_member(client, username)


def ensure_preference(client, headers):
    """노트 저장은 사용자 설정(스냅샷 정책)을 읽는다.

    설정 행은 GET /preferences 가 처음 만들므로, 실제 클라이언트와 같은 순서로 한 번 호출해 둔다.
    """
    client.get("/preferences", headers=headers)


def create_note(client, headers, **fields):
    """노트를 만들고 곧바로 PATCH 로 내용을 채운 뒤 hash_id 를 돌려준다."""
    ensure_preference(client, headers)

    response = client.post("/notes", headers=headers)
    assert response.status_code == 200, response.text
    note_hash = response.json()["hash_id"]

    if fields:
        payload = {"title": "회의록", "content": "<p>본문 내용</p>", **fields}
        response = client.patch(f"/notes/{note_hash}", headers=headers, json=payload)
        assert response.status_code == 200, response.text
    return note_hash


def note_hashes(response):
    return [note["hash_id"] for note in response.json()]


def create_workspace(client, headers, name="팀"):
    """워크스페이스 생성은 최고 관리자만 가능하다."""
    response = client.post("/workspaces", headers=headers, json={"name": name, "description": ""})
    assert response.status_code == 201, response.text
    return response.json()["hash_id"]


def add_new_member_to_workspace(client, admin_headers, workspace_hash, username="teammate", name="팀원"):
    """일반 계정을 새로 발급해 워크스페이스에 넣고, 그 계정의 인증 헤더를 돌려준다."""
    member_hash = create_member(client, username=username, name=name)
    response = client.post(f"/workspaces/{workspace_hash}/users/{member_hash}", headers=admin_headers)
    assert response.status_code == 201, response.text
    return login_member(client, username)
