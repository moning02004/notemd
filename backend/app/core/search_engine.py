from abc import ABC, abstractmethod

import meilisearch

from app.core.config import settings


class SearchEngine(ABC):
    @abstractmethod
    def get_index(self, name: str = None): ...


class MeilisearchEngine(SearchEngine):
    def __init__(self):
        self.client = meilisearch.Client(
            url=settings.MEILISEARCH_URL,
            api_key=settings.MEILISEARCH_MASTER_KEY,
        )

    def get_index(self, index_uid: str = None):
        return self.client.index(index_uid or settings.MEILISEARCH_INDEX_UID)


search_engine = MeilisearchEngine()
