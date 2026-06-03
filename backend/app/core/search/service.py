import os
import re

from opensearchpy import NotFoundError
from app.core.search.client import get_opensearch_client
from app.modules.note.infrastructure.models import Note


# ── 삽입 (신규 노트) ───────────────────────────────────
def create_note_for_search(note_hash: str, data: dict):
    get_opensearch_client().index(
        index=os.environ["OPENSEARCH_INDEX_NAME"],
        id=note_hash,
        body={**data},
        refresh=True,  # 즉시 검색 반영 (개발 편의용, 운영에서는 제거 고려)
    )


# ── 업데이트 (변경 필드만) ─────────────────────────────
def update_note_for_search(note_hash: str, fields: dict):
    get_opensearch_client().update(
        index=os.environ["OPENSEARCH_INDEX_NAME"],
        id=note_hash,
        body={"doc": fields},
        refresh=True,
    )


# ── 삭제 ──────────────────────────────────────────────
def delete_note(note_hash: str):
    try:
        get_opensearch_client().delete(index=os.environ["OPENSEARCH_INDEX_NAME"], id=note_hash, refresh=True)
    except NotFoundError:
        pass  # 이미 없으면 무시


def index_or_pass(note: Note):
    if get_opensearch_client().exists(index=os.environ["OPENSEARCH_INDEX_NAME"],
                                      id=note.hash_id):
        return

    create_note_for_search(
        note_hash=note.hash_id,
        data={
            "note_hash": note.hash_id,
            "user_hash": note.user.hash_id,
            "title": note.title,
            "content": re.sub(r'<[^>]+>', '', note.content),
            "is_deleted": note.is_deleted,
            "created_at": note.created_at,
            "updated_at": note.updated_at,
        }
    )


# ── 검색 ──────────────────────────────────────────────
def search_notes(
        query: str,
        user_hash: str,
        page: int = 1,
        size: int = 20,
) -> list:
    body = {
        "query": {
            "bool": {
                "must": [
                    {
                        "multi_match": {
                            "query": query,
                            "fields": ["full_text"],
                            "analyzer": "korean_ngram"
                        }
                    }
                ],
                "filter": [
                    {"term": {"is_deleted": False}},
                    {"term": {"user_hash": user_hash}}
                ],
            }
        },
        # "highlight": {
        #     "fields": {
        #         "title":   {"number_of_fragments": 0},
        #         "content": {"fragment_size": 200, "number_of_fragments": 2},
        #     }
        # },
        "from": (page - 1) * size,
        "size": size,
        "sort": [{"_score": "desc"}, {"updated_at": "desc"}],
    }

    result = get_opensearch_client().search(index=os.environ["OPENSEARCH_INDEX_NAME"], body=body)
    hits = result["hits"]
    return [h["_id"] for h in hits["hits"]]
