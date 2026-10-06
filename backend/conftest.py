import pytest
from fastapi.testclient import TestClient
from fastapi_clean_archi.core.db.base import Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.session import get_db
from app.modules.collab.application import client as collab_client
from main import app

# 아래 no_collab_server 가 테스트마다 바꿔 끼우기 전의 진짜 함수. collab 에 보내는 요청 자체를 볼 테스트가 쓴다.
REAL_COLLAB_POST = collab_client._post

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


TEST_ADMIN_KEY = "test-admin-key"

SIGNUP_PAYLOAD = {
    "username": "tester",
    "password1": "password123!",
    "password2": "password123!",
    "name": "테스터",
    "admin_key": TEST_ADMIN_KEY,
}


@pytest.fixture(autouse=True)
def admin_key(monkeypatch):
    """관리자 가입은 서버의 ADMIN_KEY 를 알아야 된다. 테스트에서는 알려진 값으로 고정한다."""
    from app.core.config import settings
    monkeypatch.setattr(settings, "ADMIN_KEY", TEST_ADMIN_KEY)


@pytest.fixture(autouse=True)
def no_collab_server(monkeypatch):
    """테스트는 collab 서버에 닿지 않는다(닿으면 개발 DB 를 보는 진짜 collab 이 답한다).
    collab 을 거치는 동작을 볼 테스트는 이 함수를 다시 바꿔 끼운다."""
    def unavailable(*args, **kwargs):
        raise collab_client.CollabUnavailable()

    monkeypatch.setattr(collab_client, "_post", unavailable)


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
    검색은 title/content 부분 일치, user_hash·is_deleted 필터, limit·offset 을 흉내 낸다. 순서는 색인에 넣은 순서다.
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
        conditions = dict(condition.split("=", 1) for condition in params.get("filter", []))
        user_hash = conditions.get("user_hash", "").strip('"') or None
        is_deleted = {"true": True, "false": False}.get(conditions.get("is_deleted"))

        hits = []
        for document in self.documents.values():
            if user_hash and document.get("user_hash") != user_hash:
                continue
            if is_deleted is not None and bool(document.get("is_deleted")) != is_deleted:
                continue
            haystack = f"{document.get('title') or ''} {document.get('content') or ''}"
            if keyword and keyword not in haystack:
                continue
            hits.append(document)
        # 진짜 엔진처럼 한 번에 limit 개만(기본 20), offset 부터.
        offset = params.get("offset", 0)
        return {"hits": hits[offset:offset + params.get("limit", 20)]}


@pytest.fixture(autouse=True)
def search_index(monkeypatch):
    """모든 테스트에서 검색 엔진을 인메모리 대역으로 바꾼다."""
    from app.core import search_engine as search_engine_module

    index = FakeSearchIndex()
    monkeypatch.setattr(search_engine_module.search_engine, "get_index", lambda index_uid=None: index)
    return index


# 관리자가 추가한 일반 계정의 임시 비밀번호. 추가할 때 응답으로 한 번만 받으므로 여기 적어 둔다.
# 테스트마다 새 DB 라 계정 이름이 겹쳐도 마지막에 만든 것이 맞다.
MEMBER_PASSWORDS: dict[str, str] = {}


def create_member(client, username="member", name="멤버"):
    """관리자가 발급하는 일반 계정(is_superuser=False). 관리자(SIGNUP_PAYLOAD)가 먼저 가입해 있어야 한다.
    임시 비밀번호로 시작한다.

    최고 관리자는 소유자가 아닌 노트도 열 수 있으므로(서비스의 is_superuser 분기),
    '남의 노트에 접근할 수 없다' 류의 테스트는 반드시 이 일반 계정으로 해야 한다.
    """
    # 일반 사용자는 관리자만 추가할 수 있다. 먼저 가입해 둔 관리자(SIGNUP_PAYLOAD)로 로그인해 만든다.
    admin = {"Authorization": f"Bearer {login(client).json()['access_token']}"}
    response = client.post("/users", headers=admin, json={"username": username, "name": name})
    assert response.status_code == 201, response.text
    MEMBER_PASSWORDS[username] = response.json()["temporary_password"]
    return response.json()["user_hash"]


def login_member(client, username="member"):
    """이미 발급된 일반 계정으로 로그인해 인증 헤더를 만든다."""
    response = client.post("/auth/obtain-token", json={
        "username": username,
        "password": MEMBER_PASSWORDS[username],
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
