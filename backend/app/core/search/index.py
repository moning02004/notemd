import os

from app.core.search.client import get_opensearch_client

MAPPING = {
    "settings": {
        "analysis": {
            "tokenizer": {
                "edge_ngram_tokenizer": {
                    "type": "edge_ngram",
                    "min_gram": 1,
                    "max_gram": 3,
                    "token_chars": ["letter", "digit"]
                }
            },
            "analyzer": {
                "korean": {
                    "type": "custom",
                    "tokenizer": "nori_tokenizer",
                    "filter": ["lowercase"]
                },
                "korean_ngram": {
                    "type": "custom",
                    "tokenizer": "edge_ngram_tokenizer",
                    "filter": ["lowercase"]
                }
            }
        }
    },
    "mappings": {
        "properties": {
            "note_hash": {"type": "keyword"},
            "user_hash": {"type": "keyword"},
            "title": {
                "type": "text",
                "analyzer": "korean_ngram",
                "search_analyzer": "korean",
                "copy_to": "full_text"
            },
            "content": {
                "type": "text",
                "analyzer": "korean_ngram",
                "search_analyzer": "korean",
                "copy_to": "full_text"
            },
            "is_deleted": {"type": "boolean"},
            "full_text": {
                "type": "text",
                "analyzer": "korean_ngram",
                "search_analyzer": "korean"
            },
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