from app.core.storages.base import Storage
from app.core.storages.local_storage import LocalStorage


def get_storage() -> Storage:
    return LocalStorage()