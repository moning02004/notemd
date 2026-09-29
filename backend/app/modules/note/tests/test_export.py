"""설정의 데이터 내보내기: 노트 전부를 폴더 구조 그대로 담은 마크다운 zip."""
import io
import zipfile

from conftest import create_note, member_headers


def make_folder(client, headers, name, parent=None):
    response = client.post("/folders", headers=headers, json={"name": name, "parent": parent})
    assert response.status_code == 201, response.text
    return response.json()["hash_id"]


def export(client, headers) -> zipfile.ZipFile:
    response = client.get("/notes/export", headers=headers)
    assert response.status_code == 200, response.text
    assert response.headers["content-type"] == "application/zip"
    assert "note.md-" in response.headers["content-disposition"]
    return zipfile.ZipFile(io.BytesIO(response.content))


def test_notes_follow_their_folders_and_unfiled_notes_sit_at_the_root(client, auth_headers):
    owner = member_headers(client)
    work = make_folder(client, owner, "업무")
    meeting = make_folder(client, owner, "회의", parent=work)
    make_folder(client, owner, "빈 폴더")

    create_note(client, owner, title="미분류 메모", content="<p>맨 위</p>")
    create_note(client, owner, title="할 일", content="<p>업무 안</p>", folder=work)
    create_note(client, owner, title="9월 회의", content="<p>회의 안</p>", folder=meeting)

    zf = export(client, owner)
    names = set(zf.namelist())

    assert "미분류 메모.md" in names
    assert "업무/할 일.md" in names
    assert "업무/회의/9월 회의.md" in names
    # 빈 폴더도 구조로 남는다. '미분류' 폴더는 만들지 않는다.
    assert "빈 폴더/" in names
    assert not any(name.startswith("미분류/") for name in names)
    assert "맨 위" in zf.read("미분류 메모.md").decode()


def test_same_names_do_not_overwrite_each_other(client, auth_headers):
    owner = member_headers(client)
    make_folder(client, owner, "같은 이름")
    make_folder(client, owner, "같은 이름")
    create_note(client, owner, title="메모", content="<p>하나</p>")
    create_note(client, owner, title="메모", content="<p>둘</p>")

    names = set(export(client, owner).namelist())

    assert {"같은 이름/", "같은 이름 (2)/"} <= names
    assert {"메모.md", "메모_1.md"} <= names


def test_trash_and_other_peoples_notes_are_left_out(client, auth_headers):
    owner = member_headers(client)
    kept = create_note(client, owner, title="남길 노트")
    trashed = create_note(client, owner, title="버린 노트")
    client.delete(f"/notes/{trashed}", headers=owner)

    stranger = member_headers(client, username="stranger", name="남")
    create_note(client, stranger, title="남의 노트")

    names = export(client, owner).namelist()
    assert names == ["남길 노트.md"]
    assert kept


def test_encrypted_notes_are_exported_as_plain_markdown(client, auth_headers):
    owner = member_headers(client)
    create_note(client, owner, title="비밀", content="<p>풀어서 나가야 한다</p>", is_encrypted=True)

    assert "풀어서 나가야 한다" in export(client, owner).read("비밀.md").decode()


def test_folder_names_that_cannot_be_paths_are_cleaned(client, auth_headers):
    owner = member_headers(client)
    odd = make_folder(client, owner, "a/b:c")
    create_note(client, owner, title="안", folder=odd)

    assert "abc/안.md" in export(client, owner).namelist()


def test_export_needs_login(client):
    assert client.get("/notes/export").status_code == 401


def link(note_hash, title="제목"):
    return f'<a data-note="{note_hash}" href="/s/{note_hash}" class="note-link">{title}</a>'


def test_note_links_point_to_the_exported_files(client, auth_headers):
    owner = member_headers(client)
    work = make_folder(client, owner, "업무")
    target = create_note(client, owner, title="대상 노트", folder=work)
    trashed = create_note(client, owner, title="버린 노트")
    client.delete(f"/notes/{trashed}", headers=owner)

    create_note(client, owner, title="맨 위", content=f"<p>{link(target)} / {link(trashed)}</p>")
    create_note(client, owner, title="옆자리", content=f"<p>{link(target)}</p>", folder=work)

    zf = export(client, owner)
    top = zf.read("맨 위.md").decode()
    beside = zf.read("업무/옆자리.md").decode()

    # 파일 이름의 한글·공백은 퍼센트 인코딩된다(마크다운 링크 주소에 공백을 둘 수 없다).
    assert "[대상 노트](%EC%97%85%EB%AC%B4/%EB%8C%80%EC%83%81%20%EB%85%B8%ED%8A%B8.md)" in top
    assert "[대상 노트](%EB%8C%80%EC%83%81%20%EB%85%B8%ED%8A%B8.md)" in beside
    # zip 에 없는 노트는 링크를 풀고 제목만 남긴다. 서버 주소(/s/...)는 zip 밖에서 열리지 않는다.
    assert "/s/" not in top
    assert "버린 노트" in top and "[버린 노트]" not in top


def _png() -> bytes:
    import io as _io
    from PIL import Image
    buffer = _io.BytesIO()
    Image.new("RGB", (8, 8), (31, 102, 80)).save(buffer, "PNG")
    return buffer.getvalue()


def test_uploaded_images_are_bundled_and_outside_images_are_left_alone(client, auth_headers):
    owner = member_headers(client)
    work = make_folder(client, owner, "업무")
    make_folder(client, owner, "images")  # 내보내기가 쓰는 이름과 겹치는 사용자 폴더
    top = create_note(client, owner, title="사진")
    beside = create_note(client, owner, title="옆 사진", folder=work)

    upload = client.post(f"/notes/{top}/images", headers=owner, files={"file": ("p.png", _png(), "image/png")})
    assert upload.status_code == 200
    src = f"http://localhost:8002{upload.json()['url']}"
    name = upload.json()["url"].rsplit("/", 1)[-1]
    outside = "https://example.com/cat.png"
    client.patch(f"/notes/{top}", headers=owner,
                 json={"content": f'<p><img src="{src}"><img src="{outside}"></p>'})
    client.patch(f"/notes/{beside}", headers=owner, json={"content": f'<p><img src="{src}"></p>'})

    zf = export(client, owner)
    names = zf.namelist()

    # 같은 이미지는 한 번만 담는다. 사용자 폴더 images 는 비켜선다.
    assert names.count(f"images/{name}") == 1
    assert zf.read(f"images/{name}") == _png()
    assert "images (2)/" in names

    assert f"(images/{name})" in zf.read("사진.md").decode()
    assert f"({outside})" in zf.read("사진.md").decode()
    assert f"(../images/{name})" in zf.read("업무/옆 사진.md").decode()
