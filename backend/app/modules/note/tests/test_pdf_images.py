"""PDF 로 내보낼 때 본문 이미지가 따라가는지.

편집기는 이미지를 'http://<API 주소>/uploads/<이름>' 처럼 호스트까지 붙여 저장한다.
PDF 는 호스트와 상관없이 업로드한 파일을 저장소(Storage.read)에서 받아 넣고, 그 밖의 주소는 불러오지 않는다.
"""

import io

import fitz
from PIL import Image

from app.core.pdf_renderer import _prepare_html, _upload_name, render_note_pdf
from app.core.storages.local_storage import LocalStorage
from conftest import create_note


def _png() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (40, 30), (31, 102, 80)).save(buffer, "PNG")
    return buffer.getvalue()


def _image_count(pdf: bytes) -> int:
    with fitz.open(stream=pdf, filetype="pdf") as document:
        return sum(len(page.get_images()) for page in document)


def test_upload_name_ignores_the_host_the_editor_saved():
    assert _upload_name("http://localhost:8002/uploads/ab12.png") == "ab12.png"
    assert _upload_name("https://api.example.com/uploads/ab12.png") == "ab12.png"
    assert _upload_name("/uploads/ab12.png") == "ab12.png"


def test_upload_name_rejects_other_paths():
    assert _upload_name("https://example.com/cat.png") is None
    assert _upload_name("/uploads/../secret.txt") is None
    assert _upload_name("/uploads/") is None


def test_local_storage_reads_only_names_it_would_have_saved(tmp_path, monkeypatch):
    storage = LocalStorage()
    monkeypatch.setattr(storage, "upload_dir", tmp_path)
    (tmp_path / "ab12.png").write_bytes(b"png")

    assert storage.read("ab12.png") == b"png"
    assert storage.read("missing.png") is None
    assert storage.read("..%2Fsecret.txt") is None
    assert storage.read("../secret.txt") is None


def test_uploaded_image_is_embedded_in_the_pdf():
    requested = []

    def read_image(name):
        requested.append(name)
        return _png()

    pdf = render_note_pdf("이미지", '<p><img src="http://localhost:8002/uploads/ab12.png"></p>', read_image)

    assert requested == ["ab12.png"]
    assert _image_count(pdf) == 1


def test_outside_images_are_not_fetched():
    requested = []
    html = _prepare_html('<p><img src="http://169.254.169.254/latest/meta-data/x.png"></p>')

    pdf = render_note_pdf("바깥", '<p><img src="https://example.com/cat.png"></p>', requested.append)

    assert "<img" not in html
    assert requested == []
    assert _image_count(pdf) == 0


def test_missing_image_is_skipped_without_failing():
    pdf = render_note_pdf("없음", '<p><img src="/uploads/gone.png"></p>', lambda name: None)

    assert pdf.startswith(b"%PDF")
    assert _image_count(pdf) == 0


def test_downloaded_pdf_contains_the_uploaded_image(client, auth_headers):
    note_hash = create_note(client, auth_headers)
    upload = client.post(f"/notes/{note_hash}/images", headers=auth_headers,
                         files={"file": ("photo.png", _png(), "image/png")})
    assert upload.status_code == 200
    # 편집기처럼 API 주소를 붙여 본문에 넣는다.
    src = f"http://localhost:8002{upload.json()['url']}"
    client.patch(f"/notes/{note_hash}", headers=auth_headers, json={"content": f'<p><img src="{src}"></p>'})

    response = client.post("/notes/download", headers=auth_headers,
                           json={"note_hashes": [note_hash], "file_format": "pdf"})

    assert response.status_code == 200
    assert _image_count(response.content) == 1
