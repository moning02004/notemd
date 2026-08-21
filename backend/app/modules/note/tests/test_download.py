import io
import zipfile

from conftest import login, signup


def create_note(client, auth_headers, title="회의록", content="<p>본문 내용</p>"):
    # 노트 저장은 사용자 설정(스냅샷 정책)을 읽는다. 설정 행은 GET /preferences 에서
    # 처음 만들어지므로, 실제 클라이언트와 같은 순서로 한 번 호출해 둔다.
    client.get("/preferences", headers=auth_headers)

    response = client.post("/notes", headers=auth_headers)
    assert response.status_code == 200

    note_hash = response.json()["hash_id"]
    response = client.patch(f"/notes/{note_hash}", headers=auth_headers,
                            json={"title": title, "content": content})
    assert response.status_code == 200
    return note_hash


def download(client, auth_headers, note_hashes, file_format=None):
    payload = {"note_hashes": note_hashes}
    if file_format:
        payload["file_format"] = file_format
    return client.post("/notes/download", headers=auth_headers, json=payload)


def test_download_note_as_markdown_by_default(client, auth_headers):
    note_hash = create_note(client, auth_headers)

    response = download(client, auth_headers, [note_hash])

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/markdown")
    assert "본문 내용" in response.content.decode("utf-8")


def test_download_note_as_pdf(client, auth_headers):
    note_hash = create_note(client, auth_headers, title="한글 제목")

    response = download(client, auth_headers, [note_hash], file_format="pdf")

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content[:5] == b"%PDF-"


def test_download_multiple_notes_as_pdf_zip(client, auth_headers):
    note_hashes = [
        create_note(client, auth_headers, title="첫번째"),
        create_note(client, auth_headers, title="두번째"),
    ]

    response = download(client, auth_headers, note_hashes, file_format="pdf")

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"

    with zipfile.ZipFile(io.BytesIO(response.content)) as zf:
        names = sorted(zf.namelist())
        assert names == ["두번째.pdf", "첫번째.pdf"]
        assert zf.read(names[0])[:5] == b"%PDF-"


def test_download_rejects_unknown_format(client, auth_headers):
    note_hash = create_note(client, auth_headers)

    response = download(client, auth_headers, [note_hash], file_format="docx")

    assert response.status_code == 422


def test_cannot_download_another_users_note(client, auth_headers):
    note_hash = create_note(client, auth_headers)

    signup(client, username="other")
    token = client.post("/auth/obtain-token", json={
        "username": "other",
        "password": "password123!",
    }).json()["access_token"]
    other_headers = {"Authorization": f"Bearer {token}"}

    response = download(client, other_headers, [note_hash])

    assert response.status_code == 404
