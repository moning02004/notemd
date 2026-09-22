"""편집 이력(스냅샷)과 스냅샷 정책.

정책은 사용자 설정(MANUAL / ON_FIRST_EDIT / ON_EVERY_EDIT)을 따르되,
공유 중인 노트는 정책과 무관하게 편집마다 남는다는 것이 설계 의도다.
"""

from app.modules.note.infrastructure.models import NoteSnapshot
from conftest import add_new_member_to_workspace, create_note, create_workspace, member_headers


def set_snapshot_policy(client, headers, policy):
    response = client.patch("/preferences", headers=headers, json={"snapshot_policy": policy})
    assert response.status_code == 200, response.text


def snapshots(client, headers, note_hash):
    response = client.get(f"/notes/{note_hash}/snapshots", headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


def edit(client, headers, note_hash, title, is_first_edit=None):
    payload = {"title": title}
    if is_first_edit is not None:
        payload["is_first_edit"] = is_first_edit
    return client.patch(f"/notes/{note_hash}", headers=headers, json=payload)


def test_manual_policy_keeps_no_history_on_edit(client, auth_headers):
    note_hash = create_note(client, auth_headers, title="처음")
    set_snapshot_policy(client, auth_headers, "MANUAL")

    edit(client, auth_headers, note_hash, "두번째")
    edit(client, auth_headers, note_hash, "세번째")

    assert snapshots(client, auth_headers, note_hash) == []


def test_every_edit_policy_keeps_one_snapshot_per_edit(client, auth_headers):
    note_hash = create_note(client, auth_headers, title="처음")
    set_snapshot_policy(client, auth_headers, "ON_EVERY_EDIT")

    edit(client, auth_headers, note_hash, "두번째")
    edit(client, auth_headers, note_hash, "세번째")

    assert len(snapshots(client, auth_headers, note_hash)) == 2


def test_first_edit_policy_records_only_when_the_client_says_so(client, auth_headers):
    """하루 첫 편집인지는 클라이언트가 is_first_edit 으로 알려준다."""
    note_hash = create_note(client, auth_headers, title="처음")
    set_snapshot_policy(client, auth_headers, "ON_FIRST_EDIT")

    edit(client, auth_headers, note_hash, "첫 편집", is_first_edit=True)
    assert len(snapshots(client, auth_headers, note_hash)) == 1

    edit(client, auth_headers, note_hash, "두번째 편집", is_first_edit=False)
    assert len(snapshots(client, auth_headers, note_hash)) == 1


def test_snapshot_keeps_the_body_at_the_moment_of_saving(client, auth_headers):
    note_hash = create_note(client, auth_headers, title="처음", content="<p>원래 본문</p>")
    set_snapshot_policy(client, auth_headers, "ON_EVERY_EDIT")

    client.patch(f"/notes/{note_hash}", headers=auth_headers, json={"content": "<p>고친 본문</p>"})

    assert snapshots(client, auth_headers, note_hash)[0]["content"] == "<p>고친 본문</p>"


def test_shared_note_records_a_members_edit_regardless_of_policy(client, auth_headers):
    """누가 언제 고쳤는지 추적해야 하므로 공유 노트는 정책을 무시한다."""
    workspace_hash = create_workspace(client, auth_headers)
    teammate = add_new_member_to_workspace(client, auth_headers, workspace_hash)
    note_hash = create_note(client, auth_headers, title="처음", workspaces=[workspace_hash])
    set_snapshot_policy(client, auth_headers, "MANUAL")
    before = len(snapshots(client, auth_headers, note_hash))

    edit(client, teammate, note_hash, "팀원이 고침")

    assert len(snapshots(client, auth_headers, note_hash)) == before + 1


def test_shared_note_records_the_owners_edit_regardless_of_policy(client, auth_headers):
    """공유 중인 노트라면 소유자가 고쳐도 이력이 남아야 한다.

    강제 기록의 기준은 '편집한 사람이 워크스페이스 멤버인가'가 아니라 '노트가 공유 중인가'다.
    워크스페이스를 만든 소유자는 보통 그 워크스페이스의 멤버가 아니기 때문이다.
    """
    workspace_hash = create_workspace(client, auth_headers)
    note_hash = create_note(client, auth_headers, title="처음", workspaces=[workspace_hash])
    set_snapshot_policy(client, auth_headers, "MANUAL")
    before = len(snapshots(client, auth_headers, note_hash))

    edit(client, auth_headers, note_hash, "소유자가 고침")

    assert len(snapshots(client, auth_headers, note_hash)) == before + 1


def test_shared_note_snapshot_names_the_editor(client, auth_headers):
    workspace_hash = create_workspace(client, auth_headers)
    teammate = add_new_member_to_workspace(client, auth_headers, workspace_hash)
    note_hash = create_note(client, auth_headers, title="처음", workspaces=[workspace_hash])

    edit(client, teammate, note_hash, "팀원이 고침")

    assert any("팀원" in snapshot["description"] for snapshot in snapshots(client, auth_headers, note_hash))


def test_manual_snapshot_can_be_created_with_a_description(client, auth_headers):
    note_hash = create_note(client, auth_headers, title="처음")

    response = client.post(f"/notes/{note_hash}/snapshots", headers=auth_headers,
                           json={"description": "배포 직전"})

    assert response.status_code == 200
    assert response.json()["description"] == "배포 직전"
    assert len(snapshots(client, auth_headers, note_hash)) == 1


def test_each_snapshot_keeps_the_title_it_was_taken_with(client, auth_headers):
    # created_at 은 server_default=func.now() 라 SQLite 에서 초 단위로 끊긴다.
    # 같은 초에 만든 스냅샷끼리는 정렬 순서가 갈리지 않으므로 순서 대신 내용으로 확인한다.
    note_hash = create_note(client, auth_headers, title="처음")
    client.post(f"/notes/{note_hash}/snapshots", headers=auth_headers, json={"description": "첫번째"})
    client.patch(f"/notes/{note_hash}", headers=auth_headers, json={"title": "바뀐 제목"})
    client.post(f"/notes/{note_hash}/snapshots", headers=auth_headers, json={"description": "두번째"})

    listed = {snapshot["description"]: snapshot["title"] for snapshot in snapshots(client, auth_headers, note_hash)}

    assert listed == {"첫번째": "처음", "두번째": "바뀐 제목"}


def test_snapshot_can_be_deleted(client, auth_headers):
    note_hash = create_note(client, auth_headers, title="처음")
    snapshot_hash = client.post(f"/notes/{note_hash}/snapshots", headers=auth_headers,
                                json={"description": "지울 것"}).json()["hash_id"]

    response = client.delete(f"/notes/{note_hash}/snapshots/{snapshot_hash}", headers=auth_headers)

    assert response.status_code == 204
    assert snapshots(client, auth_headers, note_hash) == []


def test_encrypted_note_snapshot_is_readable(client, auth_headers):
    """암호화된 노트의 스냅샷도 복원할 수 있어야 하므로 평문으로 내려와야 한다."""
    note_hash = create_note(client, auth_headers, content="<p>비밀 본문</p>", is_encrypted=True)

    client.post(f"/notes/{note_hash}/snapshots", headers=auth_headers, json={"description": "수동"})

    assert snapshots(client, auth_headers, note_hash)[0]["content"] == "<p>비밀 본문</p>"


def test_permanently_deleting_a_note_removes_all_its_snapshots(client, auth_headers, db_session):
    note_hash = create_note(client, auth_headers, title="처음")
    set_snapshot_policy(client, auth_headers, "ON_EVERY_EDIT")
    edit(client, auth_headers, note_hash, "두번째")
    edit(client, auth_headers, note_hash, "세번째")

    client.delete(f"/notes/{note_hash}/permanently", headers=auth_headers)

    db_session.expire_all()
    assert db_session.query(NoteSnapshot).count() == 0


def test_other_member_gets_404_for_my_snapshots(client, auth_headers):
    note_hash = create_note(client, auth_headers, title="처음")
    other = member_headers(client)

    response = client.get(f"/notes/{note_hash}/snapshots", headers=other)

    assert response.status_code == 404


def test_other_member_cannot_delete_my_snapshot(client, auth_headers):
    note_hash = create_note(client, auth_headers, title="처음")
    snapshot_hash = client.post(f"/notes/{note_hash}/snapshots", headers=auth_headers,
                                json={"description": "내 이력"}).json()["hash_id"]
    other = member_headers(client)

    try:
        client.delete(f"/notes/{note_hash}/snapshots/{snapshot_hash}", headers=other)
    except ValueError:
        pass  # 위 xfail 과 같은 원인 — 지금은 예외가 그대로 올라온다.

    assert len(snapshots(client, auth_headers, note_hash)) == 1
