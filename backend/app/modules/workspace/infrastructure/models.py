from fastapi_clean_archi.core.db.base import BaseModel
from sqlalchemy import Column, String, ForeignKey, Table, func
from sqlalchemy.orm import relationship, object_session

workspace_member = Table(
    "workspace_member",
    BaseModel.metadata,
    Column("workspace_id", ForeignKey("workspace.id"), primary_key=True),
    Column("user_id", ForeignKey("user.id"), primary_key=True, index=True),
)


class Workspace(BaseModel):
    name = Column(String, nullable=False)
    description = Column(String, default="")

    users = relationship("User", secondary="workspace_member", back_populates="workspaces")
    notes = relationship("Note", secondary="workspace_note", back_populates="workspaces")

    @property
    def user_count(self):
        return object_session(self).query(func.count()).select_from(workspace_member).filter(
            workspace_member.c.workspace_id == self.pk
        ).scalar()
