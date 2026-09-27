"""본문의 노트 링크는 내려줄 때마다 지금 대상 노트와 보는 사람의 권한으로 다시 쓰인다.

링크를 넣을 때의 제목이 본문에 남아 있으므로, 이걸 그대로 내보내면 옛 제목이 보이고
열 수 없는 노트의 제목까지 새어 나간다.
"""

from conftest import (add_new_member_to_workspace, create_note, create_workspace,
                      member_headers)
from app.modules.note.infrastructure.models import Note


def link(note_hash, title="넣을 때의 제목"):
    return f'<a data-note="{note_hash}" href="/s/{note_hash}" class="note-link">{title}</a>'


def note_with_link_to(client, headers, target_hash, **fields):
    return create_note(client, headers, title="가리키는 노트", content=f"<p>참고: {link(target_hash)}</p>", **fields)


def content_of(client, note_hash, headers=None):
    response = client.get(f"/notes/{note_hash}", headers=headers or {})
    assert response.status_code == 200, response.text
    return response.json()["content"]


def test_link_shows_the_current_title_of_the_target(client, auth_headers):
    owner = member_headers(client)
    target = create_note(client, owner, title="처음 제목")
    source = note_with_link_to(client, owner, target)

    client.patch(f"/notes/{target}", headers=owner, json={"title": "바꾼 제목"})

    content = content_of(client, source, owner)
    assert ">바꾼 제목</a>" in content
    assert "넣을 때의 제목" not in content
    assert "data-state" not in content


def test_link_to_a_trashed_note_is_marked_deleted(client, auth_headers):
    owner = member_headers(client)
    target = create_note(client, owner, title="버린 노트")
    source = note_with_link_to(client, owner, target)

    client.delete(f"/notes/{target}", headers=owner)

    content = content_of(client, source, owner)
    assert 'data-state="deleted"' in content
    assert ">버린 노트</a>" in content


def test_public_note_does_not_leak_the_title_of_a_private_note(client, auth_headers):
    owner = member_headers(client)
    secret = create_note(client, owner, title="아무도 몰라야 하는 제목")
    source = note_with_link_to(client, owner, secret, is_public=True)

    for viewer in ({}, member_headers(client, username="stranger", name="남")):
        content = content_of(client, source, viewer)
        assert "아무도 몰라야 하는 제목" not in content
        assert "넣을 때의 제목" not in content
        assert 'data-state="unavailable"' in content


def test_link_to_a_public_note_shows_its_title_to_anyone(client, auth_headers):
    owner = member_headers(client)
    target = create_note(client, owner, title="공개된 노트", is_public=True)
    source = note_with_link_to(client, owner, target, is_public=True)

    content = content_of(client, source)
    assert ">공개된 노트</a>" in content
    assert "data-state" not in content


def test_password_protected_note_hides_its_title_from_others(client, auth_headers):
    owner = member_headers(client)
    target = create_note(client, owner, title="잠긴 제목", is_public=True, password="pw")
    source = note_with_link_to(client, owner, target, is_public=True)

    content = content_of(client, source)
    assert "잠긴 제목" not in content
    assert 'data-state="locked"' in content

    # 주인에게는 잠겨 있지 않다.
    assert ">잠긴 제목</a>" in content_of(client, source, owner)


def test_workspace_member_sees_the_title_of_a_note_shared_with_them(client, auth_headers):
    workspace = create_workspace(client, auth_headers)
    teammate = add_new_member_to_workspace(client, auth_headers, workspace)
    target = create_note(client, auth_headers, title="팀 노트", workspaces=[workspace])
    source = note_with_link_to(client, auth_headers, target, workspaces=[workspace])

    content = content_of(client, source, teammate)
    assert ">팀 노트</a>" in content
    assert "data-state" not in content


def test_link_to_a_missing_note_is_unavailable(client, auth_headers):
    owner = member_headers(client)
    source = note_with_link_to(client, owner, "no-such-note")

    assert 'data-state="unavailable"' in content_of(client, source, owner)


def test_rewriting_does_not_change_what_is_stored(client, auth_headers, db_session):
    owner = member_headers(client)
    secret = create_note(client, owner, title="비밀")
    source = note_with_link_to(client, owner, secret, is_public=True)

    content_of(client, source)  # 남이 보면 '볼 수 없는 노트' 로 바뀌어 나간다.

    db_session.expire_all()
    stored = db_session.query(Note).filter(Note.hash_id == source).first().content
    assert ">비밀</a>" in stored
    assert "볼 수 없는 노트" not in stored
    assert "data-state" not in stored


def test_download_uses_the_current_title(client, auth_headers):
    owner = member_headers(client)
    target = create_note(client, owner, title="처음 제목")
    source = note_with_link_to(client, owner, target)
    client.patch(f"/notes/{target}", headers=owner, json={"title": "바꾼 제목"})

    response = client.post("/notes/download", headers=owner, json={"note_hashes": [source]})

    body = response.content.decode("utf-8")
    assert "바꾼 제목" in body
    assert "넣을 때의 제목" not in body


def test_other_markup_is_left_alone(client, auth_headers):
    owner = member_headers(client)
    target = create_note(client, owner, title="대상")
    others = '<p>그냥 <a href="https://example.com">바깥 링크</a> 와 <strong>굵게</strong></p>'
    source = create_note(client, owner, content=others + f"<p>{link(target)}</p>")

    content = content_of(client, source, owner)
    assert content.startswith(others)


def test_saving_what_a_member_was_shown_keeps_the_real_title(client, auth_headers, db_session):
    """멤버는 볼 수 없는 노트를 '볼 수 없는 노트' 로 받는다. 그걸 그대로 저장해도 원본은 멀쩡해야 한다."""
    workspace = create_workspace(client, auth_headers)
    teammate = add_new_member_to_workspace(client, auth_headers, workspace)
    owner_only = create_note(client, auth_headers, title="관리자만 아는 제목")
    source = note_with_link_to(client, auth_headers, owner_only, workspaces=[workspace])

    shown = content_of(client, source, teammate)
    assert 'data-state="unavailable"' in shown

    response = client.patch(f"/notes/{source}", headers=teammate, json={"content": shown + "<p>덧붙임</p>"})
    assert response.status_code == 200
    # 돌려받는 본문으로도 새면 안 된다.
    assert "관리자만 아는 제목" not in response.json()["content"]

    db_session.expire_all()
    stored = db_session.query(Note).filter(Note.hash_id == source).first().content
    assert ">관리자만 아는 제목</a>" in stored
    assert "data-state" not in stored
    assert "덧붙임" in stored


def test_saving_keeps_the_text_of_a_link_to_a_missing_note(client, auth_headers, db_session):
    owner = member_headers(client)
    source = note_with_link_to(client, owner, "no-such-note")

    db_session.expire_all()
    stored = db_session.query(Note).filter(Note.hash_id == source).first().content
    assert ">넣을 때의 제목</a>" in stored
