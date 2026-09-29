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


def test_blank_lines_in_markdown_become_empty_lines_in_the_note(client, auth_headers):
    # 글 줄 사이의 빈 줄 k 개는 비운 줄 k 개다. 연달은 빈 줄이 하나로 합쳐지면 안 된다.
    ensure_preference(client, auth_headers)
    upload(client, auth_headers, [("files", ("줄.md", "위\n\n\n아래".encode(), "text/markdown"))])

    note_hash = only_note(client, auth_headers)["hash_id"]
    content = client.get(f"/notes/{note_hash}", headers=auth_headers).json()["content"]
    assert content.replace("\n", "") == "<p>위</p><p></p><p></p><p>아래</p>"


def test_code_blocks_and_tables_are_imported_as_they_are(client, auth_headers):
    ensure_preference(client, auth_headers)
    text = "앞\n\n```\nx\n\n\ny\n```\n\n| 머리 |\n| --- |\n| 칸 |\n"
    upload(client, auth_headers, [("files", ("블록.md", text.encode(), "text/markdown"))])

    note_hash = only_note(client, auth_headers)["hash_id"]
    content = client.get(f"/notes/{note_hash}", headers=auth_headers).json()["content"]
    assert "<pre><code>x\n\n\ny\n</code></pre>" in content
    assert "<table>" in content and "<td>칸</td>" in content
    assert "<p></p>" not in content


def test_exported_markdown_comes_back_with_the_same_blank_lines():
    from app.core.markdown_renderer import html_to_markdown, markdown_to_html

    original = ("<h2>제목</h2><p></p><p>본문</p><p></p><p></p><p>다음</p>"
                "<ul><li>항목</li></ul><p></p><p>뒤</p><pre><code>x\n\n\ny\n</code></pre><p></p><p>끝</p>")
    back = markdown_to_html(html_to_markdown(original))

    assert back.replace("\n", "") == original.replace("\n", "")


def test_break_blank_line_does_not_split_the_paragraph():
    from app.core.markdown_renderer import html_to_markdown, markdown_to_html

    back = markdown_to_html(html_to_markdown("<p>한 줄<br><br>비우고</p>"))

    assert back.count("<p>") == 1
    assert back.count("<br />") == 2


def test_task_lists_are_imported_as_task_lists():
    from app.core.markdown_renderer import markdown_to_html

    html = markdown_to_html("- [x] 한 일\n- [ ] 할 일\n    - [ ] 안쪽\n")

    assert html.count('<ul data-type="taskList">') == 2
    assert '<li data-checked="true" data-type="taskItem"><p>한 일</p></li>' in html
    assert '<li data-checked="false" data-type="taskItem"><p>안쪽</p></li>' in html
    assert "[x]" not in html and "[ ]" not in html


def test_mixed_list_is_left_as_an_ordinary_list():
    from app.core.markdown_renderer import markdown_to_html

    html = markdown_to_html("- [x] 한 일\n- 그냥 항목\n")

    assert "taskList" not in html


def test_details_are_imported_as_collapsible_blocks():
    from app.core.markdown_renderer import markdown_to_html

    html = markdown_to_html("<details open>\n<summary>제목</summary>\n\n본문  \n둘째 줄\n\n- 항목\n\n</details>\n\n"
                            "<details>\n<summary>제목만</summary>\n</details>\n")

    assert '<details open=""><summary>제목</summary><div data-type="detailsContent">' in html
    assert "<p>본문<br/>\n둘째 줄</p>" in html and "<li>항목</li>" in html
    # 본문 없는 접기는 에디터처럼 빈 문단 하나를 둔다(스키마상 본문이 비어 있을 수 없다).
    assert '<details><summary>제목만</summary><div data-type="detailsContent"><p></p></div></details>' in html


def test_task_lists_and_details_survive_a_round_trip():
    import re
    from app.core.markdown_renderer import html_to_markdown, markdown_to_html

    original = ('<details class="details"><summary>할 일 묶음</summary><div data-type="detailsContent">'
                '<ul data-type="taskList"><li data-checked="true" data-type="taskItem"><label><input type="checkbox" '
                'checked="checked"><span></span></label><div><p>끝낸 일</p></div></li></ul></div></details>')
    back = markdown_to_html(html_to_markdown(original))

    assert re.sub(r"\s+", "", back) == ('<details><summary>할일묶음</summary><divdata-type="detailsContent">'
                                        '<uldata-type="taskList"><lidata-checked="true"data-type="taskItem">'
                                        '<p>끝낸일</p></li></ul></div></details>')
