import io
import uuid
from pathlib import Path

import pillow_heif
from PIL import Image
from fastapi import UploadFile

from app.core.config import settings
from app.core.storages.base import Storage

pillow_heif.register_heif_opener()


class LocalStorage(Storage):
    name = "local"

    def __init__(self):
        super().__init__()
        self.upload_dir = Path(settings.STORAGE["name"])
        self.upload_dir.mkdir(exist_ok=True)

    async def save(self, file: UploadFile, **kwargs):
        ext = Path(file.filename).suffix.lower()

        # HEIC / HEIF 판별
        is_heic = ext in [".heic", ".heif"]

        # 최종 확장자
        final_ext = ".webp" if is_heic else ext
        filename = f"{uuid.uuid4().hex}{final_ext}"
        filepath = self.upload_dir / filename

        if is_heic:
            contents = await file.read()
            image = Image.open(io.BytesIO(contents))
            image.save(filepath, "WEBP", quality=90)
        else:
            with open(filepath, "wb") as f:
                while True:
                    chunk = await file.read(1024 * 1024)
                    if not chunk:
                        break
                    f.write(chunk)

        return f"/{self.upload_dir}/{filename}"
