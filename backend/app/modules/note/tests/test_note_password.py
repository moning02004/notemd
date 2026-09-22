"""노트별 열람 비밀번호와 공개 링크.

공개 링크는 주소만 알면 누구나 열 수 있으므로, 비밀번호 경로가 실제로 막고 있는지가 핵심이다.
"""

from conftest import create_note, member_headers
from app.modules.note.infrastructure.models import Note

PASSWORD = "open-sesame"


def open_with_password(client, note_hash, password, headers=None):
    return client.post(f"/notes/{note_hash}", headers=headers or {}, json={"password": password})


def public_note_with_password(client, headers, password=PASSWORD):
    return create_note(client, headers, title="잠긴 공개 노트", is_public=True, password=password)


def test_password_is_not_stored_as_plaintext(client, auth_headers, db_session):
    note_hash = public_note_with_password(client, auth_headers)

    db_session.expire_all()
    note = db_session.query(Note).filter(Note.hash_id == note_hash).first()

    assert note.password
    assert note.password != PASSWORD


def test_owner_sees_the_password_in_plaintext(client, auth_headers):
    """설정 화면에서 비밀번호를 다시 보여줘야 하므로 소유자에게는 평문으로 내려간다."""
    note_hash = public_note_with_password(client, auth_headers)

    response = client.get(f"/notes/{note_hash}", headers=auth_headers)

    assert response.json()["password"] == PASSWORD
    assert response.json()["is_password"] is True


def test_owner_opens_the_note_without_entering_the_password(client, auth_headers):
    note_hash = public_note_with_password(client, auth_headers)

    response = client.get(f"/notes/{note_hash}", headers=auth_headers)

    assert response.status_code == 200


def test_anonymous_visitor_is_blocked_without_the_password(client, auth_headers):
    note_hash = public_note_with_password(client, auth_headers)

    response = client.get(f"/notes/{note_hash}")

    assert response.status_code == 403
    assert response.json()["detail"]["is_password"] is True


def test_anonymous_visitor_opens_the_note_with_the_right_password(client, auth_headers):
    note_hash = public_note_with_password(client, auth_headers)

    response = open_with_password(client, note_hash, PASSWORD)

    assert response.status_code == 200
    assert response.json()["title"] == "잠긴 공개 노트"


def test_anonymous_visitor_is_rejected_with_a_wrong_password(client, auth_headers):
    note_hash = public_note_with_password(client, auth_headers)

    response = open_with_password(client, note_hash, "wrong")

    assert response.status_code == 403


def test_empty_password_does_not_unlock_the_note(client, auth_headers):
    note_hash = public_note_with_password(client, auth_headers)

    response = open_with_password(client, note_hash, "")

    assert response.status_code == 403


def test_logged_in_member_also_needs_the_password(client, auth_headers):
    """로그인했다고 남의 잠긴 노트가 그냥 열려서는 안 된다."""
    note_hash = public_note_with_password(client, auth_headers)
    other = member_headers(client)

    assert client.get(f"/notes/{note_hash}", headers=other).status_code == 403


def test_logged_in_member_opens_the_note_with_the_right_password(client, auth_headers):
    note_hash = public_note_with_password(client, auth_headers)
    other = member_headers(client)

    response = open_with_password(client, note_hash, PASSWORD, headers=other)

    assert response.status_code == 200


def test_private_note_with_password_is_still_hidden_from_anonymous(client, auth_headers):
    """비공개 노트는 비밀번호를 맞혀도 열리지 않는다 (공개 여부가 먼저)."""
    note_hash = create_note(client, auth_headers, title="비공개", password=PASSWORD)

    assert client.get(f"/notes/{note_hash}").status_code == 404
    assert open_with_password(client, note_hash, PASSWORD).status_code == 404


def test_password_can_be_changed(client, auth_headers):
    note_hash = public_note_with_password(client, auth_headers)

    client.patch(f"/notes/{note_hash}", headers=auth_headers, json={"password": "new-password"})

    assert open_with_password(client, note_hash, PASSWORD).status_code == 403
    assert open_with_password(client, note_hash, "new-password").status_code == 200


def test_password_can_be_removed(client, auth_headers):
    """설정에서 비밀번호를 비우면 잠금이 풀려야 한다."""
    note_hash = public_note_with_password(client, auth_headers)

    client.patch(f"/notes/{note_hash}", headers=auth_headers, json={"password": ""})

    assert client.get(f"/notes/{note_hash}").status_code == 200


def test_is_protected_round_trips(client, auth_headers):
    note_hash = create_note(client, auth_headers, is_protected=True)

    response = client.get(f"/notes/{note_hash}", headers=auth_headers)

    assert response.json()["is_protected"] is True
