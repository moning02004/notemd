"""공동 편집 서버(collab)가 부르는 내부 API: 연결 권한, 문서 불러오기·저장."""
import base64

import pytest

from conftest import (add_new_member_to_workspace, create_note, create_workspace, login, member_headers)
from app.modules.note.infrastructure.models import Note

SECRET = "test-collab-secret"


@pytest.fixture(autouse=True)
def collab_secret(monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "COLLAB_SECRET", SECRET)


def internal(client, method, path, **kwargs):
    return client.request(method, f"/internal/collab{path}", headers={"X-Collab-Secret": SECRET}, **kwargs)


def jwt_of(headers):
    return headers["Authorization"].removeprefix("Bearer ")


def authorize(client, note, headers=None, password=None):
    return internal(client, "POST", "/authorize",
                    json={"note": note, "token": jwt_of(headers) if headers else None, "password": password})


# ---------------------------------------------------------------- 비밀

def test_internal_api_needs_the_shared_secret(client, auth_headers):
    owner = member_headers(client)
    note = create_note(client, owner, title="x")

    assert client.post("/internal/collab/authorize", json={"note": note}).status_code == 403
    assert client.post("/internal/collab/authorize", json={"note": note},
                       headers={"X-Collab-Secret": "wrong"}).status_code == 403


def test_internal_api_is_closed_when_no_secret_is_set(client, auth_headers, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "COLLAB_SECRET", "")
    owner = member_headers(client)
    note = create_note(client, owner, title="x")

    response = client.post("/internal/collab/authorize", json={"note": note}, headers={"X-Collab-Secret": ""})
    assert response.status_code == 403


# ---------------------------------------------------------------- 연결 권한

def test_owner_can_edit(client, auth_headers):
    owner = member_headers(client)
    note = create_note(client, owner, title="x")

    body = authorize(client, note, owner).json()

    assert body["access"] == "edit"
    assert body["user_name"] == "멤버"


def test_workspace_member_can_edit_a_shared_note(client, auth_headers):
    workspace = create_workspace(client, auth_headers)
    teammate = add_new_member_to_workspace(client, auth_headers, workspace)
    note = create_note(client, auth_headers, title="팀 노트", workspaces=[workspace])

    assert authorize(client, note, teammate).json()["access"] == "edit"


def test_anonymous_viewers_are_not_connected(client, auth_headers):
    """공개 링크로 보는 비회원은 실시간으로 붙이지 않는다(저장본을 본다). 누구나 열 수 있어 연결이 한없이 는다."""
    owner = member_headers(client)
    public = create_note(client, owner, title="공개", is_public=True)

    assert authorize(client, public).status_code == 403


def test_members_read_public_notes_live(client, auth_headers):
    owner = member_headers(client)
    public = create_note(client, owner, title="공개", is_public=True)
    reader = member_headers(client, username="reader", name="읽는이")

    assert authorize(client, public, reader).json()["access"] == "read"


def test_stranger_cannot_open_a_private_note(client, auth_headers):
    owner = member_headers(client)
    note = create_note(client, owner, title="비공개")
    stranger = member_headers(client, username="stranger", name="남")

    assert authorize(client, note, stranger).status_code == 404


def test_password_note_opens_with_the_password(client, auth_headers):
    """비밀번호가 걸린 남의 노트도 맞혀서 들어올 수 있으면 공동 편집에 붙는다(편집 권한은 조회와 같다)."""
    workspace = create_workspace(client, auth_headers)
    teammate = add_new_member_to_workspace(client, auth_headers, workspace)
    note = create_note(client, auth_headers, title="잠긴 팀 노트", workspaces=[workspace], password="pw")

    assert authorize(client, note, teammate).status_code == 403
    assert authorize(client, note, teammate, password="wrong").status_code == 403
    assert authorize(client, note, teammate, password="pw").json()["access"] == "edit"


def test_protected_and_trashed_notes_are_read_only(client, auth_headers):
    owner = member_headers(client)
    protected = create_note(client, owner, title="보호", is_protected=True)
    trashed = create_note(client, owner, title="휴지통")
    client.delete(f"/notes/{trashed}", headers=owner)

    assert authorize(client, protected, owner).json()["access"] == "read"
    assert authorize(client, trashed, owner).json()["access"] == "read"


def test_invalid_login_token_is_treated_as_anonymous(client, auth_headers):
    owner = member_headers(client)
    public = create_note(client, owner, title="공개", is_public=True)

    response = internal(client, "POST", "/authorize", json={"note": public, "token": "not-a-jwt"})

    assert response.status_code == 403


# ---------------------------------------------------------------- 불러오기·저장

def test_first_load_has_no_ydoc_and_gives_html(client, auth_headers):
    owner = member_headers(client)
    note = create_note(client, owner, title="처음", content="<p>본문</p>")

    state = internal(client, "GET", f"/notes/{note}/state").json()

    assert state == {"ydoc": None, "html": "<p>본문</p>", "title": "처음"}


def test_store_saves_ydoc_and_html_copy(client, auth_headers, db_session, search_index):
    owner = member_headers(client)
    target = create_note(client, owner, title="대상")
    note = create_note(client, owner, title="처음", content="<p>본문</p>")
    link = f'<a data-note="{target}" href="/s/{target}" class="note-link">옛 제목</a>'
    ydoc = b"\x01\x02yjs-state"

    response = internal(client, "PUT", f"/notes/{note}/state", json={
        "ydoc": base64.b64encode(ydoc).decode(), "html": f"<p>같이 고친 본문 {link}</p>", "title": "새 제목"})

    assert response.status_code == 204
    state = internal(client, "GET", f"/notes/{note}/state").json()
    assert base64.b64decode(state["ydoc"]) == ydoc
    assert state["title"] == "새 제목"
    # 앱의 저장과 같은 길: 노트 링크 제목을 채우고, 백링크 표와 검색 색인을 갱신한다.
    assert ">대상</a>" in state["html"]
    assert [item["hash_id"] for item in client.get(f"/notes/{target}/backlinks", headers=owner).json()] == [note]
    assert "같이 고친 본문" in search_index.documents[note]["content"]


def test_encrypted_note_keeps_ydoc_and_html_encrypted(client, auth_headers, db_session):
    owner = member_headers(client)
    note = create_note(client, owner, title="비밀", content="<p>처음</p>", is_encrypted=True)
    ydoc = b"secret-yjs-state"

    internal(client, "PUT", f"/notes/{note}/state", json={
        "ydoc": base64.b64encode(ydoc).decode(), "html": "<p>같이 고친 비밀</p>", "title": "비밀"})

    stored = db_session.query(Note).filter(Note.hash_id == note).one()
    db_session.refresh(stored)
    assert ydoc not in bytes(stored.ydoc)
    assert "같이 고친 비밀" not in stored.content
    state = internal(client, "GET", f"/notes/{note}/state").json()
    assert base64.b64decode(state["ydoc"]) == ydoc
    assert state["html"] == "<p>같이 고친 비밀</p>"


def test_trashed_note_is_not_stored(client, auth_headers):
    owner = member_headers(client)
    note = create_note(client, owner, title="x")
    client.delete(f"/notes/{note}", headers=owner)

    response = internal(client, "PUT", f"/notes/{note}/state",
                        json={"ydoc": base64.b64encode(b"x").decode(), "html": "<p>x</p>"})

    assert response.status_code == 409


def test_unknown_note_is_404(client, auth_headers):
    assert internal(client, "GET", "/notes/nope/state").status_code == 404


def store(client, note, ydoc=b"yjs", html="<p>x</p>", title="t"):
    return internal(client, "PUT", f"/notes/{note}/state",
                    json={"ydoc": base64.b64encode(ydoc).decode(), "html": html, "title": title})


def test_writing_content_outside_collab_clears_the_stale_ydoc(client, auth_headers):
    """API·에이전트가 본문을 바꾸면 저장된 Y 문서는 낡는다. 비워서 다음에 열 때 새 HTML 로 만들게 한다."""
    owner = member_headers(client)
    note = create_note(client, owner, title="x", content="<p>처음</p>")
    store(client, note, html="<p>같이 고친 것</p>")

    client.patch(f"/notes/{note}", headers=owner, json={"content": "<p>API 가 쓴 것</p>"})

    state = internal(client, "GET", f"/notes/{note}/state").json()
    assert state["ydoc"] is None
    assert state["html"] == "<p>API 가 쓴 것</p>"


def test_settings_change_keeps_the_ydoc(client, auth_headers):
    owner = member_headers(client)
    note = create_note(client, owner, title="x")
    store(client, note, ydoc=b"keep-me")

    client.patch(f"/notes/{note}", headers=owner, json={"is_public": True})

    assert base64.b64decode(internal(client, "GET", f"/notes/{note}/state").json()["ydoc"]) == b"keep-me"


def test_toggling_encryption_re_encrypts_the_ydoc(client, auth_headers, db_session):
    owner = member_headers(client)
    note = create_note(client, owner, title="x", content="<p>본문</p>")
    store(client, note, ydoc=b"plain-yjs", html="<p>본문</p>")

    client.patch(f"/notes/{note}", headers=owner, json={"is_encrypted": True})
    stored = db_session.query(Note).filter(Note.hash_id == note).one()
    db_session.refresh(stored)
    assert b"plain-yjs" not in bytes(stored.ydoc)
    assert base64.b64decode(internal(client, "GET", f"/notes/{note}/state").json()["ydoc"]) == b"plain-yjs"

    client.patch(f"/notes/{note}", headers=owner, json={"is_encrypted": False})
    db_session.refresh(stored)
    assert bytes(stored.ydoc) == b"plain-yjs"


# ---------------------------------------------------------------- 에이전트 덧붙이기는 collab 을 거친다

def agent_token(client, headers):
    return client.post("/api-tokens", headers=headers, json={"name": "Claude", "scope": "write"}).json()["token"]


@pytest.fixture()
def fake_collab(client, monkeypatch):
    """collab 서버 대신. flush 는 '열려 있던 문서' 를 저장하고, append 는 덧붙여 저장한다(진짜 collab 처럼 내부 API 로)."""
    from app.modules.collab.application import client as collab_client
    calls = []
    open_docs = {}  # 누가 열어 두고 아직 저장되지 않은 본문

    def post(note_hash, action, body=None):
        calls.append(action)
        state = internal(client, "GET", f"/notes/{note_hash}/state").json()
        html = open_docs.pop(note_hash, state["html"])
        if action == "flush":
            if html != state["html"]:
                store(client, note_hash, html=html, title=state["title"])
        else:
            store(client, note_hash, html=html + body["html"], title=state["title"])

    monkeypatch.setattr(collab_client, "_post", post)
    return {"calls": calls, "open_docs": open_docs}


def test_agent_append_goes_through_collab(client, auth_headers, db_session, fake_collab):
    owner = member_headers(client)
    note = create_note(client, owner, title="일지", content="<p>월요일</p>")
    # 누가 편집 중이라 collab 메모리에만 있는 내용(아직 저장 전)
    fake_collab["open_docs"][note] = "<p>월요일</p><p>편집 중</p>"

    response = client.post(f"/api/v1/notes/{note}/append", headers={"Authorization": f"Bearer {agent_token(client, owner)}"},
                           json={"content": "화요일"})

    assert response.status_code == 200, response.text
    assert fake_collab["calls"] == ["flush", "append"]
    # 편집 중이던 내용이 덮이지 않고, 그 뒤에 붙었다
    assert client.get(f"/notes/{note}", headers=owner).json()["content"] == "<p>월요일</p><p>편집 중</p><p>화요일</p>"
    # 덧붙이기 전 스냅샷에는 편집 중이던 내용까지 담긴다(먼저 저장하게 했으므로)
    from app.modules.note.infrastructure.models import NoteSnapshot
    snapshot = db_session.query(NoteSnapshot).order_by(NoteSnapshot.pk.desc()).first()
    assert snapshot.content == "<p>월요일</p><p>편집 중</p>"


def test_agent_append_falls_back_to_the_db_without_collab(client, auth_headers):
    """collab 을 안 쓰거나 꺼져 있으면(conftest 기본) 예전처럼 DB 에 쓰고 낡은 Y 문서를 비운다."""
    owner = member_headers(client)
    note = create_note(client, owner, title="일지", content="<p>월요일</p>")
    store(client, note, html="<p>월요일</p>")

    response = client.post(f"/api/v1/notes/{note}/append", headers={"Authorization": f"Bearer {agent_token(client, owner)}"},
                           json={"content": "화요일"})

    assert response.status_code == 200, response.text
    state = internal(client, "GET", f"/notes/{note}/state").json()
    assert state["html"] == "<p>월요일</p><p>화요일</p>"
    assert state["ydoc"] is None


def test_agent_append_reports_a_collab_failure(client, auth_headers, monkeypatch):
    """collab 에 닿았는데 저장을 못 했으면 DB 에 몰래 쓰지 않고 알린다(열린 문서를 덮지 않기 위해)."""
    import httpx
    from conftest import REAL_COLLAB_POST
    from app.core.config import settings
    from app.modules.collab.application import client as collab_client
    owner = member_headers(client)
    note = create_note(client, owner, title="일지", content="<p>월요일</p>")
    sent = []

    def collab_answers(url, **kwargs):
        sent.append((url, kwargs["headers"]["X-Collab-Secret"]))
        return httpx.Response(200 if url.endswith("/flush") else 502, text="store failed")

    monkeypatch.setattr(collab_client, "_post", REAL_COLLAB_POST)
    monkeypatch.setattr(collab_client.httpx, "post", collab_answers)
    monkeypatch.setattr(settings, "COLLAB_INTERNAL_URL", "http://collab:1234")

    response = client.post(f"/api/v1/notes/{note}/append", headers={"Authorization": f"Bearer {agent_token(client, owner)}"},
                           json={"content": "화요일"})

    assert response.status_code == 503
    assert sent == [(f"http://collab:1234/internal/notes/{note}/flush", SECRET),
                    (f"http://collab:1234/internal/notes/{note}/append", SECRET)]
    assert client.get(f"/notes/{note}", headers=owner).json()["content"] == "<p>월요일</p>"


def test_unreachable_collab_falls_back_to_the_db(client, auth_headers, monkeypatch):
    import httpx
    from conftest import REAL_COLLAB_POST
    from app.modules.collab.application import client as collab_client
    owner = member_headers(client)
    note = create_note(client, owner, title="일지", content="<p>월요일</p>")

    def refused(url, **kwargs):
        raise httpx.ConnectError("refused")

    monkeypatch.setattr(collab_client, "_post", REAL_COLLAB_POST)
    monkeypatch.setattr(collab_client.httpx, "post", refused)

    response = client.post(f"/api/v1/notes/{note}/append", headers={"Authorization": f"Bearer {agent_token(client, owner)}"},
                           json={"content": "화요일"})

    assert response.status_code == 200, response.text
    assert client.get(f"/notes/{note}", headers=owner).json()["content"] == "<p>월요일</p><p>화요일</p>"


# ---------------------------------------------------------------- 공동 편집 중 자동 스냅샷(3분에 한 번, 바뀌기 전 모습)

class Clock:
    def __init__(self):
        from datetime import datetime, timezone
        self.now = datetime(2026, 10, 1, 9, 0, tzinfo=timezone.utc)

    def advance(self, minutes):
        from datetime import timedelta
        self.now += timedelta(minutes=minutes)


@pytest.fixture()
def clock(monkeypatch, db_session):
    """스냅샷의 created_at 은 DB 가 찍으므로, 남길 때 같은 시계로 고쳐 쓴다."""
    from app.modules.note.application import service as note_service
    from app.modules.note.infrastructure.repository import NoteRepository
    clock = Clock()
    monkeypatch.setattr(note_service, "_now", lambda: clock.now)
    original = NoteRepository.add_note_snapshot

    def add_at_clock(self, description, note):
        snapshot = original(self, description, note)
        snapshot.created_at = clock.now
        self.db.commit()
        return snapshot

    monkeypatch.setattr(NoteRepository, "add_note_snapshot", add_at_clock)
    return clock


def snapshot_contents(db_session, note):
    from app.modules.note.infrastructure.models import NoteSnapshot
    db_session.expire_all()
    rows = db_session.query(NoteSnapshot).join(Note).filter(Note.hash_id == note).order_by(NoteSnapshot.pk).all()
    return [row.content for row in rows]


def set_policy(client, headers, policy):
    assert client.patch("/preferences", headers=headers, json={"snapshot_policy": policy}).status_code == 200


def test_collab_snapshots_every_three_minutes_while_editing(client, auth_headers, db_session, clock):
    owner = member_headers(client)
    set_policy(client, owner, "ON_EVERY_EDIT")
    note = create_note(client, owner, title="일지", content="<p>v0</p>")

    store(client, note, html="<p>v1</p>", title="일지")      # 처음 고침: 손대기 전(v0)을 남긴다
    clock.advance(1)
    store(client, note, html="<p>v2</p>", title="일지")      # 1분 뒤: 아직
    clock.advance(1)
    store(client, note, html="<p>v3</p>", title="일지")      # 2분 뒤: 아직
    clock.advance(1.5)
    store(client, note, html="<p>v4</p>", title="일지")      # 3분 넘음: 바뀌기 전(v3)

    assert snapshot_contents(db_session, note) == ["<p>v0</p>", "<p>v3</p>"]


def test_collab_snapshot_after_a_long_pause_is_immediate(client, auth_headers, db_session, clock):
    """10분 동안 손대지 않으면 저장도 스냅샷도 없다. 다시 고치는 첫 저장에서 곧바로 그 전 모습을 남긴다."""
    owner = member_headers(client)
    set_policy(client, owner, "ON_EVERY_EDIT")
    note = create_note(client, owner, title="일지", content="<p>v0</p>")
    store(client, note, html="<p>v1</p>", title="일지")
    clock.advance(10)

    store(client, note, html="<p>v2</p>", title="일지")
    clock.advance(1)
    store(client, note, html="<p>v3</p>", title="일지")

    assert snapshot_contents(db_session, note) == ["<p>v0</p>", "<p>v1</p>"]


def test_collab_snapshot_skips_unchanged_and_manual_policy(client, auth_headers, db_session, clock):
    owner = member_headers(client)
    set_policy(client, owner, "ON_EVERY_EDIT")
    note = create_note(client, owner, title="일지", content="<p>v0</p>")
    store(client, note, html="<p>v1</p>", title="일지")
    clock.advance(5)
    store(client, note, html="<p>v1</p>", title="일지")      # 바뀐 것 없음(커서만 움직인 저장 등)
    assert snapshot_contents(db_session, note) == ["<p>v0</p>"]

    set_policy(client, owner, "MANUAL")
    clock.advance(5)
    store(client, note, html="<p>v2</p>", title="일지")
    assert snapshot_contents(db_session, note) == ["<p>v0</p>"]


def test_collab_snapshot_of_encrypted_note_stays_encrypted(client, auth_headers, db_session, clock):
    owner = member_headers(client)
    set_policy(client, owner, "ON_EVERY_EDIT")
    note = create_note(client, owner, title="비밀", content="<p>숨김</p>", is_encrypted=True)

    store(client, note, html="<p>숨김 고침</p>", title="비밀")

    [content] = snapshot_contents(db_session, note)
    assert "숨김" not in content
    snapshots = client.get(f"/notes/{note}/snapshots", headers=owner).json()
    items = snapshots["items"] if isinstance(snapshots, dict) else snapshots
    assert items[0]["content"] == "<p>숨김</p>"
