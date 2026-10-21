"""목록이 노트 수만큼 SQL 을 더 부르지 않는지, 목록 미리보기가 본문 대신 앞부분 글만 싣는지.

노트 10만 개로 잰 결과는 scripts/perf 에 있다. 여기서는 그 개선이 되돌아가지 않게만 본다.
"""
from contextlib import contextmanager

from sqlalchemy import event

from app.modules.note.interfaces.schemas import PREVIEW_LENGTH, preview_text
from conftest import create_note, create_workspace


@contextmanager
def count_queries(db_session):
    counter = {"n": 0}

    def count(*_args, **_kwargs):
        counter["n"] += 1

    engine = db_session.get_bind()
    event.listen(engine, "before_cursor_execute", count)
    try:
        yield counter
    finally:
        event.remove(engine, "before_cursor_execute", count)


def shared_notes(client, headers, workspace, count, start=0):
    return [create_note(client, headers, title=f"노트 {start + i}", tags=[f"태그{i}", "공통"],
                        workspaces=[workspace]) for i in range(count)]


# --- 미리보기 -------------------------------------------------------------------

def test_preview_puts_a_space_where_blocks_end():
    assert preview_text("<h2>목표</h2><p>메모 앱</p><ul><li><p>하나</p></li></ul>") == "목표 메모 앱 하나"


def test_preview_treats_line_breaks_as_spaces():
    assert preview_text("<p>첫 줄<br>둘째 줄<br />셋째</p>") == "첫 줄 둘째 줄 셋째"


def test_preview_keeps_entities_so_the_text_stays_safe_html():
    assert preview_text("<p>a &lt; b &amp; <b>c</b></p>") == "a &lt; b &amp; c"


def test_preview_does_not_leak_attribute_values_with_angle_brackets():
    html = '<div data-type="collection" data-collection="{&quot;f&quot;:&quot;a > b&quot;}"><table><tr><td>칸</td></tr></table></div><p>뒤</p>'
    assert preview_text(html) == "칸 뒤"


def test_preview_reads_past_a_large_attribute_at_the_start():
    html = '<div data-collection="' + "x" * 10_000 + '"><p>표 글</p></div><p>끝</p>'
    assert preview_text(html) == "표 글 끝"


def test_preview_is_cut_to_the_card_length():
    preview = preview_text("<p>" + "가" * 5_000 + "</p>")
    assert len(preview) == PREVIEW_LENGTH


def test_preview_of_empty_content_is_empty():
    assert preview_text(None) == ""
    assert preview_text("<p></p>") == ""


def test_note_list_sends_the_preview_not_the_html(client, auth_headers):
    create_note(client, auth_headers, title="회의", content="<h2>안건</h2><p>다음 분기 <b>계획</b></p>")

    note = client.get("/notes", headers=auth_headers).json()[0]

    assert note["content"] == "안건 다음 분기 계획"


# --- SQL 수 --------------------------------------------------------------------

def test_note_list_query_count_does_not_grow_with_notes(client, auth_headers, db_session):
    workspace = create_workspace(client, auth_headers)
    shared_notes(client, auth_headers, workspace, 2)
    db_session.expire_all()
    with count_queries(db_session) as few:
        assert len(client.get("/notes", headers=auth_headers).json()) == 2

    shared_notes(client, auth_headers, workspace, 8, start=2)
    db_session.expire_all()
    with count_queries(db_session) as many:
        notes = client.get("/notes", headers=auth_headers).json()

    assert len(notes) == 10
    assert all(note["is_shared"] and "공통" in note["tags"] for note in notes)
    # 예전에는 공유 여부를 노트마다 물어 노트 수만큼 늘었다.
    assert many["n"] == few["n"]


def test_workspace_notes_are_read_in_a_fixed_number_of_queries(client, auth_headers, db_session):
    workspace = create_workspace(client, auth_headers)
    shared_notes(client, auth_headers, workspace, 2)
    db_session.expire_all()
    with count_queries(db_session) as few:
        client.get(f"/workspaces/{workspace}/notes", headers=auth_headers)

    shared_notes(client, auth_headers, workspace, 8, start=2)
    db_session.expire_all()
    with count_queries(db_session) as many:
        response = client.get(f"/workspaces/{workspace}/notes", headers=auth_headers)

    assert response.status_code == 200
    assert len(response.json()) == 10
    assert many["n"] == few["n"]


def test_workspace_notes_leave_out_trashed_notes(client, auth_headers):
    # 순서(최근 고친 순)는 보지 않는다. SQLite 의 시각은 초 단위라 연달아 만든 노트끼리 갈리지 않는다.
    workspace = create_workspace(client, auth_headers)
    first, trashed, last = shared_notes(client, auth_headers, workspace, 3)
    client.delete(f"/notes/{trashed}", headers=auth_headers)

    hashes = [note["hash_id"] for note in client.get(f"/workspaces/{workspace}/notes", headers=auth_headers).json()]

    assert trashed not in hashes
    assert set(hashes) == {first, last}
