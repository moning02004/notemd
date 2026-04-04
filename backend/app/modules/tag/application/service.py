from fastapi_clean_archi.core.commons.service import Service


class TagService(Service):
    def list_tags_with_note_count(self, total):
        return self.repository.list_tags_with_note_count(total)
