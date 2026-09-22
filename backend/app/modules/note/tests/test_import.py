"""파일 업로드로 노트 만들기 (마크다운 / 코드 / 그 외 텍스트)."""

from conftest import ensure_preference


def upload(client, headers, files):
    return client.post("/notes/files", headers=headers, files=files)


def only_note(client, headers):
    notes = client.get("/notes", headers=headers).json()
    assert len(notes) == 1, notes
    return notes[0]


def test_markdown_file_becomes_a_note(client, auth_headers):
    ensure_preference(client, auth_headers)

    response = upload(client, auth_headers, [("files", ("회의록.md", b"# \xec\x95\x88\xea\xb1\xb4\n\n\xeb\xb3\xb8\xeb\xac\xb8", "text/markdown"))])

    assert response.status_code == 200
    note = only_note(client, auth_headers)
    assert "회의록.md" in note["title"]
    assert "업로드" in note["title"]
    assert "안건" in note["content"]


def test_code_file_is_wrapped_in_a_code_block(client, auth_headers):
    ensure_preference(client, auth_headers)

    upload(client, auth_headers, [("files", ("deploy.py", b"print('hello')\n", "text/x-python"))])

    note = only_note(client, auth_headers)
    assert "print" in note["content"]
    assert "hello" in note["content"]


def test_several_files_become_several_notes(client, auth_headers):
    ensure_preference(client, auth_headers)

    upload(client, auth_headers, [
        ("files", ("first.md", b"# first", "text/markdown")),
        ("files", ("second.md", b"# second", "text/markdown")),
    ])

    titles = [note["title"] for note in client.get("/notes", headers=auth_headers).json()]
    assert len(titles) == 2
    assert any("first.md" in title for title in titles)
    assert any("second.md" in title for title in titles)


def test_uploaded_note_is_searchable(client, auth_headers, search_index):
    ensure_preference(client, auth_headers)

    upload(client, auth_headers, [("files", ("notes.md", "배포 절차".encode(), "text/markdown"))])

    indexed = list(search_index.documents.values())
    assert len(indexed) == 1
    assert "배포 절차" in indexed[0]["content"]


def test_upload_requires_auth(client):
    response = client.post("/notes/files", files=[("files", ("a.md", b"# a", "text/markdown"))])

    assert response.status_code == 401
