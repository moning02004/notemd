from celery import Celery
from celery.schedules import crontab

from app.core.config import settings
from app.core.models_loader import load_all_models

# 워커는 tasks 가 쓰는 모델만 import 하므로, relationship 의 문자열 참조를 풀 수 있도록
# 매퍼가 설정되기 전에 전 모듈의 모델을 등록해둔다.
load_all_models()

celery_app = Celery(
    "mdnote",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.modules.note.application.tasks"],
)

celery_app.conf.timezone = "Asia/Seoul"

celery_app.conf.beat_schedule = {
    "purge-expired-trash-notes": {
        "task": "app.modules.note.application.tasks.purge_expired_trash_notes",
        "schedule": crontab(minute=0, hour=0),
    },
}
