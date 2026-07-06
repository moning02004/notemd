from typing import Sequence, Mapping, Any

import meilisearch

from app.core.config import settings
from app.core.search_engine import search_engine


class SearchRepository:
    def __init__(self):
        self.client = search_engine.client
        self.index = search_engine.get_index()

    def ensure_index(self) -> None:
        """앱 시작 시 한 번 호출 — 인덱스 생성 + 설정 적용"""
        try:
            search_engine.client.get_index(settings.MEILISEARCH_INDEX_UID)
        except Exception as e:
            print(f"Error ensuring Meilisearch index: {e}")
            search_engine.client.create_index(
                settings.MEILISEARCH_INDEX_UID, {"primaryKey": "id"}
            )
        self.index.update_settings(INDEX_SETTINGS)

    def search_index(self, keyword: str, user_hash: str, sort: str = None, page: int = 1):
        search_params = {
            "filter": f"user_hash={user_hash}",
            # "limit": 20,
            # "offset": (page - 1) * 20,
            "matchingStrategy": "all",
        }

        results = self.index.search(keyword, search_params)
        return [x["id"] for x in results["hits"]]

    def upsert(self, data: Sequence[Mapping[str, Any]]):
        self.index.add_documents(data)

    def delete(self, doc_ids: list) -> None:
        self.index.delete_documents(doc_ids)


INDEX_SETTINGS = {
    "searchableAttributes": [
        "title",
        "content",
    ],
    "filterableAttributes": [
        "user_hash",
        "tags",
        "created_at",
        "updated_at",
    ],
    "sortableAttributes": [
        "created_at",
        "updated_at",
    ],
    "typoTolerance": {
        "enabled": False,
    },
    "pagination": {
        "maxTotalHits": 10000,
    },
}
