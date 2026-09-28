import io
import re
import uuid
from pathlib import Path

import pillow_heif
from PIL import Image
from fastapi import UploadFile

from app.core.config import settings
from app.core.storages.base import Storage

pillow_heif.register_heif_opener()

# 저장할 때 만드는 이름(uuid hex + 확장자) 모양만 받는다. '../' 같은 경로로 업로드 폴더 밖을 읽지 못하게 한다.
STORED_NAME = re.compile(r"^[A-Za-z0-9_-]+\.[A-Za-z0-9]+$")


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

    def read(self, name: str) -> bytes | None:
        if not STORED_NAME.match(name):
            return None
        path = self.upload_dir / name
        return path.read_bytes() if path.is_file() else None
