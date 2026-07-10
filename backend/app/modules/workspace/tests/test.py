from conftest import signup, login

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
