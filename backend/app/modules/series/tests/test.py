"""시리즈: 노트를 골라 순서대로 묶기, 앞·뒤 노트, zip 내보내기."""

import io
import zipfile

import fitz

from conftest import create_note, member_headers


def create_series(client, headers, note_hashes, title="파이썬 입문", description=None):
    payload = {"title": title, "note_hashes": note_hashes}
    if description is not None:
        payload["description"] = description
    response = client.post("/series", headers=headers, json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def three_notes(client, headers):
    return [create_note(client, headers, title=title) for title in ("변수", "함수", "클래스")]


def note_titles(series):
    return [note["title"] for note in series["notes"]]


# --- 만들기 ------------------------------------------------------------------

def test_series_keeps_the_order_the_notes_were_given_in(client, auth_headers):
    first, second, third = three_notes(client, auth_headers)

    series = create_series(client, auth_headers, [third, first, second], description="처음 배우는 사람에게")

    assert series["title"] == "파이썬 입문"
    assert series["description"] == "처음 배우는 사람에게"
    assert series["note_count"] == 3
    assert note_titles(series) == ["클래스", "변수", "함수"]


def test_series_title_is_required(client, auth_headers):
    notes = three_notes(client, auth_headers)

    response = client.post("/series", headers=auth_headers, json={"title": "   ", "note_hashes": notes})

    assert response.status_code == 400


def test_series_description_is_optional(client, auth_headers):
    series = create_series(client, auth_headers, three_notes(client, auth_headers))

    assert series["description"] == ""


def test_series_needs_at_least_one_note(client, auth_headers):
    response = client.post("/series", headers=auth_headers, json={"title": "빈 시리즈", "note_hashes": []})

    assert response.status_code == 400


def test_another_users_note_cannot_be_put_in_my_series(client, auth_headers):
    mine = create_note(client, auth_headers, title="내 노트")
    member = member_headers(client)
    theirs = create_note(client, member, title="남의 노트")

    series = create_series(client, auth_headers, [theirs, mine])

    assert note_titles(series) == ["내 노트"]


# --- 조회 --------------------------------------------------------------------

def test_series_list_shows_note_counts(client, auth_headers):
    notes = three_notes(client, auth_headers)
    create_series(client, auth_headers, notes[:2], title="짧은 것")

    response = client.get("/series", headers=auth_headers)

    assert response.status_code == 200
    assert [(s["title"], s["note_count"]) for s in response.json()] == [("짧은 것", 2)]


def test_series_is_only_visible_to_its_owner(client, auth_headers):
    series = create_series(client, auth_headers, three_notes(client, auth_headers))
    member = member_headers(client)

    assert client.get("/series", headers=member).json() == []
    assert client.get(f"/series/{series['hash_id']}", headers=member).status_code == 404
    assert client.delete(f"/series/{series['hash_id']}", headers=member).status_code == 404


def test_trashed_note_leaves_the_series_and_returns_to_its_place_when_restored(client, auth_headers):
    first, second, third = three_notes(client, auth_headers)
    series = create_series(client, auth_headers, [first, second, third])

    client.delete(f"/notes/{second}", headers=auth_headers)
    assert note_titles(client.get(f"/series/{series['hash_id']}", headers=auth_headers).json()) == ["변수", "클래스"]

    client.patch(f"/notes/{second}/restore", headers=auth_headers)
    assert note_titles(client.get(f"/series/{series['hash_id']}", headers=auth_headers).json()) == [
        "변수", "함수", "클래스"]


def test_permanently_deleted_note_is_gone_from_the_series(client, auth_headers):
    first, second, third = three_notes(client, auth_headers)
    series = create_series(client, auth_headers, [first, second, third])

    client.delete(f"/notes/{second}", headers=auth_headers)
    client.delete(f"/notes/{second}/permanently", headers=auth_headers)

    detail = client.get(f"/series/{series['hash_id']}", headers=auth_headers).json()
    assert note_titles(detail) == ["변수", "클래스"]
    assert detail["note_count"] == 2


# --- 고치기 ------------------------------------------------------------------

def test_series_can_be_renamed_without_touching_its_notes(client, auth_headers):
    series = create_series(client, auth_headers, three_notes(client, auth_headers))

    response = client.patch(f"/series/{series['hash_id']}", headers=auth_headers,
                            json={"title": "파이썬 기초", "description": "고친 설명"})

    assert response.status_code == 200
    assert response.json()["title"] == "파이썬 기초"
    assert response.json()["description"] == "고친 설명"
    assert note_titles(response.json()) == ["변수", "함수", "클래스"]


def test_series_notes_can_be_reordered_and_removed(client, auth_headers):
    first, second, third = three_notes(client, auth_headers)
    series = create_series(client, auth_headers, [first, second, third])

    response = client.patch(f"/series/{series['hash_id']}", headers=auth_headers,
                            json={"note_hashes": [third, first]})

    assert note_titles(response.json()) == ["클래스", "변수"]


def test_deleting_a_series_keeps_its_notes(client, auth_headers):
    notes = three_notes(client, auth_headers)
    series = create_series(client, auth_headers, notes)

    assert client.delete(f"/series/{series['hash_id']}", headers=auth_headers).status_code == 204

    assert client.get("/series", headers=auth_headers).json() == []
    assert len(client.get("/notes", headers=auth_headers).json()) == 3


# --- 노트에서 앞·뒤로 ----------------------------------------------------------

def test_note_knows_its_neighbors_in_the_series(client, auth_headers):
    first, second, third = three_notes(client, auth_headers)
    series = create_series(client, auth_headers, [first, second, third])

    middle = client.get(f"/series/by-note/{second}", headers=auth_headers).json()
    last = client.get(f"/series/by-note/{third}", headers=auth_headers).json()

    assert middle == [{
        "hash_id": series["hash_id"], "title": "파이썬 입문", "position": 2, "total": 3,
        "prev": {"hash_id": first, "title": "변수"},
        "next": {"hash_id": third, "title": "클래스"},
    }]
    assert last[0]["position"] == 3
    assert last[0]["next"] is None


def test_note_outside_any_series_has_no_neighbors(client, auth_headers):
    note = create_note(client, auth_headers, title="혼자인 노트")

    assert client.get(f"/series/by-note/{note}", headers=auth_headers).json() == []


def test_neighbors_skip_a_trashed_note(client, auth_headers):
    first, second, third = three_notes(client, auth_headers)
    create_series(client, auth_headers, [first, second, third])

    client.delete(f"/notes/{second}", headers=auth_headers)

    assert client.get(f"/series/by-note/{first}", headers=auth_headers).json()[0]["next"]["hash_id"] == third


# --- 내보내기 -----------------------------------------------------------------

def download(client, headers, series_hash, file_format=None):
    return client.post(f"/series/{series_hash}/download", headers=headers,
                       json={"file_format": file_format} if file_format else None)


def pdf_pages(content: bytes) -> list[str]:
    with fitz.open(stream=content, filetype="pdf") as document:
        return [page.get_text() for page in document]


def test_series_downloads_as_one_pdf_named_after_it(client, auth_headers):
    first, second, third = three_notes(client, auth_headers)
    series = create_series(client, auth_headers, [third, first, second], title="파이썬 입문",
                           description="처음 배우는 사람에게")

    response = download(client, auth_headers, series["hash_id"])

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert "%ED%8C%8C%EC%9D%B4%EC%8D%AC%20%EC%9E%85%EB%AC%B8.pdf" in response.headers["content-disposition"]
    assert response.content.startswith(b"%PDF")


def test_series_pdf_starts_each_note_on_its_own_page_after_a_contents_page(client, auth_headers):
    first, second, third = three_notes(client, auth_headers)
    series = create_series(client, auth_headers, [third, first, second], title="파이썬 입문",
                           description="처음 배우는 사람에게")

    pages = pdf_pages(download(client, auth_headers, series["hash_id"]).content)

    assert len(pages) == 4
    # 첫 쪽: 시리즈 제목·설명과 차례.
    for text in ("파이썬 입문", "처음 배우는 사람에게", "1. 클래스", "2. 변수", "3. 함수"):
        assert text in pages[0]
    assert "본문 내용" not in pages[0]
    # 그 뒤로 노트가 시리즈 순서대로 한 쪽씩.
    for page, heading in zip(pages[1:], ("1. 클래스", "2. 변수", "3. 함수")):
        assert heading in page
        assert "본문 내용" in page


def test_series_pdf_has_a_bookmark_for_each_note(client, auth_headers):
    series = create_series(client, auth_headers, three_notes(client, auth_headers))

    with fitz.open(stream=download(client, auth_headers, series["hash_id"]).content, filetype="pdf") as document:
        outline = [(level, title, page) for level, title, page in document.get_toc()]

    assert outline == [(1, "1. 변수", 2), (1, "2. 함수", 3), (1, "3. 클래스", 4)]


def test_series_downloads_as_a_zip_of_numbered_files_in_markdown(client, auth_headers):
    notes = three_notes(client, auth_headers)
    series = create_series(client, auth_headers, notes)

    response = download(client, auth_headers, series["hash_id"], file_format="md")

    assert response.headers["content-type"] == "application/zip"
    with zipfile.ZipFile(io.BytesIO(response.content)) as zf:
        assert zf.namelist() == ["1. 변수.md", "2. 함수.md", "3. 클래스.md"]
        assert "본문 내용" in zf.read("1. 변수.md").decode("utf-8")


def test_untitled_note_and_unsafe_characters_in_file_names(client, auth_headers):
    untitled = create_note(client, auth_headers, title="")
    slashed = create_note(client, auth_headers, title="9/25 회의")
    series = create_series(client, auth_headers, [untitled, slashed], title="회의: 가을")

    response = download(client, auth_headers, series["hash_id"], file_format="md")

    with zipfile.ZipFile(io.BytesIO(response.content)) as zf:
        assert zf.namelist() == ["1. 제목없음.md", "2. 9／25 회의.md"]
    assert "%ED%9A%8C%EC%9D%98%EF%BC%9A%20%EA%B0%80%EC%9D%84.zip" in response.headers["content-disposition"]


def test_ten_or_more_notes_are_zero_padded_so_files_sort_in_order(client, auth_headers):
    notes = [create_note(client, auth_headers, title=f"{n}장") for n in range(1, 11)]
    series = create_series(client, auth_headers, notes)

    response = download(client, auth_headers, series["hash_id"], file_format="md")

    with zipfile.ZipFile(io.BytesIO(response.content)) as zf:
        assert zf.namelist()[0] == "01. 1장.md"
        assert zf.namelist()[-1] == "10. 10장.md"
