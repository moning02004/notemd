"""화면 E2E 테스트가 쓰는 일회용 계정을 만들고 지운다.

개발 스택은 관리자 가입(ADMIN_KEY)을 꺼 두는 일이 많아 화면으로는 계정을 만들 수 없다. 테스트가 시작할 때
일반 계정(관리자 아님) 하나를 만들고, 끝나면 그 계정과 그 계정의 노트·검색 색인을 지운다.
남의 노트에는 닿지 않는다. 운영 설정에서는 돌지 않는다.

사용법 (컨테이너 안에서):
    python3 -m scripts.e2e_user create            # {"username", "password", "user_hash"} 를 한 줄 JSON 으로 출력
    python3 -m scripts.e2e_user delete e2e-ab12cd
"""
import json
import os
import secrets
import sys

from fastapi_clean_archi.core.auth import hash_password

from app.core.session import SessionLocal
from app.modules.note.infrastructure.models import Note
from app.modules.search.application.service import SearchService
from app.modules.search.infrastructure.repository import SearchRepository
from app.modules.user.infrastructure.repository import UserRepository
from scripts import _base  # noqa: F401  모든 모듈의 모델을 불러 둔다(relationship 의 문자열 참조).

PREFIX = "e2e-"


def create() -> dict:
    db = SessionLocal()
    try:
        username = f"{PREFIX}{secrets.token_hex(4)}"
        password = secrets.token_urlsafe(12)
        user = UserRepository(db).create_user(username=username, hashed_password=hash_password(password),
                                              name="E2E 테스트", is_superuser=False, must_change_password=False)
        return {"username": username, "password": password, "user_hash": user.hash_id}
    finally:
        db.close()


def delete(username: str) -> int:
    # 이 스크립트가 만든 계정만 지운다. 이름을 잘못 줘서 진짜 계정이 지워지는 일이 없게 한다.
    if not username.startswith(PREFIX):
        raise SystemExit(f"'{PREFIX}' 로 시작하는 계정만 지웁니다: {username}")
    db = SessionLocal()
    try:
        repository = UserRepository(db)
        user = repository.find_user_by_username(username)
        if user is None:
            return 0
        note_hashes = [hash_id for (hash_id,) in db.query(Note.hash_id).filter(Note.user_id == user.pk)]
        if note_hashes:
            SearchService(SearchRepository()).delete_from_index(note_hashes)
        repository.delete_user(user)
        return len(note_hashes)
    finally:
        db.close()


if __name__ == "__main__":
    if os.environ.get("SETTINGS_FILE", "local") != "local":
        raise SystemExit("개발 설정(SETTINGS_FILE=local)에서만 돕니다.")
    command, *args = sys.argv[1:] or [""]
    if command == "create":
        print(json.dumps(create()))
    elif command == "delete" and args:
        print(json.dumps({"deleted_notes": delete(args[0])}))
    else:
        raise SystemExit(__doc__)
