from functools import lru_cache

from opensearchpy import OpenSearch

from app.core.config import settings


@lru_cache()
def get_opensearch_client() -> OpenSearch:
    return OpenSearch(
        hosts=[{"host": settings.OPENSEARCH_HOST, "port": settings.OPENSEARCH_PORT}],
        http_auth=(settings.OPENSEARCH_USER, settings.OPENSEARCH_PASSWORD),
        use_ssl=False,
        verify_certs=False,
        retry_on_timeout=True,
        max_retries=3,
    )
