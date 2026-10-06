from typing import List

from fastapi_clean_archi.core.commons.service import Service


class SearchService(Service):

    def find_documents(self, keyword, user_hash, sort, page, is_deleted=False):
        return self.repository.search_index(keyword, user_hash, sort, page, is_deleted=is_deleted)

    def add_to_index(self, data: dict):
        return self.repository.upsert(data)

    def delete_from_index(self, doc_ids: List[str]) -> None:
        return self.repository.delete(doc_ids)