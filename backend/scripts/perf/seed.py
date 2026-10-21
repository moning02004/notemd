"""성능 측정용 대량 데이터를 따로 둔 DB 에 채운다. 운영·개발 DB 에는 쓰지 않는다.

    docker exec notemd-db psql -U admin -d notemd -c "create database notemd_bench"
    docker exec -e DB_NAME=notemd_bench notemd-backend sh -c "cd /app && alembic upgrade head"
    docker exec -e DB_NAME=notemd_bench notemd-backend python3 -m scripts.perf.seed

DB 이름이 notemd_bench 가 아니면 멈춘다(실수로 개발 DB 를 채우지 않게).

모양(기본값):
- 사용자 50명. 한 명(bench_heavy)은 노트 30,000개, 나머지는 1,500개씩 → 노트 약 10만 개.
- 무거운 사용자: 폴더 120개(3단계), 시리즈 40개, 스냅샷 60,000개. 나머지는 폴더 15개, 스냅샷 500개.
- 본문은 1~8KB HTML(문단·목록·코드·노트 링크). 60% 는 Y 문서(본문 크기만 한 바이너리)를 가진다.
- 8% 는 휴지통, 2% 는 암호화, 태그는 노트마다 0~4개(전체 400개), 노트 링크 0~3개.
- 공유 워크스페이스 20개, 무거운 사용자의 노트 500개가 공유돼 있다.

COPY 로 넣는다. 10만 개가 1~2분이면 들어간다.
"""
import base64
import io
import os
import random
import uuid
from datetime import datetime, timedelta, timezone

import psycopg2
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import settings

random.seed(20261021)

HEAVY_NOTES = int(os.environ.get("HEAVY_NOTES", 30_000))
OTHER_USERS = int(os.environ.get("OTHER_USERS", 49))
OTHER_NOTES = int(os.environ.get("OTHER_NOTES", 1_500))
HEAVY_SNAPSHOTS = int(os.environ.get("HEAVY_SNAPSHOTS", 60_000))
OTHER_SNAPSHOTS = 500
TAG_COUNT = 400
NOW = datetime(2026, 10, 21, tzinfo=timezone.utc)

WORDS = ("노트 회의 정리 계획 분기 목표 일정 리뷰 배포 성능 개선 설계 문서 테스트 데이터 사용자 화면 서버 검색 "
         "폴더 태그 공유 링크 스냅샷 백업 동기화 오프라인 에디터 코드 블록 표 접기 체크리스트 요약 결정 질문 "
         "아이디어 독서 여행 운동 식단 가계부 프로젝트 마감 우선순위 회고 메모 초안 발표 자료").split()


def words(n):
    return " ".join(random.choice(WORDS) for _ in range(n))


def html_body(link_targets):
    parts = []
    size = random.choice([1, 1, 2, 2, 3, 4, 6, 8]) * 1000
    while sum(len(p) for p in parts) < size:
        kind = random.random()
        if kind < 0.55:
            parts.append(f"<p>{words(random.randint(8, 40))}</p>")
        elif kind < 0.7:
            parts.append(f"<h2>{words(3)}</h2>")
        elif kind < 0.85:
            items = "".join(f"<li><p>{words(random.randint(3, 10))}</p></li>" for _ in range(random.randint(2, 6)))
            parts.append(f"<ul>{items}</ul>")
        else:
            code = "\n".join(f"    value_{i} = compute({i})" for i in range(random.randint(3, 12)))
            parts.append(f'<pre><code class="language-python">def run():\n{code}</code></pre>')
    for target_hash, title in link_targets:
        parts.insert(random.randint(0, len(parts)),
                     f'<p><a data-note="{target_hash}" href="/s/{target_hash}" class="note-link">{title}</a></p>')
    return "".join(parts)


class Copier:
    """한 표에 넣을 줄을 모아 COPY 로 보낸다."""

    def __init__(self, cur, table, columns, parent=None):
        # parent: 이 표가 가리키는 표. 이 표를 보내기 전에 parent 에 모인 줄부터 보낸다(외래 키).
        self.cur, self.table, self.columns, self.parent = cur, table, columns, parent
        self.buf = io.StringIO()
        self.count = 0

    @staticmethod
    def cell(value):
        if value is None:
            return r"\N"
        if isinstance(value, bool):
            return "t" if value else "f"
        if isinstance(value, bytes):
            return "\\\\x" + value.hex()
        if isinstance(value, datetime):
            return value.isoformat()
        text = str(value)
        return text.replace("\\", "\\\\").replace("\t", "\\t").replace("\n", "\\n").replace("\r", "\\r")

    def add(self, *row):
        self.buf.write("\t".join(self.cell(v) for v in row) + "\n")
        self.count += 1
        if self.count % 5000 == 0:
            self.flush()

    def flush(self):
        if self.parent:
            self.parent.flush()
        self.buf.seek(0)
        cols = ", ".join(f'"{c}"' for c in self.columns)
        self.cur.copy_expert(f'COPY "{self.table}" ({cols}) FROM STDIN', self.buf)
        self.buf = io.StringIO()


def random_time(start_days_ago=1100):
    return NOW - timedelta(seconds=random.randint(0, start_days_ago * 86400))


def main():
    db = settings.DATABASE
    if db["name"] != "notemd_bench":
        raise SystemExit(f"DB_NAME 이 notemd_bench 가 아닙니다({db['name']}). 멈춥니다.")
    conn = psycopg2.connect(dbname=db["name"], user=db["user"], password=db["password"],
                            host=db["host"], port=db["port"])
    cur = conn.cursor()
    cur.execute('select count(*) from "user"')
    if cur.fetchone()[0]:
        raise SystemExit("이미 데이터가 있습니다. DB 를 지우고 다시 만드세요.")

    kek = base64.b64decode(settings.KEK)
    user_count = 1 + OTHER_USERS
    users = []  # (pk, hash, dek)
    user_copy = Copier(cur, "user", ["id", "hash_id", "created_at", "updated_at", "username", "hashed_password",
                                     "name", "is_superuser", "is_approval", "must_change_password"])
    key_copy = Copier(cur, "userkey", ["id", "hash_id", "created_at", "updated_at", "user_id", "key_blob",
                                       "kek_version"])
    pref_copy = Copier(cur, "preference", ["id", "hash_id", "created_at", "updated_at", "user_id",
                                           "snapshot_policy", "trash_policy", "editor_width"])
    for pk in range(1, user_count + 1):
        hash_id = str(uuid.uuid4())
        dek = os.urandom(32)
        nonce = os.urandom(12)
        blob = nonce + AESGCM(kek).encrypt(nonce, dek, f"user:{pk}".encode())
        name = "bench_heavy" if pk == 1 else f"bench_{pk:03d}"
        user_copy.add(pk, hash_id, NOW, NOW, name, "x", name, pk == 1, True, False)
        key_copy.add(pk, str(uuid.uuid4()), NOW, NOW, pk, blob, 1)
        pref_copy.add(pk, str(uuid.uuid4()), NOW, NOW, pk, "ON_FIRST_EDIT", "30_DAYS", "WIDE")
        users.append((pk, hash_id, dek))
    for c in (user_copy, key_copy, pref_copy):
        c.flush()
    print("users", user_count)

    # 폴더: 3단계 트리
    folder_copy = Copier(cur, "folder", ["id", "hash_id", "created_at", "updated_at", "user_id", "name", "parent_id"])
    folders_of = {}
    folder_pk = 0
    for pk, _, _ in users:
        total = 120 if pk == 1 else 15
        mine = []
        for i in range(total):
            folder_pk += 1
            parent = None
            if mine and i >= total // 4:
                parent = random.choice(mine[: max(1, len(mine) // 2)])
            folder_copy.add(folder_pk, str(uuid.uuid4()), NOW, NOW, pk, f"{words(1)} {i}", parent)
            mine.append(folder_pk)
        folders_of[pk] = mine
    folder_copy.flush()
    print("folders", folder_pk)

    tag_copy = Copier(cur, "tag", ["id", "hash_id", "created_at", "updated_at", "keyword"])
    for i in range(1, TAG_COUNT + 1):
        tag_copy.add(i, str(uuid.uuid4()), NOW, NOW, f"{random.choice(WORDS)}{i}")
    tag_copy.flush()

    note_copy = Copier(cur, "note", ["id", "hash_id", "created_at", "updated_at", "user_id", "title", "content",
                                     "is_public", "is_protected", "deleted_at", "password", "is_encrypted", "ydoc",
                                     "folder_id"])
    notetag_copy = Copier(cur, "notetag", ["note_id", "tag_id"], parent=note_copy)
    link_copy = Copier(cur, "note_link", ["source_note_id", "target_note_id"], parent=note_copy)
    notes_of = {}
    note_pk = 0
    for pk, _, dek in users:
        count = HEAVY_NOTES if pk == 1 else OTHER_NOTES
        mine = []  # (pk, hash, title)
        for _ in range(count):
            note_pk += 1
            hash_id = str(uuid.uuid4())
            title = words(random.randint(2, 6))
            targets = random.sample(mine, k=min(len(mine), random.choice([0, 0, 1, 2, 3])))
            content = html_body([(t[1], t[2]) for t in targets])
            created = random_time()
            updated = min(NOW, created + timedelta(seconds=random.randint(0, 200 * 86400)))
            deleted = updated + timedelta(days=random.randint(0, 20)) if random.random() < 0.08 else None
            encrypted = random.random() < 0.02
            if encrypted:
                nonce = os.urandom(12)
                content = base64.b64encode(nonce + AESGCM(dek).encrypt(nonce, content.encode(),
                                                                       f"user:{pk}".encode())).decode()
            ydoc = os.urandom(int(len(content) * 0.9)) if random.random() < 0.6 and not encrypted else None
            folder = random.choice(folders_of[pk]) if random.random() < 0.8 else None
            note_copy.add(note_pk, hash_id, created, updated, pk, title, content, random.random() < 0.05, False,
                          deleted, None, encrypted, ydoc, folder)
            for tag in random.sample(range(1, TAG_COUNT + 1), k=random.choice([0, 1, 1, 2, 3, 4])):
                notetag_copy.add(note_pk, tag)
            for t in targets:
                link_copy.add(note_pk, t[0])
            mine.append((note_pk, hash_id, title))
        notes_of[pk] = mine
        if pk % 10 == 1:
            print("notes", note_pk)
    for c in (note_copy, notetag_copy, link_copy):
        c.flush()
    print("notes", note_pk)

    snap_copy = Copier(cur, "notesnapshot", ["id", "hash_id", "created_at", "updated_at", "note_id", "description",
                                             "title", "content"])
    snap_pk = 0
    for pk, _, _ in users:
        mine = notes_of[pk]
        # 스냅샷은 자주 고치는 몇몇 노트에 몰린다.
        hot = mine[: max(50, len(mine) // 20)]
        for _ in range(HEAVY_SNAPSHOTS if pk == 1 else OTHER_SNAPSHOTS):
            snap_pk += 1
            note = random.choice(hot) if random.random() < 0.8 else random.choice(mine)
            created = random_time(400)
            snap_copy.add(snap_pk, str(uuid.uuid4()), created, created, note[0],
                          f"auto_{int(created.timestamp())}_공동 편집", note[2], html_body([]))
    snap_copy.flush()
    print("snapshots", snap_pk)

    series_copy = Copier(cur, "series", ["id", "hash_id", "created_at", "updated_at", "user_id", "title",
                                         "description", "is_public"])
    series_note_copy = Copier(cur, "series_note", ["series_id", "note_id", "position"])
    series_pk = 0
    for pk, _, _ in users:
        for _ in range(40 if pk == 1 else 2):
            series_pk += 1
            series_copy.add(series_pk, str(uuid.uuid4()), NOW, NOW, pk, words(3), "", random.random() < 0.3)
            for position, note in enumerate(random.sample(notes_of[pk], k=15 if pk == 1 else 5)):
                series_note_copy.add(series_pk, note[0], position)
    series_copy.flush()
    series_note_copy.flush()

    ws_copy = Copier(cur, "workspace", ["id", "hash_id", "created_at", "updated_at", "name", "description"])
    member_copy = Copier(cur, "workspace_member", ["workspace_id", "user_id"])
    ws_note_copy = Copier(cur, "workspace_note", ["note_id", "workspace_id"])
    for ws in range(1, 21):
        ws_copy.add(ws, str(uuid.uuid4()), NOW, NOW, f"공유 {ws}", "")
        members = {1} | set(random.sample(range(2, user_count + 1), k=random.randint(1, 4)))
        for member in members:
            member_copy.add(ws, member)
    shared = random.sample(notes_of[1], k=500)
    for i, note in enumerate(shared):
        ws_note_copy.add(note[0], 1 + i % 20)
    for c in (ws_copy, member_copy, ws_note_copy):
        c.flush()

    for table, value in (("user", user_count), ("userkey", user_count), ("preference", user_count),
                         ("folder", folder_pk), ("tag", TAG_COUNT), ("note", note_pk),
                         ("notesnapshot", snap_pk), ("series", series_pk), ("workspace", 20)):
        cur.execute(f"select setval(pg_get_serial_sequence('\"{table}\"', 'id'), %s)", (value,))
    conn.commit()
    conn.close()
    print("done")


if __name__ == "__main__":
    main()
