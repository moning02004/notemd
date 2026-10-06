"""자동 백업: 사용자마다 전체 내보내기 zip 을 폴더에 남긴다."""
import io
import zipfile

import pytest

from app.core.config import settings
from app.modules.note.application import tasks
from app.modules.note.application.service import NoteService
from conftest import create_note, member_headers


@pytest.fixture()
def backup_dir(tmp_path, monkeypatch, db_session):
    monkeypatch.setattr(settings, "BACKUP_DIR", str(tmp_path))
    monkeypatch.setattr(settings, "BACKUP_KEEP", 7)
    # 작업은 자기 세션을 열고 닫는다. 테스트의 세션은 닫지 않고 그대로 쓰게 한다.
    monkeypatch.setattr(tasks, "SessionLocal", lambda: db_session)
    monkeypatch.setattr(db_session, "close", lambda: None)
    return tmp_path


def backups(root):
    return sorted(root.glob("*/note.md-*.zip"))


def test_backup_is_off_until_a_folder_is_configured(client, auth_headers, tmp_path, monkeypatch):
    create_note(client, auth_headers, title="회의록")
    monkeypatch.setattr(settings, "BACKUP_DIR", "")

    assert tasks.backup_notes() == 0
    assert list(tmp_path.iterdir()) == []


def test_backup_writes_one_export_zip_per_user(client, auth_headers, backup_dir):
    create_note(client, auth_headers, title="회의록", content="<p>관리자 본문</p>")
    member = member_headers(client)
    create_note(client, member, title="일지", content="<p>멤버 본문</p>")

    assert tasks.backup_notes() == 2

    files = backups(backup_dir)
    assert sorted(path.parent.name for path in files) == ["member-2", "tester-1"]
    by_user = {path.parent.name: zipfile.ZipFile(io.BytesIO(path.read_bytes())) for path in files}
    assert "노트/회의록.md" in by_user["tester-1"].namelist()
    assert "관리자 본문" in by_user["tester-1"].read("노트/회의록.md").decode("utf-8")
    assert "노트/일지.md" in by_user["member-2"].namelist()
    assert "노트/회의록.md" not in by_user["member-2"].namelist()


def test_user_without_notes_is_skipped(client, auth_headers, backup_dir):
    create_note(client, auth_headers, title="회의록")
    member_headers(client)

    assert tasks.backup_notes() == 1
    assert [path.parent.name for path in backups(backup_dir)] == ["tester-1"]


def test_only_the_newest_backups_are_kept(client, auth_headers, backup_dir, monkeypatch):
    create_note(client, auth_headers, title="회의록")
    monkeypatch.setattr(settings, "BACKUP_KEEP", 2)
    directory = backup_dir / "tester-1"
    directory.mkdir()
    for day in ("20260101", "20260102", "20260103"):
        (directory / f"note.md-{day}-030000.zip").write_bytes(b"old")

    tasks.backup_notes()

    names = [path.name for path in backups(backup_dir)]
    assert len(names) == 2
    assert names[0] == "note.md-20260103-030000.zip"
    assert names[1] > "note.md-2026010"


def test_one_users_failure_does_not_stop_the_others(client, auth_headers, backup_dir, monkeypatch):
    create_note(client, auth_headers, title="회의록")
    member = member_headers(client)
    create_note(client, member, title="일지")

    real_export = NoteService.export_notes

    def export(self, user):
        if user.username == "tester":
            raise RuntimeError("디스크 오류")
        return real_export(self, user)

    monkeypatch.setattr(NoteService, "export_notes", export)

    assert tasks.backup_notes() == 1
    assert [path.parent.name for path in backups(backup_dir)] == ["member-2"]
    # 쓰다 만 파일이 남지 않는다.
    assert list(backup_dir.glob("*/*.part")) == []
