from fastapi_clean_archi.core.db.base import BaseModel
from sqlalchemy import Column, ForeignKey, Integer, String, Table, Text
from sqlalchemy.orm import relationship

# 시리즈에 담긴 노트와 그 순서. 한 노트가 여러 시리즈에 들어갈 수 있다.
# 어느 쪽이든 영구 삭제되면 함께 지워진다. 휴지통에 간 노트는 줄을 남겨 두어 복원하면 제자리로 돌아온다.
series_note = Table(
    "series_note",
    BaseModel.metadata,
    Column("series_id", ForeignKey("series.id", ondelete="CASCADE"), primary_key=True),
    Column("note_id", ForeignKey("note.id", ondelete="CASCADE"), primary_key=True, index=True),
    Column("position", Integer, nullable=False, default=0),
)


class Series(BaseModel):
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    # relationships
    user = relationship("User", back_populates="series")
