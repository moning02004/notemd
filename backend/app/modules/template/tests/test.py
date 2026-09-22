"""템플릿 CRUD 와 소유자 격리."""

from conftest import member_headers

TEMPLATE = {
    "name": "회의록 양식",
    "description": "주간 회의에 쓰는 기본 틀",
    "title": "주간 회의",
    "content": "<h2>안건</h2><ul><li></li></ul>",
}


def create_template(client, headers, **overrides):
    response = client.post("/templates", headers=headers, json={**TEMPLATE, **overrides})
    assert response.status_code == 200, response.text
    return response.json()


def test_created_template_appears_in_the_list(client, auth_headers):
    created = create_template(client, auth_headers)

    response = client.get("/templates", headers=auth_headers)

    assert response.status_code == 200
    assert [template["hash_id"] for template in response.json()] == [created["hash_id"]]


def test_template_keeps_every_field(client, auth_headers):
    template_hash = create_template(client, auth_headers)["hash_id"]

    response = client.get(f"/templates/{template_hash}", headers=auth_headers)

    assert response.status_code == 200
    assert {key: response.json()[key] for key in TEMPLATE} == TEMPLATE


def test_template_can_be_deleted(client, auth_headers):
    template_hash = create_template(client, auth_headers)["hash_id"]

    response = client.delete(f"/templates/{template_hash}", headers=auth_headers)

    assert response.status_code == 200
    assert client.get("/templates", headers=auth_headers).json() == []


def test_list_shows_only_my_templates(client, auth_headers):
    mine = create_template(client, auth_headers, name="내 양식")["hash_id"]

    other = member_headers(client)
    create_template(client, other, name="남의 양식")

    response = client.get("/templates", headers=auth_headers)

    assert [template["hash_id"] for template in response.json()] == [mine]


def test_another_member_cannot_delete_my_template(client, auth_headers):
    template_hash = create_template(client, auth_headers)["hash_id"]
    other = member_headers(client)

    client.delete(f"/templates/{template_hash}", headers=other)

    assert len(client.get("/templates", headers=auth_headers).json()) == 1


def test_templates_require_auth(client):
    assert client.get("/templates").status_code == 401
    assert client.post("/templates", json=TEMPLATE).status_code == 401


def test_creating_a_template_requires_every_field(client, auth_headers):
    response = client.post("/templates", headers=auth_headers, json={"name": "이름만"})

    assert response.status_code == 422


def test_unknown_template_returns_404(client, auth_headers):
    response = client.get("/templates/does-not-exist", headers=auth_headers)

    assert response.status_code == 404


def test_another_members_template_returns_404(client, auth_headers):
    template_hash = create_template(client, auth_headers)["hash_id"]
    other = member_headers(client)

    response = client.get(f"/templates/{template_hash}", headers=other)

    assert response.status_code == 404
