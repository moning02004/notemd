def test_get_preference_creates_default_when_missing(client, auth_headers):
    response = client.get("/preferences", headers=auth_headers)

    assert response.status_code == 200
    assert response.json() == {"is_superuser": True, "trash_policy": "30_DAYS", "snapshot_policy": "MANUAL"}


def test_get_preference_without_auth_fails(client):
    response = client.get("/preferences")

    assert response.status_code == 401


def test_update_preference_changes_only_given_fields(client, auth_headers):
    response = client.patch("/preferences", json={"trash_policy": "15_DAYS"}, headers=auth_headers)

    assert response.status_code == 200
    assert response.json() == {"is_superuser": True, "trash_policy": "15_DAYS", "snapshot_policy": "MANUAL"}


def test_update_preference_changes_snapshot_policy(client, auth_headers):
    response = client.patch("/preferences", json={"snapshot_policy": "ON_EVERY_EDIT"}, headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["snapshot_policy"] == "ON_EVERY_EDIT"


def test_preference_survives_a_second_read(client, auth_headers):
    """GET 이 기본값을 만들어주는 구조라, 두 번째 GET 이 설정을 되돌리면 안 된다."""
    client.patch("/preferences", json={"trash_policy": "NEVER"}, headers=auth_headers)

    response = client.get("/preferences", headers=auth_headers)

    assert response.json()["trash_policy"] == "NEVER"


def test_update_preference_without_auth_fails(client):
    response = client.patch("/preferences", json={"trash_policy": "15_DAYS"})

    assert response.status_code == 401


def test_unknown_trash_policy_is_rejected(client, auth_headers):
    response = client.patch("/preferences", json={"trash_policy": "FOREVER"}, headers=auth_headers)

    assert response.status_code == 422


def test_unknown_snapshot_policy_is_rejected(client, auth_headers):
    response = client.patch("/preferences", json={"snapshot_policy": "ALWAYS"}, headers=auth_headers)

    assert response.status_code == 422
