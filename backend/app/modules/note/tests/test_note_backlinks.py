"""이 노트를 가리키는 노트(백링크).

본문은 암호화돼 있을 수 있어 DB 에서 긁을 수 없으므로, 저장할 때 링크를 따로 적어 둔다.
돌려주는 것은 보는 사람이 원래 열 수 있는 노트뿐이어야 한다.
"""

from conftest import add_new_member_to_workspace, create_note, create_workspace, member_headers


def link(note_hash, title="제목"):
    return f'<a data-note="{note_hash}" href="/s/{note_hash}" class="note-link">{title}</a>'


def backlinks(client, note_hash, headers):
    response = client.get(f"/notes/{note_hash}/backlinks", headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


def hashes(items):
    return [item["hash_id"] for item in items]


def test_note_that_links_here_is_listed(client, auth_headers):
    owner = member_headers(client)
    target = create_note(client, owner, title="대상")
    source = create_note(client, owner, title="가리키는 노트", content=f"<p>{link(target)}</p>")
    create_note(client, owner, title="상관없는 노트")

    items = backlinks(client, target, owner)
    assert hashes(items) == [source]
    assert items[0]["title"] == "가리키는 노트"
    assert items[0]["is_locked"] is False


def test_removing_the_link_removes_the_backlink(client, auth_headers):
    owner = member_headers(client)
    target = create_note(client, owner, title="대상")
    source = create_note(client, owner, content=f"<p>{link(target)}</p>")

    client.patch(f"/notes/{source}", headers=owner, json={"content": "<p>링크를 지웠다</p>"})

    assert backlinks(client, target, owner) == []


def test_saving_without_content_keeps_the_links(client, auth_headers):
    """제목·설정만 바꾸는 저장은 본문을 보내지 않는다. 그때 링크 표를 비우면 안 된다."""
    owner = member_headers(client)
    target = create_note(client, owner, title="대상")
    source = create_note(client, owner, content=f"<p>{link(target)}</p>")

    client.patch(f"/notes/{source}", headers=owner, json={"title": "제목만 바꿈"})

    assert hashes(backlinks(client, target, owner)) == [source]


def test_links_in_an_encrypted_note_are_found(client, auth_headers):
    owner = member_headers(client)
    target = create_note(client, owner, title="대상")
    source = create_note(client, owner, content=f"<p>{link(target)}</p>", is_encrypted=True)

    assert hashes(backlinks(client, target, owner)) == [source]


def test_self_link_and_missing_notes_are_ignored(client, auth_headers):
    owner = member_headers(client)
    target = create_note(client, owner, title="대상")
    client.patch(f"/notes/{target}", headers=owner,
                 json={"content": f"<p>{link(target)} {link('no-such-note')}</p>"})

    assert backlinks(client, target, owner) == []


def test_trashed_source_is_hidden_and_comes_back_on_restore(client, auth_headers):
    owner = member_headers(client)
    target = create_note(client, owner, title="대상")
    source = create_note(client, owner, content=f"<p>{link(target)}</p>")

    client.delete(f"/notes/{source}", headers=owner)
    assert backlinks(client, target, owner) == []

    client.patch(f"/notes/{source}/restore", headers=owner)
    assert hashes(backlinks(client, target, owner)) == [source]


def test_permanently_deleted_source_is_gone(client, auth_headers):
    owner = member_headers(client)
    target = create_note(client, owner, title="대상")
    source = create_note(client, owner, content=f"<p>{link(target)}</p>")

    client.delete(f"/notes/{source}", headers=owner)
    client.delete(f"/notes/{source}/permanently", headers=owner)

    assert backlinks(client, target, owner) == []


def test_sources_the_viewer_cannot_read_are_not_listed(client, auth_headers):
    """공개 노트를 누가 몰래 가리키고 있는지는 그 노트를 볼 수 있는 사람에게만 보여야 한다."""
    owner = member_headers(client)
    target = create_note(client, owner, title="공개 노트", is_public=True)
    private_source = create_note(client, owner, title="비공개 메모", content=f"<p>{link(target)}</p>")
    public_source = create_note(client, owner, title="공개 메모", content=f"<p>{link(target)}</p>", is_public=True)

    stranger = member_headers(client, username="stranger", name="남")
    assert hashes(backlinks(client, target, stranger)) == [public_source]
    assert sorted(hashes(backlinks(client, target, owner))) == sorted([private_source, public_source])


def test_password_protected_source_is_listed_without_its_title(client, auth_headers):
    owner = member_headers(client)
    target = create_note(client, owner, title="공개 노트", is_public=True)
    source = create_note(client, owner, title="잠긴 제목", content=f"<p>{link(target)}</p>",
                         is_public=True, password="pw")

    stranger = member_headers(client, username="stranger", name="남")
    items = backlinks(client, target, stranger)
    assert hashes(items) == [source]
    assert items[0]["is_locked"] is True
    assert items[0]["title"] == ""

    # 주인에게는 제목이 보인다.
    assert backlinks(client, target, owner)[0]["title"] == "잠긴 제목"


def test_workspace_member_sees_sources_shared_with_them(client, auth_headers):
    workspace = create_workspace(client, auth_headers)
    teammate = add_new_member_to_workspace(client, auth_headers, workspace)
    target = create_note(client, auth_headers, title="팀 노트", workspaces=[workspace])
    shared_source = create_note(client, auth_headers, content=f"<p>{link(target)}</p>", workspaces=[workspace])
    create_note(client, auth_headers, content=f"<p>{link(target)}</p>")

    assert hashes(backlinks(client, target, teammate)) == [shared_source]


def test_note_the_viewer_cannot_read_is_404(client, auth_headers):
    owner = member_headers(client)
    target = create_note(client, owner, title="비공개")
    create_note(client, owner, content=f"<p>{link(target)}</p>")

    stranger = member_headers(client, username="stranger", name="남")
    assert client.get(f"/notes/{target}/backlinks", headers=stranger).status_code == 404
    assert client.get("/notes/no-such-note/backlinks", headers=owner).status_code == 404


def test_backlinks_need_login(client, auth_headers):
    owner = member_headers(client)
    target = create_note(client, owner, title="공개", is_public=True)

    assert client.get(f"/notes/{target}/backlinks").status_code == 401
