from abc import ABC, abstractmethod
from types import SimpleNamespace

import meilisearch
import meilisearch._httprequests as meilisearch_http
import requests

from app.core.config import settings

# meilisearch 클라이언트는 요청마다 requests.post 를 불러 연결을 새로 맺는다. 노트를 저장할 때마다 색인을 고치므로
# (공동 편집은 몇 초마다) 연결을 하나 두고 다시 쓴다. 요청 하나가 4.3ms → 2.1ms(scripts/perf).
# 클라이언트가 쓰는 자리(모듈의 requests)만 바꿔 끼운다. 예외 종류는 그대로 requests 의 것이다.
_session = requests.Session()
meilisearch_http.requests = SimpleNamespace(
    get=_session.get, post=_session.post, put=_session.put, patch=_session.patch, delete=_session.delete,
    exceptions=requests.exceptions, Response=requests.Response,
)


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
