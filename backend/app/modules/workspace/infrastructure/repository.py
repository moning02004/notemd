from fastapi import HTTPException
from fastapi_clean_archi.core.commons.repository import Repository

from app.modules.workspace.infrastructure.models import Workspace, workspace_member
from app.modules.user.infrastructure.models import User


class WorkspaceRepository(Repository):
    DB_MODEL = Workspace

    def find_workspace_by_user_hash(self, user_hash):
        return self.db.query(Workspace).all()

    def create_workspace(self, name, description):
        workspace = Workspace(name=name, description=description)
        self.db.add(workspace)
        self.db.commit()
        self.db.refresh(workspace)
        return workspace

    def delete_workspace(self, workspace_hash):
        workspace = self.db.query(Workspace).filter(Workspace.hash_id == workspace_hash).first()
        if workspace is None:
            raise HTTPException(status_code=404, detail="워크스페이스를 찾을 수 없습니다.")
        self.db.delete(workspace)
        self.db.commit()

    def create_workspace_user(self, workspace_hash, user_hash):
        workspace = self.db.query(Workspace).filter(Workspace.hash_id == workspace_hash).first()
        if workspace is None:
            raise HTTPException(status_code=404, detail="워크스페이스를 찾을 수 없습니다.")

        user = self.db.query(User).filter(User.hash_id == user_hash).first()
        if user is None:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

        self.db.execute(
            workspace_member.insert().values(
                workspace_id=workspace.pk,
                user_id=user.pk,
            )
        )
        self.db.commit()

        return {
            "user_hash": user.hash_id,
            "user_name": user.name,
            "username": user.username,
        }

    def find_workspace_users_by_hash(self, workspace_hash):
        workspace = self.db.query(Workspace).filter(Workspace.hash_id == workspace_hash).first()
        if workspace is None:
            raise HTTPException(status_code=404, detail="워크스페이스를 찾을 수 없습니다.")

        results = (
            self.db.query(User.hash_id, User.name, User.username)
            .join(workspace_member, User.pk == workspace_member.c.user_id)
            .filter(workspace_member.c.workspace_id == workspace.pk)
            .all()
        )
        return results

    def delete_user_from_workspace(self, workspace_hash, user_hash):
        workspace = self.db.query(Workspace).filter(Workspace.hash_id == workspace_hash).first()
        if workspace is None:
            raise HTTPException(status_code=404, detail="워크스페이스를 찾을 수 없습니다.")

        user = self.db.query(User).filter(User.hash_id == user_hash).first()
        if user is None:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

        self.db.execute(
            workspace_member.delete().where(workspace_member.c.workspace_id == workspace.pk,
                                            workspace_member.c.user_id == user.pk)
        )
        self.db.commit()

    def find_workspace_notes_by_hash(self, user_hash, workspace_hash):
        workspace = self.db.query(Workspace).filter(Workspace.hash_id == workspace_hash).first()
        if workspace is None:
            raise HTTPException(status_code=404, detail="워크스페이스를 찾을 수 없습니다.")

        user = self.db.query(User).filter(User.hash_id == user_hash).first()
        if user is None:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

        if not user.is_superuser and not self.db.query(workspace_member).filter(
                workspace_member.c.workspace_id == workspace.pk,
                workspace_member.c.user_id == user.pk
        ).first():
            raise HTTPException(status_code=403, detail="사용자가 워크스페이스에 속해있지 않습니다.")

        return workspace.notes