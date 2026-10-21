"""seed.py 로 채운 notemd_bench 에서 자주 쓰는 API 를 불러 걸린 시간·SQL 수·응답 크기를 잰다.

    docker exec -e DB_NAME=notemd_bench -e MEILISEARCH_INDEX_UID=notes_bench notemd-backend \
        python3 -m scripts.perf.bench before

앱을 프로세스 안에서 그대로 부른다(TestClient). 네트워크는 빼고 라우팅·DB·직렬화까지 잰다.
경로마다 몇 번 먼저 불러 데우고, ROUNDS 번 불러 중앙값·p95 를 낸다.
결과는 scripts/perf/results/<이름>.json 에 남는다.
"""
import json
import logging
import os
import statistics
import sys
import time

from fastapi.testclient import TestClient
from sqlalchemy import event, text

from app.core.config import settings
from app.core.jwt_util import jwt_manager
from app.core.session import engine
from main import app

logging.disable(logging.CRITICAL)
ROUNDS = int(os.environ.get("ROUNDS", 20))
WARMUP = 3

queries = {"count": 0}


@event.listens_for(engine, "before_cursor_execute")
def _count(*_args, **_kwargs):
    queries["count"] += 1


def pick_targets():
    with engine.connect() as conn:
        one = lambda sql: conn.execute(text(sql)).scalar()
        heavy = one("""select hash_id from "user" where username = 'bench_heavy'""")
        light = one("""select hash_id from "user" where username = 'bench_002'""")
        hot_note = one("""select n.hash_id from notesnapshot s join note n on n.id = s.note_id
                          where n.user_id = 1 and n.deleted_at is null and not n.is_encrypted
                          group by n.hash_id order by count(*) desc limit 1""")
        linked_note = one("""select n.hash_id from note_link l join note n on n.id = l.target_note_id
                             where n.user_id = 1 and n.deleted_at is null and not n.is_encrypted
                             group by n.hash_id order by count(*) desc limit 1""")
        linking_note = one("""select n.hash_id from note_link l join note n on n.id = l.source_note_id
                              where n.user_id = 1 and n.deleted_at is null and not n.is_encrypted
                              group by n.hash_id order by count(*) desc limit 1""")
        folder = one("""select f.hash_id from folder f where f.user_id = 1 and f.parent_id is null
                        order by (select count(*) from folder c where c.parent_id = f.id) desc limit 1""")
        tag = one("""select t.keyword from notetag nt join note n on n.id = nt.note_id join tag t on t.id = nt.tag_id
                     where n.user_id = 1 group by t.keyword order by count(*) desc limit 1""")
        workspace = one("""select w.hash_id from workspace w join workspace_note wn on wn.workspace_id = w.id
                           group by w.hash_id order by count(*) desc limit 1""")
        save_note = one("""select hash_id from note where user_id = 1 and deleted_at is null and not is_encrypted
                           and ydoc is null order by id limit 1""")
    return dict(heavy=heavy, light=light, hot_note=hot_note, linked_note=linked_note, linking_note=linking_note,
                folder=folder, tag=tag, workspace=workspace, save_note=save_note)


def main():
    if settings.DATABASE["name"] != "notemd_bench":
        raise SystemExit("DB_NAME=notemd_bench 로 돌리세요.")
    label = sys.argv[1] if len(sys.argv) > 1 else "run"
    t = pick_targets()
    # with 로 열어야 이벤트 루프를 한 번만 띄운다. 그냥 쓰면 요청마다 새로 띄워 15~20ms 가 더 붙는다.
    with TestClient(app) as client:
        run(client, t, label)


def run(client, t, label):
    auth = lambda user_hash: {"Authorization": "Bearer " + jwt_manager.create({"user_hash": user_hash})["access_token"]}
    heavy, light = auth(t["heavy"]), auth(t["light"])
    collab = {"X-Collab-Secret": settings.COLLAB_SECRET}

    save_body = {"content": "<p>성능 측정 저장 " + "본문 " * 400 + "</p>", "title": "성능 측정"}
    collab_body = {"ydoc": "AAA=", "html": "<p>공동 편집 저장 " + "본문 " * 400 + "</p>", "title": "공동 편집",
                   "edited": True}

    cases = [
        ("목록: 최근 고친 순 1쪽", "GET", "/notes", heavy, None),
        ("목록: 50쪽", "GET", "/notes?page=50", heavy, None),
        ("목록: 만든 순", "GET", "/notes?sort=created_at", heavy, None),
        ("목록: 폴더(하위 포함)", "GET", f"/notes?folder={t['folder']}&include_sub=1", heavy, None),
        ("목록: 태그", "GET", f"/notes?tag={t['tag']}", heavy, None),
        ("목록: 휴지통", "GET", "/notes?is_deleted=1", heavy, None),
        ("목록: 미분류", "GET", "/notes?unfiled=1", heavy, None),
        ("목록: 가벼운 사용자", "GET", "/notes", light, None),
        ("폴더 트리", "GET", "/folders", heavy, None),
        ("태그 목록", "GET", "/tags", heavy, None),
        ("시리즈 목록", "GET", "/series", heavy, None),
        ("공유 노트 목록", "GET", f"/workspaces/{t['workspace']}/notes", heavy, None),
        ("노트 열기(링크 많음)", "GET", f"/notes/{t['linking_note']}", heavy, None),
        ("백링크", "GET", f"/notes/{t['linked_note']}/backlinks", heavy, None),
        ("스냅샷 목록", "GET", f"/notes/{t['hot_note']}/snapshots", heavy, None),
        ("노트 저장", "PATCH", f"/notes/{t['save_note']}", heavy, save_body),
        ("공동 편집 저장", "PUT", f"/internal/collab/notes/{t['hot_note']}/state", collab, collab_body),
    ]

    results = []
    for name, method, url, headers, body in cases:
        times, counts, size = [], [], 0
        for i in range(WARMUP + ROUNDS):
            queries["count"] = 0
            start = time.perf_counter()
            response = client.request(method, url, headers=headers, json=body)
            elapsed = (time.perf_counter() - start) * 1000
            if response.status_code >= 400:
                raise SystemExit(f"{name}: {response.status_code} {response.text[:300]}")
            if i >= WARMUP:
                times.append(elapsed)
                counts.append(queries["count"])
                size = len(response.content)
        times.sort()
        row = {"name": name, "method": method, "median_ms": round(statistics.median(times), 2),
               "p95_ms": round(times[int(len(times) * 0.95) - 1], 2), "queries": max(counts), "bytes": size}
        results.append(row)
        print(f"{name:<22} {row['median_ms']:>9.2f}ms  p95 {row['p95_ms']:>9.2f}ms  "
              f"sql {row['queries']:>4}  {size / 1024:>8.1f}KB", flush=True)

    os.makedirs("scripts/perf/results", exist_ok=True)
    with open(f"scripts/perf/results/{label}.json", "w") as f:
        json.dump({"label": label, "rounds": ROUNDS, "results": results}, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
