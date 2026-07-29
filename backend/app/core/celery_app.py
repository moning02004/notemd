from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

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
        "schedule": crontab(hour=24),
    },
}
