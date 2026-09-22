from fastapi_clean_archi.core.db.base import BaseModel
from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship


class Folder(BaseModel):
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    parent_id = Column(Integer, ForeignKey("folder.id", ondelete="CASCADE"), nullable=True, index=True)

    # relationships
    user = relationship("User", back_populates="folders")
    parent = relationship("Folder", remote_side="Folder.pk", back_populates="children")
    children = relationship("Folder", back_populates="parent", cascade="all, delete-orphan")
    # 폴더를 지워도 노트는 지우지 않는다(ondelete=SET NULL). 노트는 휴지통으로 보내고
    # 복구했을 때 폴더가 이미 없으면 미분류로 돌아가게 하기 위한 설계다.
    notes = relationship("Note", back_populates="folder")
