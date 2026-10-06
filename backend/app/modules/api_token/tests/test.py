"""개인 API 토큰과 /api/v1 (AI 에이전트가 노트를 쓰고 읽는 API)."""

from conftest import create_note, member_headers
from app.modules.api_token.infrastructure.models import ApiToken
from app.modules.note.infrastructure.models import Note, NoteSnapshot


def issue(client, headers, name="Claude", scope="write"):
    response = client.post("/api-tokens", headers=headers, json={"name": name, "scope": scope})
    assert response.status_code == 201, response.text
    return response.json()


def bearer(token):
    return {"Authorization": f"Bearer {token['token']}"}


# ---------------------------------------------------------------- 토큰 관리

def test_token_is_shown_once_and_only_its_hash_is_stored(client, auth_headers, db_session):
    owner = member_headers(client)
    token = issue(client, owner)

    assert token["token"].startswith("mdn_") and len(token["token"]) > 40
    assert token["prefix"] == token["token"][:10]
    listed = client.get("/api-tokens", headers=owner).json()
    assert [item["hash_id"] for item in listed] == [token["hash_id"]]
    assert "token" not in listed[0]
    stored = db_session.query(ApiToken).one()
    assert token["token"] not in (stored.token_hash, stored.prefix)


def test_revoked_token_stops_working(client, auth_headers):
    owner = member_headers(client)
    token = issue(client, owner)

    assert client.delete(f"/api-tokens/{token['hash_id']}", headers=owner).status_code == 204
    response = client.post("/api/v1/notes", headers=bearer(token), json={"title": "x"})
    assert response.status_code == 401


def test_tokens_are_per_user(client, auth_headers):
    owner = member_headers(client)
    token = issue(client, owner)
    stranger = member_headers(client, username="stranger", name="남")

    assert client.get("/api-tokens", headers=stranger).json() == []
    assert client.delete(f"/api-tokens/{token['hash_id']}", headers=stranger).status_code == 404


def test_token_management_needs_login(client):
    assert client.get("/api-tokens").status_code == 401


# ---------------------------------------------------------------- 인증

def test_v1_accepts_only_api_tokens(client, auth_headers):
    owner = member_headers(client)

    assert client.post("/api/v1/notes", json={"title": "x"}).status_code == 401
    # 로그인 토큰으로는 안 된다. 거꾸로 API 토큰으로 앱 API 를 쓸 수도 없다.
    assert client.post("/api/v1/notes", headers=owner, json={"title": "x"}).status_code == 401
    token = issue(client, owner)
    assert client.get("/notes", headers=bearer(token)).status_code == 401
    assert client.post("/api/v1/notes", headers={"Authorization": "Bearer mdn_wrong"}, json={}).status_code == 401


def test_write_token_cannot_read(client, auth_headers):
    owner = member_headers(client)
    writer = issue(client, owner, scope="write")

    assert client.get("/api/v1/notes", headers=bearer(writer)).status_code == 403
    assert client.get("/api/v1/folders", headers=bearer(writer)).status_code == 403


def test_rate_limit(client, auth_headers, monkeypatch):
    from app.modules.api_token.interfaces import dependencies

    monkeypatch.setattr(dependencies, "RATE_LIMIT_PER_MINUTE", 2)
    owner = member_headers(client)
    token = issue(client, owner, scope="read_write")

    assert client.get("/api/v1/folders", headers=bearer(token)).status_code == 200
    assert client.get("/api/v1/folders", headers=bearer(token)).status_code == 200
    blocked = client.get("/api/v1/folders", headers=bearer(token))
    assert blocked.status_code == 429
    assert "Retry-After" in blocked.headers


def test_last_used_is_recorded(client, auth_headers):
    owner = member_headers(client)
    token = issue(client, owner)
    assert client.get("/api-tokens", headers=owner).json()[0]["last_used_at"] is None

    client.post("/api/v1/notes", headers=bearer(token), json={"title": "x"})

    assert client.get("/api-tokens", headers=owner).json()[0]["last_used_at"] is not None


# ---------------------------------------------------------------- 쓰기

def test_create_note_from_markdown_in_a_folder_path(client, auth_headers, db_session):
    owner = member_headers(client)
    token = issue(client, owner)

    response = client.post("/api/v1/notes", headers=bearer(token), json={
        "title": "9월 회의", "folder": "업무/회의",
        "content": "안건 정리\n\n- [x] 배포\n- [ ] 점검\n\n<details>\n<summary>메모</summary>\n\n본문\n\n</details>"})

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["title"] == "9월 회의"
    assert body["folder"] == "업무/회의"
    assert body["url"].endswith(f"/s/{body['id']}")

    # 앱에서 쓴 노트와 같은 모양으로 저장된다(체크리스트·접기).
    detail = client.get(f"/notes/{body['id']}", headers=owner).json()
    assert 'data-type="taskList"' in detail["content"]
    assert '<div data-type="detailsContent">' in detail["content"]
    assert detail["folder"]["name"] == "회의"

    # 같은 경로로 다시 쓰면 폴더를 새로 만들지 않는다.
    client.post("/api/v1/notes", headers=bearer(token), json={"title": "10월 회의", "folder": "업무/회의"})
    folders = client.get("/folders", headers=owner).json()["folders"]
    assert [f["name"] for f in folders] == ["업무"]
    assert [f["name"] for f in folders[0]["children"]] == ["회의"]

    # 에이전트가 쓴 것은 스냅샷 설명으로 가려낼 수 있다.
    note = db_session.query(Note).filter(Note.hash_id == body["id"]).one()
    assert any("API 토큰 'Claude'" in s.description for s in db_session.query(NoteSnapshot).filter(
        NoteSnapshot.note_id == note.pk))


def test_folder_depth_limit_applies(client, auth_headers):
    owner = member_headers(client)
    token = issue(client, owner)

    response = client.post("/api/v1/notes", headers=bearer(token), json={"title": "x", "folder": "a/b/c/d"})

    assert response.status_code == 400


def test_append_to_note(client, auth_headers):
    owner = member_headers(client)
    token = issue(client, owner)
    note = create_note(client, owner, title="업무 일지", content="<p>월요일</p>")

    response = client.post(f"/api/v1/notes/{note}/append", headers=bearer(token), json={"content": "화요일\n\n- 회의"})

    assert response.status_code == 200, response.text
    content = client.get(f"/notes/{note}", headers=owner).json()["content"]
    assert content.startswith("<p>월요일</p><p>화요일</p>")
    assert "<li>회의</li>" in content


def test_append_keeps_encrypted_notes_encrypted(client, auth_headers, db_session):
    owner = member_headers(client)
    token = issue(client, owner)
    note = create_note(client, owner, title="비밀", content="<p>처음</p>", is_encrypted=True)

    client.post(f"/api/v1/notes/{note}/append", headers=bearer(token), json={"content": "덧붙임"})

    stored = db_session.query(Note).filter(Note.hash_id == note).one()
    db_session.refresh(stored)
    assert "덧붙임" not in stored.content
    assert "덧붙임" in client.get(f"/notes/{note}", headers=owner).json()["content"]


def test_encrypted_note_body_cannot_be_read_with_a_token(client, auth_headers):
    """토큰이 새도 암호화한 노트의 본문은 나가지 않는다. 제목으로 찾을 수는 있지만 발췌도 싣지 않는다."""
    owner = member_headers(client)
    token = issue(client, owner, scope="read_write")
    note = create_note(client, owner, title="비밀", content="<p>hunter2</p>", is_encrypted=True)

    response = client.get(f"/api/v1/notes/{note}", headers=bearer(token))
    assert response.status_code == 403
    assert "hunter2" not in response.text

    listed = client.get("/api/v1/notes", headers=bearer(token)).json()
    assert [(item["title"], item["snippet"]) for item in listed] == [("비밀", "")]


def test_cannot_touch_other_peoples_or_trashed_notes(client, auth_headers):
    owner = member_headers(client)
    token = issue(client, owner, scope="read_write")
    stranger = member_headers(client, username="stranger", name="남")
    theirs = create_note(client, stranger, title="남의 노트")
    trashed = create_note(client, owner, title="버린 노트")
    client.delete(f"/notes/{trashed}", headers=owner)

    for note in (theirs, trashed):
        assert client.post(f"/api/v1/notes/{note}/append", headers=bearer(token),
                           json={"content": "x"}).status_code == 404
        assert client.get(f"/api/v1/notes/{note}", headers=bearer(token)).status_code == 404


# ---------------------------------------------------------------- 읽기

def test_read_note_as_markdown(client, auth_headers):
    owner = member_headers(client)
    token = issue(client, owner, scope="read_write")
    note = create_note(client, owner, title="할 일", content=(
        '<ul data-type="taskList"><li data-checked="true" data-type="taskItem"><label><input type="checkbox" '
        'checked="checked"><span></span></label><div><p>배포</p></div></li></ul>'))

    response = client.get(f"/api/v1/notes/{note}", headers=bearer(token))

    assert response.status_code == 200
    assert response.json()["content"] == "- [x] 배포\n"
    assert response.json()["title"] == "할 일"


def test_list_and_search_notes(client, auth_headers):
    owner = member_headers(client)
    token = issue(client, owner, scope="read_write")
    create_note(client, owner, title="배포 절차", content="<p>마이그레이션 먼저</p>")
    create_note(client, owner, title="장보기", content="<p>우유</p>")
    stranger = member_headers(client, username="stranger", name="남")
    create_note(client, stranger, title="남의 배포", content="<p>배포</p>")

    everything = client.get("/api/v1/notes", headers=bearer(token)).json()
    found = client.get("/api/v1/notes", headers=bearer(token), params={"q": "배포"}).json()

    assert {note["title"] for note in everything} == {"배포 절차", "장보기"}
    assert [note["title"] for note in found] == ["배포 절차"]
    assert found[0]["snippet"] == "마이그레이션 먼저"


def test_list_folders(client, auth_headers):
    owner = member_headers(client)
    token = issue(client, owner, scope="read_write")
    client.post("/api/v1/notes", headers=bearer(token), json={"title": "x", "folder": "업무/회의"})

    assert client.get("/api/v1/folders", headers=bearer(token)).json() == ["업무", "업무/회의"]
