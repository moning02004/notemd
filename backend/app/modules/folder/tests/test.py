"""폴더 트리 CRUD, 노트 이동, 폴더 삭제 시 노트 처리."""

from conftest import create_note, member_headers


def create_folder(client, headers, name="프로젝트", parent=None):
    payload = {"name": name}
    if parent:
        payload["parent"] = parent
    response = client.post("/folders", headers=headers, json=payload)
    assert response.status_code == 201, response.text
    return response.json()["hash_id"]


def tree(client, headers):
    response = client.get("/folders", headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


def flatten(nodes, out=None):
    out = [] if out is None else out
    for node in nodes:
        out.append(node)
        flatten(node["children"], out)
    return out


def node_by_name(client, headers, name):
    return next(n for n in flatten(tree(client, headers)["folders"]) if n["name"] == name)


def list_notes(client, headers, **params):
    response = client.get("/notes", headers=headers, params=params)
    assert response.status_code == 200, response.text
    return response.json()


def move(client, headers, note_hashes, folder=None):
    return client.patch("/folders/notes", headers=headers,
                        json={"note_hashes": note_hashes, "folder": folder})


# --- 트리 만들기 --------------------------------------------------------------

def test_new_account_starts_with_an_empty_tree(client, auth_headers):
    assert tree(client, auth_headers) == {"folders": [], "unfiled_count": 0}


def test_created_folder_appears_at_the_root(client, auth_headers):
    create_folder(client, auth_headers, name="프로젝트")

    folders = tree(client, auth_headers)["folders"]

    assert [f["name"] for f in folders] == ["프로젝트"]
    assert folders[0]["parent_hash"] is None
    assert folders[0]["depth"] == 0
    assert folders[0]["path"] == "프로젝트"


def test_child_folder_is_nested_under_its_parent(client, auth_headers):
    parent = create_folder(client, auth_headers, name="프로젝트")
    create_folder(client, auth_headers, name="notemd", parent=parent)

    root = tree(client, auth_headers)["folders"][0]

    assert [c["name"] for c in root["children"]] == ["notemd"]
    assert root["children"][0]["depth"] == 1
    assert root["children"][0]["path"] == "프로젝트 / notemd"


def test_folder_name_is_required(client, auth_headers):
    assert client.post("/folders", headers=auth_headers, json={"name": "   "}).status_code == 400


def test_tree_is_limited_to_three_levels(client, auth_headers):
    first = create_folder(client, auth_headers, name="1단계")
    second = create_folder(client, auth_headers, name="2단계", parent=first)
    third = create_folder(client, auth_headers, name="3단계", parent=second)

    response = client.post("/folders", headers=auth_headers, json={"name": "4단계", "parent": third})

    assert response.status_code == 400
    assert "3단계" in response.json()["detail"]


def test_folder_can_be_renamed(client, auth_headers):
    folder = create_folder(client, auth_headers, name="프로젝트")

    response = client.patch(f"/folders/{folder}", headers=auth_headers, json={"name": "작업"})

    assert response.status_code == 200
    assert [f["name"] for f in tree(client, auth_headers)["folders"]] == ["작업"]


def test_folder_can_be_moved_under_another(client, auth_headers):
    target = create_folder(client, auth_headers, name="프로젝트")
    moving = create_folder(client, auth_headers, name="notemd")

    response = client.patch(f"/folders/{moving}", headers=auth_headers, json={"parent": target})

    assert response.status_code == 200
    root = tree(client, auth_headers)["folders"][0]
    assert root["name"] == "프로젝트"
    assert [c["name"] for c in root["children"]] == ["notemd"]


def test_folder_can_be_moved_back_to_the_root(client, auth_headers):
    parent = create_folder(client, auth_headers, name="프로젝트")
    child = create_folder(client, auth_headers, name="notemd", parent=parent)

    client.patch(f"/folders/{child}", headers=auth_headers, json={"parent": None})

    assert sorted(f["name"] for f in tree(client, auth_headers)["folders"]) == ["notemd", "프로젝트"]


def test_folder_cannot_be_moved_into_its_own_descendant(client, auth_headers):
    parent = create_folder(client, auth_headers, name="프로젝트")
    child = create_folder(client, auth_headers, name="notemd", parent=parent)

    response = client.patch(f"/folders/{parent}", headers=auth_headers, json={"parent": child})

    assert response.status_code == 400


def test_folder_cannot_be_moved_into_itself(client, auth_headers):
    folder = create_folder(client, auth_headers, name="프로젝트")

    assert client.patch(f"/folders/{folder}", headers=auth_headers, json={"parent": folder}).status_code == 400


def test_moving_a_subtree_still_respects_the_depth_limit(client, auth_headers):
    parent = create_folder(client, auth_headers, name="1단계")
    child = create_folder(client, auth_headers, name="2단계", parent=parent)

    branch = create_folder(client, auth_headers, name="가지")
    create_folder(client, auth_headers, name="가지의 자식", parent=branch)

    # 가지(높이 1)를 2단계 아래로 넣으면 손자가 4단계가 된다.
    response = client.patch(f"/folders/{branch}", headers=auth_headers, json={"parent": child})

    assert response.status_code == 400


# --- 개수 --------------------------------------------------------------------

def test_counts_separate_direct_and_total(client, auth_headers):
    parent = create_folder(client, auth_headers, name="프로젝트")
    child = create_folder(client, auth_headers, name="notemd", parent=parent)

    create_note(client, auth_headers, title="부모 노트", folder=parent)
    create_note(client, auth_headers, title="자식 노트 1", folder=child)
    create_note(client, auth_headers, title="자식 노트 2", folder=child)

    root = tree(client, auth_headers)["folders"][0]

    assert root["note_count"] == 1
    assert root["total_count"] == 3
    assert root["children"][0]["note_count"] == 2


def test_trashed_notes_are_not_counted(client, auth_headers):
    folder = create_folder(client, auth_headers, name="프로젝트")
    kept = create_note(client, auth_headers, title="남는 노트", folder=folder)
    trashed = create_note(client, auth_headers, title="버릴 노트", folder=folder)

    client.delete(f"/notes/{trashed}", headers=auth_headers)

    assert node_by_name(client, auth_headers, "프로젝트")["note_count"] == 1
    assert kept


def test_unfiled_count_covers_notes_without_a_folder(client, auth_headers):
    create_note(client, auth_headers, title="정리 안 된 노트")
    create_note(client, auth_headers, title="정리 안 된 노트 2")

    assert tree(client, auth_headers)["unfiled_count"] == 2


# --- 노트 이동 ----------------------------------------------------------------

def test_note_can_be_moved_into_a_folder(client, auth_headers):
    folder = create_folder(client, auth_headers, name="프로젝트")
    note_hash = create_note(client, auth_headers, title="옮길 노트")

    response = move(client, auth_headers, [note_hash], folder)

    assert response.status_code == 200
    assert response.json() == [note_hash]
    assert [n["title"] for n in list_notes(client, auth_headers, folder=folder)] == ["옮길 노트"]


def test_several_notes_move_at_once(client, auth_headers):
    folder = create_folder(client, auth_headers, name="프로젝트")
    hashes = [create_note(client, auth_headers, title="첫번째"),
              create_note(client, auth_headers, title="두번째")]

    move(client, auth_headers, hashes, folder)

    assert len(list_notes(client, auth_headers, folder=folder)) == 2
    assert tree(client, auth_headers)["unfiled_count"] == 0


def test_note_can_be_moved_back_to_unfiled(client, auth_headers):
    folder = create_folder(client, auth_headers, name="프로젝트")
    note_hash = create_note(client, auth_headers, title="옮길 노트", folder=folder)

    move(client, auth_headers, [note_hash], None)

    assert list_notes(client, auth_headers, folder=folder) == []
    assert tree(client, auth_headers)["unfiled_count"] == 1


def test_note_detail_and_list_carry_the_folder(client, auth_headers):
    folder = create_folder(client, auth_headers, name="프로젝트")
    note_hash = create_note(client, auth_headers, title="노트", folder=folder)

    detail = client.get(f"/notes/{note_hash}", headers=auth_headers).json()
    listed = list_notes(client, auth_headers, folder=folder)[0]

    assert detail["folder"] == {"hashId": folder, "name": "프로젝트"}
    assert listed["folder"]["name"] == "프로젝트"


def test_note_folder_can_be_changed_through_note_patch(client, auth_headers):
    first = create_folder(client, auth_headers, name="프로젝트")
    second = create_folder(client, auth_headers, name="회고")
    note_hash = create_note(client, auth_headers, title="노트", folder=first)

    client.patch(f"/notes/{note_hash}", headers=auth_headers, json={"folder": second})

    assert client.get(f"/notes/{note_hash}", headers=auth_headers).json()["folder"]["name"] == "회고"


def test_note_patch_without_folder_key_keeps_the_folder(client, auth_headers):
    folder = create_folder(client, auth_headers, name="프로젝트")
    note_hash = create_note(client, auth_headers, title="노트", folder=folder)

    client.patch(f"/notes/{note_hash}", headers=auth_headers, json={"title": "제목만 수정"})

    assert client.get(f"/notes/{note_hash}", headers=auth_headers).json()["folder"]["name"] == "프로젝트"


def test_new_note_starts_in_the_folder_it_was_created_from(client, auth_headers):
    folder = create_folder(client, auth_headers, name="프로젝트")
    client.get("/preferences", headers=auth_headers)

    note_hash = client.post("/notes", headers=auth_headers, json={"folder": folder}).json()["hash_id"]

    assert client.get(f"/notes/{note_hash}", headers=auth_headers).json()["folder"]["name"] == "프로젝트"


# --- 목록 필터 ----------------------------------------------------------------

def test_folder_filter_excludes_subfolders_by_default(client, auth_headers):
    parent = create_folder(client, auth_headers, name="프로젝트")
    child = create_folder(client, auth_headers, name="notemd", parent=parent)
    create_note(client, auth_headers, title="부모 노트", folder=parent)
    create_note(client, auth_headers, title="자식 노트", folder=child)

    assert [n["title"] for n in list_notes(client, auth_headers, folder=parent)] == ["부모 노트"]


def test_include_sub_pulls_in_descendant_notes(client, auth_headers):
    parent = create_folder(client, auth_headers, name="프로젝트")
    child = create_folder(client, auth_headers, name="notemd", parent=parent)
    create_note(client, auth_headers, title="부모 노트", folder=parent)
    create_note(client, auth_headers, title="자식 노트", folder=child)

    titles = [n["title"] for n in list_notes(client, auth_headers, folder=parent, include_sub=1)]

    assert sorted(titles) == ["부모 노트", "자식 노트"]


def test_unfiled_filter_shows_only_notes_without_a_folder(client, auth_headers):
    folder = create_folder(client, auth_headers, name="프로젝트")
    create_note(client, auth_headers, title="정리된 노트", folder=folder)
    create_note(client, auth_headers, title="정리 안 된 노트")

    assert [n["title"] for n in list_notes(client, auth_headers, unfiled=1)] == ["정리 안 된 노트"]


def test_folder_filter_never_shows_trashed_notes(client, auth_headers):
    folder = create_folder(client, auth_headers, name="프로젝트")
    note_hash = create_note(client, auth_headers, title="버릴 노트", folder=folder)

    client.delete(f"/notes/{note_hash}", headers=auth_headers)

    assert list_notes(client, auth_headers, folder=folder) == []


# --- 삭제 --------------------------------------------------------------------

def test_deleting_a_folder_sends_its_notes_to_the_trash(client, auth_headers):
    folder = create_folder(client, auth_headers, name="프로젝트")
    note_hash = create_note(client, auth_headers, title="안에 있던 노트", folder=folder)

    response = client.delete(f"/folders/{folder}", headers=auth_headers)

    assert response.status_code == 200
    assert response.json() == {"trashed_note_count": 1}
    assert tree(client, auth_headers)["folders"] == []
    assert [n["title"] for n in list_notes(client, auth_headers, is_deleted=1)] == ["안에 있던 노트"]
    assert note_hash


def test_deleting_a_folder_takes_its_subfolders_with_it(client, auth_headers):
    parent = create_folder(client, auth_headers, name="프로젝트")
    child = create_folder(client, auth_headers, name="notemd", parent=parent)
    create_note(client, auth_headers, title="자식 노트", folder=child)

    response = client.delete(f"/folders/{parent}", headers=auth_headers)

    assert response.json() == {"trashed_note_count": 1}
    assert tree(client, auth_headers)["folders"] == []


def test_restoring_a_note_whose_folder_is_gone_puts_it_in_unfiled(client, auth_headers):
    folder = create_folder(client, auth_headers, name="프로젝트")
    note_hash = create_note(client, auth_headers, title="안에 있던 노트", folder=folder)

    client.delete(f"/folders/{folder}", headers=auth_headers)
    client.patch(f"/notes/{note_hash}/restore", headers=auth_headers)

    assert client.get(f"/notes/{note_hash}", headers=auth_headers).json()["folder"] is None
    assert tree(client, auth_headers)["unfiled_count"] == 1


def test_trashed_note_is_marked_deleted_in_the_search_index(client, auth_headers, search_index):
    folder = create_folder(client, auth_headers, name="프로젝트")
    note_hash = create_note(client, auth_headers, title="안에 있던 노트", folder=folder)

    client.delete(f"/folders/{folder}", headers=auth_headers)

    assert search_index.documents[note_hash]["is_deleted"] is True


# --- 소유자 격리 --------------------------------------------------------------

def test_another_members_folders_are_not_listed(client, auth_headers):
    create_folder(client, auth_headers, name="내 폴더")
    other = member_headers(client)

    assert tree(client, other)["folders"] == []


def test_another_member_cannot_rename_my_folder(client, auth_headers):
    folder = create_folder(client, auth_headers, name="내 폴더")
    other = member_headers(client)

    assert client.patch(f"/folders/{folder}", headers=other, json={"name": "가로채기"}).status_code == 404
    assert node_by_name(client, auth_headers, "내 폴더")


def test_another_member_cannot_delete_my_folder(client, auth_headers):
    folder = create_folder(client, auth_headers, name="내 폴더")
    other = member_headers(client)

    assert client.delete(f"/folders/{folder}", headers=other).status_code == 404
    assert len(tree(client, auth_headers)["folders"]) == 1


def test_notes_cannot_be_moved_into_another_members_folder(client, auth_headers):
    other = member_headers(client)
    stranger_folder = create_folder(client, other, name="남의 폴더")
    note_hash = create_note(client, auth_headers, title="내 노트")

    assert move(client, auth_headers, [note_hash], stranger_folder).status_code == 404
    assert tree(client, auth_headers)["unfiled_count"] == 1


def test_unknown_folder_returns_404(client, auth_headers):
    assert client.patch("/folders/does-not-exist", headers=auth_headers,
                        json={"name": "x"}).status_code == 404
    assert client.delete("/folders/does-not-exist", headers=auth_headers).status_code == 404


def test_folders_require_auth(client):
    assert client.get("/folders").status_code == 401
    assert client.post("/folders", json={"name": "x"}).status_code == 401


# --- 태그로 폴더 만들기 -------------------------------------------------------

def from_tags(client, headers, keywords):
    return client.post("/folders/from-tags", headers=headers, json={"keywords": keywords})


def test_tags_become_folders_and_swallow_their_notes(client, auth_headers):
    create_note(client, auth_headers, title="회의록", tags=["회의"])
    create_note(client, auth_headers, title="레시피", tags=["요리"])

    response = from_tags(client, auth_headers, ["회의", "요리"])

    assert response.status_code == 200
    assert response.json() == {"created_folder_count": 2, "moved_note_count": 2}
    assert sorted(f["name"] for f in tree(client, auth_headers)["folders"]) == ["요리", "회의"]
    assert tree(client, auth_headers)["unfiled_count"] == 0


def test_note_with_several_tags_goes_to_the_most_used_one(client, auth_headers):
    # '회의' 는 노트 2개, '2026' 은 1개 -> 둘 다 달린 노트는 '회의' 로 간다.
    create_note(client, auth_headers, title="주간 회의", tags=["회의", "2026"])
    create_note(client, auth_headers, title="월간 회의", tags=["회의"])

    from_tags(client, auth_headers, ["회의", "2026"])

    meeting = node_by_name(client, auth_headers, "회의")
    yearly = node_by_name(client, auth_headers, "2026")
    assert meeting["note_count"] == 2
    assert yearly["note_count"] == 0


def test_notes_without_the_chosen_tags_stay_unfiled(client, auth_headers):
    create_note(client, auth_headers, title="회의록", tags=["회의"])
    create_note(client, auth_headers, title="아무 태그 없는 노트")

    from_tags(client, auth_headers, ["회의"])

    assert tree(client, auth_headers)["unfiled_count"] == 1


def test_notes_already_in_a_folder_are_left_alone(client, auth_headers):
    folder = create_folder(client, auth_headers, name="기존 폴더")
    create_note(client, auth_headers, title="이미 정리된 노트", tags=["회의"], folder=folder)

    response = from_tags(client, auth_headers, ["회의"])

    assert response.json()["moved_note_count"] == 0
    assert node_by_name(client, auth_headers, "기존 폴더")["note_count"] == 1


def test_existing_folder_with_the_same_name_is_reused(client, auth_headers):
    create_folder(client, auth_headers, name="회의")
    create_note(client, auth_headers, title="회의록", tags=["회의"])

    response = from_tags(client, auth_headers, ["회의"])

    assert response.json() == {"created_folder_count": 0, "moved_note_count": 1}
    assert len(tree(client, auth_headers)["folders"]) == 1


def test_trashed_notes_are_not_pulled_into_folders(client, auth_headers):
    note_hash = create_note(client, auth_headers, title="버린 회의록", tags=["회의"])
    client.delete(f"/notes/{note_hash}", headers=auth_headers)

    response = from_tags(client, auth_headers, ["회의"])

    assert response.json()["moved_note_count"] == 0


def test_from_tags_requires_at_least_one_keyword(client, auth_headers):
    assert from_tags(client, auth_headers, []).status_code == 400
    assert from_tags(client, auth_headers, ["  "]).status_code == 400


def test_folders_are_sorted_in_korean_alphabetical_order(client, auth_headers):
    """DB 콜레이션에 맡기면 배포마다 순서가 달라진다. 가나다순이 보장돼야 한다."""
    for name in ["회고", "레시피", "개인", "프로젝트", "업무"]:
        create_folder(client, auth_headers, name=name)

    names = [folder["name"] for folder in tree(client, auth_headers)["folders"]]

    assert names == ["개인", "레시피", "업무", "프로젝트", "회고"]


def test_subfolders_are_sorted_too(client, auth_headers):
    parent = create_folder(client, auth_headers, name="프로젝트")
    for name in ["하늘", "가람", "나무"]:
        create_folder(client, auth_headers, name=name, parent=parent)

    children = tree(client, auth_headers)["folders"][0]["children"]

    assert [child["name"] for child in children] == ["가람", "나무", "하늘"]
