"""본문 암호화: 저장은 암호문으로, 응답은 평문으로.

DB 에 무엇이 들어갔는지까지 확인한다. 암호화의 목적이 'DB 가 새어도 본문은 못 읽는다'
이므로, 응답만 보는 테스트로는 아무것도 보장하지 못한다.
"""

import base64

import pytest
from cryptography.exceptions import InvalidTag

from app.modules.note.application.service import NoteService
from app.modules.note.infrastructure.models import Note
from app.modules.user.infrastructure.repository import UserRepository
from conftest import add_new_member_to_workspace, create_note, create_workspace

PLAINTEXT = "<p>사내 비밀번호는 hunter2</p>"


def stored_note(db_session, note_hash) -> Note:
    db_session.expire_all()
    return db_session.query(Note).filter(Note.hash_id == note_hash).first()


def test_encrypted_note_is_not_stored_as_plaintext(client, auth_headers, db_session):
    note_hash = create_note(client, auth_headers, content=PLAINTEXT, is_encrypted=True)

    note = stored_note(db_session, note_hash)

    assert note.is_encrypted is True
    assert "hunter2" not in note.content
    # 암호문은 base64 로 보관된다 -> 디코딩이 되어야 한다.
    assert base64.b64decode(note.content)


def test_encrypted_note_is_returned_as_plaintext_to_the_owner(client, auth_headers):
    note_hash = create_note(client, auth_headers, content=PLAINTEXT, is_encrypted=True)

    response = client.get(f"/notes/{note_hash}", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["content"] == PLAINTEXT
    assert response.json()["is_encrypted"] is True


def test_encrypted_note_is_readable_in_the_list(client, auth_headers):
    """목록에서도 복호화돼야 한다. 카드 미리보기가 암호문이면 곤란하다."""
    create_note(client, auth_headers, title="비밀 노트", content=PLAINTEXT, is_encrypted=True)

    response = client.get("/notes", headers=auth_headers)

    assert response.status_code == 200
    assert "hunter2" in response.json()[0]["content"]


def test_encrypted_note_is_searchable_by_body_text(client, auth_headers, search_index):
    """색인에는 평문이 들어가야 검색이 된다 (DB 는 암호문, 색인은 평문이라는 설계)."""
    note_hash = create_note(client, auth_headers, title="비밀 노트", content=PLAINTEXT, is_encrypted=True)

    assert "hunter2" in search_index.documents[note_hash]["content"]

    response = client.get("/notes", headers=auth_headers, params={"keyword": "hunter2"})
    assert [note["hash_id"] for note in response.json()] == [note_hash]


def test_turning_encryption_off_restores_plaintext_storage(client, auth_headers, db_session):
    note_hash = create_note(client, auth_headers, content=PLAINTEXT, is_encrypted=True)

    response = client.patch(f"/notes/{note_hash}", headers=auth_headers,
                            json={"is_encrypted": False, "content": PLAINTEXT})

    assert response.status_code == 200
    note = stored_note(db_session, note_hash)
    assert note.is_encrypted is False
    assert note.content == PLAINTEXT


def test_turning_encryption_on_encrypts_the_existing_body(client, auth_headers, db_session):
    """본문을 다시 보내지 않고 설정만 켜도 기존 본문이 암호화돼야 한다."""
    note_hash = create_note(client, auth_headers, content=PLAINTEXT)

    response = client.patch(f"/notes/{note_hash}", headers=auth_headers, json={"is_encrypted": True})

    assert response.status_code == 200
    assert "hunter2" not in stored_note(db_session, note_hash).content
    assert client.get(f"/notes/{note_hash}", headers=auth_headers).json()["content"] == PLAINTEXT


def test_encrypted_note_downloads_as_plaintext_markdown(client, auth_headers):
    note_hash = create_note(client, auth_headers, content=PLAINTEXT, is_encrypted=True)

    response = client.post("/notes/download", headers=auth_headers, json={"note_hashes": [note_hash]})

    assert response.status_code == 200
    assert "hunter2" in response.content.decode("utf-8")


def test_another_users_key_cannot_decrypt_the_content(db_session):
    """AAD 에 사용자 식별자를 묶어둔 효과 — 다른 사용자의 DEK 로는 복호화되지 않는다."""
    repository = UserRepository(db_session)
    owner = repository.create_user(username="owner", hashed_password="x", name="owner", is_superuser=False)
    intruder = repository.create_user(username="intruder", hashed_password="x", name="intruder",
                                      is_superuser=False)
    repository.create_user_key(owner)
    repository.create_user_key(intruder)
    db_session.refresh(owner)
    db_session.refresh(intruder)

    ciphertext = NoteService._encrypt_content(owner, PLAINTEXT)

    assert NoteService._decrypt_content(owner, ciphertext) == PLAINTEXT
    with pytest.raises(InvalidTag):
        NoteService._decrypt_content(intruder, ciphertext)


def test_shared_encrypted_note_is_readable_by_a_workspace_member(client, auth_headers):
    """조회 경로는 소유자의 키로 복호화하므로 공유 멤버도 읽을 수 있다."""
    workspace_hash = create_workspace(client, auth_headers)
    teammate = add_new_member_to_workspace(client, auth_headers, workspace_hash)
    note_hash = create_note(client, auth_headers, content=PLAINTEXT, is_encrypted=True,
                            workspaces=[workspace_hash])

    response = client.get(f"/notes/{note_hash}", headers=teammate)

    assert response.status_code == 200
    assert response.json()["content"] == PLAINTEXT
    assert response.json()["is_editable"] is True


def test_shared_encrypted_note_can_be_edited_by_a_workspace_member(client, auth_headers):
    """편집 권한이 있다고 응답해놓고 실제 편집은 실패해서는 안 된다."""
    workspace_hash = create_workspace(client, auth_headers)
    teammate = add_new_member_to_workspace(client, auth_headers, workspace_hash)
    note_hash = create_note(client, auth_headers, content=PLAINTEXT, is_encrypted=True,
                            workspaces=[workspace_hash])

    response = client.patch(f"/notes/{note_hash}", headers=teammate,
                            json={"content": "<p>팀원이 고친 본문</p>"})

    assert response.status_code == 200
    assert client.get(f"/notes/{note_hash}", headers=auth_headers).json()["content"] == "<p>팀원이 고친 본문</p>"
