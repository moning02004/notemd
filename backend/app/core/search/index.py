import os

from app.core.search.client import get_opensearch_client

MAPPING = {
    "settings": {
        "analysis": {
            "analyzer": {
                "korean": {
                    "type": "custom",
                    "tokenizer": "nori_tokenizer",
                    "filter": ["lowercase"]
                }
            }
        }
    },
    "mappings": {
        "properties": {
            "note_hash": {"type": "keyword"},
            "user_hash": {"type": "keyword"},
            "title": {"type": "text", "analyzer": "korean", "copy_to": "full_text"},
            "content": {"type": "text", "analyzer": "korean", "copy_to": "full_text"},
            "is_deleted": {"type": "boolean"},
            "full_text": {"type": "text", "analyzer": "korean"},
            "created_at": {"type": "date", "format": "strict_date_optional_time||epoch_millis"},
            "updated_at": {"type": "date", "format": "strict_date_optional_time||epoch_millis"},
        }
    }
}


def ensure_index():
    """앱 시작 시 호출 — 없으면 생성, 있으면 스킵"""
    client = get_opensearch_client()
    if not client.indices.exists(index=os.environ["OPENSEARCH_INDEX_NAME"]):
        client.indices.create(index=os.environ["OPENSEARCH_INDEX_NAME"], body=MAPPING)
