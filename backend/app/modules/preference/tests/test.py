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