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


def test_anonymous_can_only_read_public_notes(client, auth_headers):
    owner = member_headers(client)
    public = create_note(client, owner, title="공개", is_public=True)
    private = create_note(client, owner, title="비공개")

    assert authorize(client, public).json() == {"access": "read", "user_id": None, "user_name": "손님"}
    assert authorize(client, private).status_code == 404


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

    assert response.json()["access"] == "read"


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
