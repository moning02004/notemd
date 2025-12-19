import uuid
from pathlib import Path

from fastapi import UploadFile

from app.core.config import settings
from app.core.storages.base import Storage


class LocalStorage(Storage):
    name = "local"

    def __init__(self):
        super().__init__()
        self.upload_dir = Path(settings.STORAGE["name"])
        self.upload_dir.mkdir(exist_ok=True)

    async def save(self, file: UploadFile, **kwargs):
        ext = Path(file.filename).suffix.lower()
        filename = f"{uuid.uuid4().hex}{ext}"
        filepath = self.upload_dir / filename

        with open(filepath, "wb") as f:
            while True:
                chunk = await file.read(1024 * 1024)  # 1MB
                if not chunk:
                    break
                f.write(chunk)

        return f"/{self.upload_dir}/{filename}"
