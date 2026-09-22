from conftest import create_member, login, member_headers, signup

WORKSPACE_PAYLOAD = {
    "name": "test",
    "description": "test",
}


def create_workspace(client, auth_headers):
    response = client.post("/workspaces", headers=auth_headers, json=WORKSPACE_PAYLOAD)
    assert response.status_code == 201
    return response.json()


def test_list_workspace(client, auth_headers):
    response = client.get("/workspaces", headers=auth_headers)

    assert response.status_code == 200
    assert len(response.json()) == 0


def test_create_workspace(client, auth_headers):
    create_workspace(client, auth_headers)
    response = client.get("/workspaces", headers=auth_headers)

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["name"] == "test"


def test_add_member_into_workspace(client, auth_headers):
    signup(client)
    user_hash = login(client).json()["user_hash"]

    workspace = create_workspace(client, auth_headers)
    response = client.post(f"/workspaces/{workspace['hash_id']}/users/{user_hash}", headers=auth_headers)
    assert response.status_code == 201

    response = client.get(f"/workspaces/{workspace['hash_id']}/users", headers=auth_headers)
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_list_notes_for_workspace(client):
    signup(client)
    login_data = login(client).json()
    user_hash = login_data["user_hash"]
    access_token = login_data["access_token"]
    auth_headers = {
        "Authorization": f"Bearer {access_token}"
    }

    workspace = create_workspace(client, auth_headers)
    client.post(f"/workspaces/{workspace['hash_id']}/users/{user_hash}", headers=auth_headers)

    # 노트 저장은 사용자 설정(스냅샷 정책)을 읽는다. 설정 행은 GET /preferences 가 처음 만들므로
    # 실제 클라이언트와 같은 순서로 한 번 호출해 둔다.
    client.get("/preferences", headers=auth_headers)

    hash_id = client.post(f"/notes", headers=auth_headers).json()["hash_id"]
    client.patch(f"/notes/{hash_id}", json={
        "title": "test",
        "content": "test",
        "is_public": False,
        "is_protected": False,
        "tags": [],
        "workspaces": [workspace["hash_id"]]
    }, headers=auth_headers)

    response = client.get(f"/workspaces/{workspace['hash_id']}/notes", headers=auth_headers)
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_create_workspace_requires_superuser(client, auth_headers):
    member = member_headers(client)

    response = client.post("/workspaces", headers=member, json=WORKSPACE_PAYLOAD)

    assert response.status_code == 403


def test_list_workspace_requires_superuser(client, auth_headers):
    member = member_headers(client)

    assert client.get("/workspaces", headers=member).status_code == 403


def test_workspace_can_be_deleted(client, auth_headers):
    workspace = create_workspace(client, auth_headers)

    response = client.delete(f"/workspaces/{workspace['hash_id']}", headers=auth_headers)

    assert response.status_code == 204
    assert client.get("/workspaces", headers=auth_headers).json() == []


def test_deleting_an_unknown_workspace_returns_404(client, auth_headers):
    response = client.delete("/workspaces/does-not-exist", headers=auth_headers)

    assert response.status_code == 404


def test_member_can_be_removed_from_workspace(client, auth_headers):
    workspace = create_workspace(client, auth_headers)
    member_hash = create_member(client, username="teammate", name="팀원")
    client.post(f"/workspaces/{workspace['hash_id']}/users/{member_hash}", headers=auth_headers)

    response = client.delete(f"/workspaces/{workspace['hash_id']}/users/{member_hash}", headers=auth_headers)

    assert response.status_code == 204
    assert client.get(f"/workspaces/{workspace['hash_id']}/users", headers=auth_headers).json() == []


def test_adding_an_unknown_user_returns_404(client, auth_headers):
    workspace = create_workspace(client, auth_headers)

    response = client.post(f"/workspaces/{workspace['hash_id']}/users/does-not-exist", headers=auth_headers)

    assert response.status_code == 404


def test_workspace_members_are_listed_with_their_names(client, auth_headers):
    workspace = create_workspace(client, auth_headers)
    member_hash = create_member(client, username="teammate", name="팀원")
    client.post(f"/workspaces/{workspace['hash_id']}/users/{member_hash}", headers=auth_headers)

    listed = client.get(f"/workspaces/{workspace['hash_id']}/users", headers=auth_headers).json()

    assert listed == [{"user_hash": member_hash, "user_name": "팀원", "username": "teammate"}]
