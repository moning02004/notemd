"""워크스페이스 공유: 멤버는 편집까지, 멤버가 아니면 존재 자체를 모른다."""

from conftest import (add_new_member_to_workspace, create_member, create_note, create_workspace,
                      login_member, member_headers)


def shared_note(client, auth_headers, workspace_hash, title="공유 노트"):
    return create_note(client, auth_headers, title=title, workspaces=[workspace_hash])


def test_workspace_member_can_read_and_edit_a_shared_note(client, auth_headers):
    workspace_hash = create_workspace(client, auth_headers)
    teammate = add_new_member_to_workspace(client, auth_headers, workspace_hash)
    note_hash = shared_note(client, auth_headers, workspace_hash)

    response = client.get(f"/notes/{note_hash}", headers=teammate)
    assert response.status_code == 200
    assert response.json()["is_editable"] is True

    edited = client.patch(f"/notes/{note_hash}", headers=teammate, json={"title": "팀원이 고친 제목"})
    assert edited.status_code == 200
    assert client.get(f"/notes/{note_hash}", headers=auth_headers).json()["title"] == "팀원이 고친 제목"


def test_non_member_cannot_see_a_shared_note(client, auth_headers):
    workspace_hash = create_workspace(client, auth_headers)
    note_hash = shared_note(client, auth_headers, workspace_hash)
    outsider = member_headers(client, username="outsider", name="외부인")

    assert client.get(f"/notes/{note_hash}", headers=outsider).status_code == 404


def test_access_is_revoked_when_the_member_leaves_the_workspace(client, auth_headers):
    workspace_hash = create_workspace(client, auth_headers)
    member_hash = create_member(client, username="teammate", name="팀원")
    client.post(f"/workspaces/{workspace_hash}/users/{member_hash}", headers=auth_headers)
    teammate = login_member(client, "teammate")
    note_hash = shared_note(client, auth_headers, workspace_hash)

    assert client.get(f"/notes/{note_hash}", headers=teammate).status_code == 200

    client.delete(f"/workspaces/{workspace_hash}/users/{member_hash}", headers=auth_headers)

    assert client.get(f"/notes/{note_hash}", headers=teammate).status_code == 404


def test_access_is_revoked_when_the_note_stops_being_shared(client, auth_headers):
    workspace_hash = create_workspace(client, auth_headers)
    teammate = add_new_member_to_workspace(client, auth_headers, workspace_hash)
    note_hash = shared_note(client, auth_headers, workspace_hash)

    client.patch(f"/notes/{note_hash}", headers=auth_headers, json={"workspaces": []})

    assert client.get(f"/notes/{note_hash}", headers=teammate).status_code == 404


def test_shared_note_does_not_appear_in_the_members_own_note_list(client, auth_headers):
    """공유받은 노트는 내 노트가 아니다. 목록은 소유한 노트만 보여준다."""
    workspace_hash = create_workspace(client, auth_headers)
    teammate = add_new_member_to_workspace(client, auth_headers, workspace_hash)
    shared_note(client, auth_headers, workspace_hash)

    assert client.get("/notes", headers=teammate).json() == []


def test_workspace_note_list_shows_the_shared_note_to_a_member(client, auth_headers):
    workspace_hash = create_workspace(client, auth_headers)
    teammate = add_new_member_to_workspace(client, auth_headers, workspace_hash)
    shared_note(client, auth_headers, workspace_hash, title="공유 노트")

    response = client.get(f"/workspaces/{workspace_hash}/notes", headers=teammate)

    assert response.status_code == 200
    assert [note["title"] for note in response.json()] == ["공유 노트"]
    assert response.json()[0]["is_shared"] is True


def test_workspace_note_list_is_refused_to_non_members(client, auth_headers):
    workspace_hash = create_workspace(client, auth_headers)
    outsider = member_headers(client, username="outsider", name="외부인")

    response = client.get(f"/workspaces/{workspace_hash}/notes", headers=outsider)

    assert response.status_code == 403


def test_a_note_can_be_shared_with_several_workspaces(client, auth_headers):
    first = create_workspace(client, auth_headers, name="팀A")
    second = create_workspace(client, auth_headers, name="팀B")
    note_hash = create_note(client, auth_headers, title="양쪽 공유", workspaces=[first, second])

    response = client.get(f"/notes/{note_hash}", headers=auth_headers)

    assert sorted(workspace["name"] for workspace in response.json()["workspaces"]) == ["팀A", "팀B"]


def test_workspace_note_list_excludes_trashed_notes(client, auth_headers):
    workspace_hash = create_workspace(client, auth_headers)
    teammate = add_new_member_to_workspace(client, auth_headers, workspace_hash)
    note_hash = shared_note(client, auth_headers, workspace_hash)

    client.delete(f"/notes/{note_hash}", headers=auth_headers)

    assert client.get(f"/workspaces/{workspace_hash}/notes", headers=teammate).json() == []


def test_superuser_can_open_any_note(client, auth_headers):
    """최고 관리자는 소유자가 아니어도 노트를 연다. 셀프호스팅 관리자 전제의 의도된 동작."""
    member = member_headers(client, username="member", name="멤버")
    note_hash = create_note(client, member, title="멤버의 노트")

    response = client.get(f"/notes/{note_hash}", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["is_editable"] is True
