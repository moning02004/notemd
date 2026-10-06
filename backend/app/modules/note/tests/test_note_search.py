"""노트 검색: 폴더·태그를 가리지 않고 전체에서, 잘 맞는 순서대로, 한 쪽씩."""
from conftest import create_note


def search(client, headers, keyword, **params):
    response = client.get("/notes", headers=headers, params={"keyword": keyword, **params})
    assert response.status_code == 200, response.text
    return response.json()


def test_search_keeps_the_order_the_engine_ranked(client, auth_headers, search_index):
    first = create_note(client, auth_headers, title="회의록 하나")
    second = create_note(client, auth_headers, title="회의록 둘")
    third = create_note(client, auth_headers, title="회의록 셋")
    # 엔진이 매긴 순서(대역은 색인에 넣은 순서)를 DB 의 순서와 다르게 만든다.
    documents = dict(search_index.documents)
    search_index.documents.clear()
    for note in (third, first, second):
        search_index.documents[note] = documents[note]

    assert [note["hash_id"] for note in search(client, auth_headers, "회의록")] == [third, first, second]


def test_search_is_paged(client, auth_headers):
    notes = [create_note(client, auth_headers, title=f"회의록 {n}") for n in range(23)]

    assert len(search(client, auth_headers, "회의록")) == 20
    second_page = search(client, auth_headers, "회의록", page=2)
    assert [note["hash_id"] for note in second_page] == notes[20:]


def test_trashed_notes_do_not_take_up_room_in_a_page(client, auth_headers):
    notes = [create_note(client, auth_headers, title=f"회의록 {n}") for n in range(22)]
    client.delete(f"/notes/{notes[0]}", headers=auth_headers)
    client.delete(f"/notes/{notes[1]}", headers=auth_headers)

    assert [note["hash_id"] for note in search(client, auth_headers, "회의록")] == notes[2:]


def make_folder(client, headers, name, parent=None):
    response = client.post("/folders", headers=headers, json={"name": name, "parent": parent})
    assert response.status_code == 201, response.text
    return response.json()["hash_id"]


def test_search_looks_everywhere_by_default_and_never_at_tags(client, auth_headers):
    """폴더를 주지 않으면 전체에서 찾는다. 고른 태그로는 좁히지 않는다."""
    folder = make_folder(client, auth_headers, "업무")
    inside = create_note(client, auth_headers, title="회의록 안", folder=folder, tags=["업무"])
    outside = create_note(client, auth_headers, title="회의록 밖")

    found = search(client, auth_headers, "회의록", tag="업무")

    assert sorted(note["hash_id"] for note in found) == sorted([inside, outside])


def test_search_can_be_narrowed_to_a_folder_and_its_subfolders(client, auth_headers):
    work = make_folder(client, auth_headers, "업무")
    meetings = make_folder(client, auth_headers, "회의", parent=work)
    home = make_folder(client, auth_headers, "집")
    in_work = create_note(client, auth_headers, title="회의록 업무", folder=work)
    in_meetings = create_note(client, auth_headers, title="회의록 하위", folder=meetings)
    create_note(client, auth_headers, title="회의록 집", folder=home)
    create_note(client, auth_headers, title="회의록 폴더 밖")

    in_scope = search(client, auth_headers, "회의록", folder=work)
    deeper = search(client, auth_headers, "회의록", folder=meetings)

    assert sorted(note["hash_id"] for note in in_scope) == sorted([in_work, in_meetings])
    assert [note["hash_id"] for note in deeper] == [in_meetings]


def test_search_follows_a_note_moved_to_another_folder(client, auth_headers):
    work = make_folder(client, auth_headers, "업무")
    home = make_folder(client, auth_headers, "집")
    note = create_note(client, auth_headers, title="회의록", folder=work)

    client.patch("/folders/notes", headers=auth_headers, json={"note_hashes": [note], "folder": home})

    assert search(client, auth_headers, "회의록", folder=work) == []
    assert [found["hash_id"] for found in search(client, auth_headers, "회의록", folder=home)] == [note]


def test_search_in_an_unknown_folder_finds_nothing(client, auth_headers):
    create_note(client, auth_headers, title="회의록")

    assert search(client, auth_headers, "회의록", folder="no-such-folder") == []
