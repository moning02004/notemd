from app.core.commons.repository import Repository

from app.modules.note.infrastructure.models import Note


class NoteRepository(Repository):
    DB_MODEL = Note
