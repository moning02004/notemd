from fastapi_clean_archi.core.db.base import BaseModel
from sqlalchemy import Column, Integer, ForeignKey, String, Enum
from sqlalchemy.orm import relationship


class Preference(BaseModel):
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, unique=True)

    snapshot_policy = Column(Enum("ON_FIRST_EDIT", "ON_EVERY_EDIT", "MANUAL",
                               name="snapshot_policy_enum",
                               native_enum=False), nullable=False, default="MANUAL")
    trash_policy = Column(Enum("15_DAYS", "30_DAYS", "NEVER",
                               name="trash_policy_enum",
                               native_enum=False), nullable=False, default="30_DAYS")
    # 노트 본문 폭. 화면이 아니라 사람에 붙는다(공유 노트에서 남의 화면 폭을 바꾸지 않는다). 기기 사이에 따라온다.
    editor_width = Column(Enum("WIDE", "NORMAL", "NARROW",
                               name="editor_width_enum",
                               native_enum=False), nullable=False, default="WIDE", server_default="WIDE")

    # relationships
    user = relationship("User", back_populates="preference")

    @property
    def is_superuser(self):
        return self.user.is_superuser
