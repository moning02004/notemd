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
            search_engine.client.create_index(
                settings.MEILISEARCH_INDEX_UID, {"primaryKey": "id"}
            )
        self.index.update_settings(INDEX_SETTINGS)

    PAGE_SIZE = 20

    def search_index(self, keyword: str, user_hash: str, sort: str = None, page: int = 1,
                     is_deleted: bool = False, folders: list[str] | None = None):
        """검색어에 맞는 노트 id 를 잘 맞는 순서대로, 한 쪽(20개)씩 돌려준다.

        휴지통 여부를 여기서 거른다. 받아 온 뒤에 DB 에서 거르면 한 쪽이 20개보다 적게 차서
        '다음 쪽이 있는지' 를 개수로 알 수 없다. 같은 까닭으로 폴더도 여기서 거른다.
        folders 를 주면 그 폴더들(hash) 안의 노트만 찾는다. None 이면 전체에서 찾는다.
        """
        if folders is not None and not folders:
            return []
        search_params = {
            "filter": [
                f'user_hash="{user_hash}"',
                f'is_deleted={"true" if is_deleted else "false"}',
            ],
            "limit": self.PAGE_SIZE,
            "offset": (max(page, 1) - 1) * self.PAGE_SIZE,
            "matchingStrategy": "all",
        }
        if folders is not None:
            quoted = ", ".join(f'"{folder}"' for folder in folders)
            search_params["filter"].append(f"folder IN [{quoted}]")

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
        "is_deleted",
        "folder",
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
