from fastapi_clean_archi.core.commons.service import Service


class WorkspaceService(Service):
    def list_workspace(self, user_hash):
        workspaces = self.repository.find_workspace_by_user_hash(user_hash)
        return workspaces

    def create_workspace(self, user, request):
        workspace = self.repository.create_workspace(name=request.name, description=request.description)
        return workspace

    def delete_workspace(self, workspace_hash):
        self.repository.delete_workspace(workspace_hash)

    def add_into_workspace(self, workspace_hash, user_hash):
        result = self.repository.create_workspace_user(workspace_hash, user_hash)
        return result

    def get_workspace_users(self, workspace_hash):
        results = self.repository.find_workspace_users_by_hash(workspace_hash)

        results = [{"user_hash": user_hash, "user_name": name, "username": username}
                   for user_hash, name, username in results]
        return results

    def delete_from_workspace(self, workspace_hash, user_hash):
        self.repository.delete_user_from_workspace(workspace_hash, user_hash)

    def get_workspace_notes(self, user, hash_id):
        notes = self.repository.find_workspace_notes_by_hash(user_hash=user.hash_id, workspace_hash=hash_id)
        return notes
