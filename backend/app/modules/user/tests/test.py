from conftest import SIGNUP_PAYLOAD, signup, login


def test_check_returns_false_when_no_user_exists(client):
    response = client.get("/check")

    assert response.status_code == 200
    assert response.json() == {"exists": False}


def test_signup_creates_user(client):
    response = signup(client)

    assert response.status_code == 201
    assert "user_hash" in response.json()
    assert client.get("/check").json() == {"exists": True}


def test_signup_with_duplicate_username_fails(client):
    signup(client)

    response = signup(client)

    assert response.status_code == 400


def test_signup_with_mismatched_passwords_fails(client):
    response = signup(client, password2="different-password")

    assert response.status_code == 400


def test_obtain_token_with_correct_credentials_succeeds(client):
    signup(client)

    response = login(client)

    assert response.status_code == 200
    body = response.json()
    assert body["access_token"]
    assert body["user_hash"]
    assert response.cookies.get("refreshtoken")


def test_obtain_token_with_wrong_password_fails(client):
    signup(client)
    signup(client)

    response = login(client, password="wrong-password")

    assert response.status_code == 404


def test_obtain_token_with_unknown_username_fails(client):
    response = login(client)

    assert response.status_code == 404


def test_refresh_token_returns_the_same_user_id(client):
    signup(client)
    login_response = login(client)
    user_hash = login_response.json()["user_hash"]
    refresh_token = login_response.cookies["refreshtoken"]

    client.cookies.set("refreshtoken", refresh_token)
    response = client.post("/auth/refresh-token")

    assert response.status_code == 200
    body = response.json()
    assert body["user_hash"] == user_hash
    assert body["access_token"]


def test_refresh_token_without_cookie_fails(client):
    response = client.post("/auth/refresh-token")

    assert response.status_code == 401


def test_change_password_then_login_with_new_password(client, access_token):
    response = client.patch(
        "/users/change-password",
        json={
            "current_password": SIGNUP_PAYLOAD["password1"],
            "new_password1": "new-password456!",
            "new_password2": "new-password456!",
        },
        headers={"Authorization": f"Bearer {access_token}"},
    )

    assert response.status_code == 204
    assert login(client).status_code == 404
    assert login(client, password="new-password456!").status_code == 200


def test_change_password_with_wrong_current_password_fails(client, access_token):
    response = client.patch(
        "/users/change-password",
        json={
            "current_password": "wrong-password",
            "new_password1": "new-password456!",
            "new_password2": "new-password456!",
        },
        headers={"Authorization": f"Bearer {access_token}"},
    )

    assert response.status_code == 404


def test_change_password_without_auth_fails(client):
    signup(client)

    response = client.patch("/users/change-password", json={
        "current_password": SIGNUP_PAYLOAD["password1"],
        "new_password1": "new-password456!",
        "new_password2": "new-password456!",
    })

    assert response.status_code == 401


def test_get_workspaces_for_user_returns_all_workspaces_for_superuser(client, auth_headers):
    user_hash = login(client).json()["user_hash"]
    client.post("/workspaces", headers=auth_headers, json={"name": "test", "description": "test"})

    response = client.get(f"/users/{user_hash}/workspaces", headers=auth_headers)

    assert response.status_code == 200
    assert len(response.json()) == 1


def test_add_user(client, auth_headers):
    response = client.post("/users", json={
        "username": SIGNUP_PAYLOAD["password1"],
        "name": SIGNUP_PAYLOAD["password1"],
    })

    assert response.status_code == 201

    response = client.get("/users", headers=auth_headers)
    assert response.status_code == 200
    assert len(response.json()) == 1
