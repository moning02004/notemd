from conftest import SIGNUP_PAYLOAD, signup, login, member_headers


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
    response = client.post("/users", headers=auth_headers, json={
        "username": SIGNUP_PAYLOAD["password1"],
        "name": SIGNUP_PAYLOAD["password1"],
    })

    assert response.status_code == 201

    response = client.get("/users", headers=auth_headers)
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_admin_signup_needs_the_admin_key(client):
    for wrong in ({"admin_key": "wrong-key"}, {"admin_key": None}):
        response = signup(client, **wrong)
        assert response.status_code == 403
        assert response.json()["detail"] == "관리자 키가 일치하지 않습니다."
    assert client.get("/check").json()["exists"] is False

    assert signup(client).status_code == 201


def test_admin_signup_is_refused_when_the_server_has_no_admin_key(client, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "ADMIN_KEY", "")

    assert signup(client, admin_key="").status_code == 403


def test_anonymous_cannot_add_a_user(client, auth_headers):
    response = client.post("/users", json={"username": "intruder", "name": "침입자"})
    assert response.status_code == 401


def test_member_cannot_add_a_user(client, auth_headers):
    member = member_headers(client)
    response = client.post("/users", headers=member, json={"username": "intruder", "name": "침입자"})
    assert response.status_code == 403


def test_added_user_is_not_a_superuser(client, auth_headers):
    member = member_headers(client)
    # 최고 관리자만 볼 수 있는 목록이다.
    assert client.get("/users", headers=member).status_code == 403


def test_added_user_gets_a_one_time_temporary_password(client, auth_headers):
    import re

    response = client.post("/users", headers=auth_headers, json={"username": "newbie", "name": "새 사람"})
    temporary = response.json()["temporary_password"]

    assert response.status_code == 201
    assert temporary != "0000"
    assert re.fullmatch(r"[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}", temporary)
    assert not set(temporary) & set("01oil")
    # 다시 볼 수 없다: 목록·조회 응답에는 없다.
    assert all("temporary_password" not in user for user in client.get("/users", headers=auth_headers).json())

    # 두 번 만들면 다른 비밀번호다.
    other = client.post("/users", headers=auth_headers, json={"username": "newbie2", "name": "또"}).json()
    assert other["temporary_password"] != temporary


def test_temporary_password_must_be_changed_on_first_login(client, auth_headers):
    temporary = client.post("/users", headers=auth_headers,
                            json={"username": "newbie", "name": "새 사람"}).json()["temporary_password"]

    first = client.post("/auth/obtain-token", json={"username": "newbie", "password": temporary})
    assert first.status_code == 200
    assert first.json()["must_change_password"] is True

    headers = {"Authorization": f"Bearer {first.json()['access_token']}"}
    changed = client.patch("/users/change-password", headers=headers, json={
        "current_password": temporary, "new_password1": "my-own-pass!", "new_password2": "my-own-pass!"})
    assert changed.status_code == 204

    again = client.post("/auth/obtain-token", json={"username": "newbie", "password": "my-own-pass!"})
    assert again.json()["must_change_password"] is False


def test_admin_signup_does_not_need_a_password_change(client):
    signup(client)

    assert login(client).json()["must_change_password"] is False


def test_user_info_needs_login(client, auth_headers):
    user_hash = login(client).json()["user_hash"]

    assert client.get(f"/users/{user_hash}").status_code == 401
    assert client.get(f"/users/{user_hash}/workspaces").status_code == 401


def test_member_sees_only_their_own_info(client, auth_headers):
    admin_hash = login(client).json()["user_hash"]
    member = member_headers(client)
    member_hash = client.get("/users", headers=auth_headers).json()[0]["user_hash"]

    assert client.get(f"/users/{member_hash}", headers=member).status_code == 200
    assert client.get(f"/users/{member_hash}/workspaces", headers=member).status_code == 200
    # 남의 계정은 있는지조차 알리지 않는다(없는 계정과 같은 404).
    assert client.get(f"/users/{admin_hash}", headers=member).status_code == 404
    assert client.get(f"/users/{admin_hash}/workspaces", headers=member).status_code == 404
    assert client.get("/users/no-such-user", headers=member).status_code == 404


def test_admin_can_see_members_info(client, auth_headers):
    member_headers(client)
    member_hash = client.get("/users", headers=auth_headers).json()[0]["user_hash"]

    response = client.get(f"/users/{member_hash}", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["username"] == "member"


def _member_hash(client, auth_headers, username="member"):
    return next(user["user_hash"] for user in client.get("/users", headers=auth_headers).json()
                if user["username"] == username)


def test_admin_resets_a_members_password(client, auth_headers):
    from conftest import MEMBER_PASSWORDS

    member_headers(client)
    old = MEMBER_PASSWORDS["member"]
    response = client.post(f"/users/{_member_hash(client, auth_headers)}/reset-password", headers=auth_headers)

    assert response.status_code == 200
    temporary = response.json()["temporary_password"]
    assert temporary != old
    # 예전 비밀번호로는 못 들어가고, 새 임시 비밀번호로 들어가면 바꾸라고 한다.
    assert client.post("/auth/obtain-token", json={"username": "member", "password": old}).status_code == 404
    login_response = client.post("/auth/obtain-token", json={"username": "member", "password": temporary})
    assert login_response.status_code == 200
    assert login_response.json()["must_change_password"] is True


def test_only_admin_can_reset_passwords(client, auth_headers):
    member = member_headers(client)
    member_headers(client, username="other", name="다른 멤버")
    other_hash = _member_hash(client, auth_headers, "other")

    assert client.post(f"/users/{other_hash}/reset-password", headers=member).status_code == 403
    assert client.post(f"/users/{other_hash}/reset-password").status_code == 401


def test_admin_password_is_not_reset_this_way(client, auth_headers):
    admin_hash = login(client).json()["user_hash"]

    response = client.post(f"/users/{admin_hash}/reset-password", headers=auth_headers)

    assert response.status_code == 400
    assert client.post("/users/no-such-user/reset-password", headers=auth_headers).status_code == 404
