from dataclasses import asdict
from typing import List

from fastapi import HTTPException
from fastapi_clean_archi.core.commons.service import Service

from app.modules.folder.domain.entity import FolderEntity, FolderNode
from app.modules.note.domain.entity import build_note_document

# 데이터 모델은 깊이를 막지 않지만, 이 이상은 사이드바에서 이름이 잘려 읽기 어렵다.
MAX_DEPTH = 3


class FolderService(Service):
    NotFoundFolder = HTTPException(status_code=404, detail="폴더를 찾을 수 없습니다.")

    def __init__(self, repository, search_service=None):
        super().__init__(repository)
        self.search_service = search_service

    # --- 조회 -----------------------------------------------------------------

    def list_folders(self, user_id: int) -> List[FolderNode]:
        """트리를 통째로 돌려준다. 폴더 수는 많아야 수십 개라 한 번에 보내는 편이
        펼칠 때마다 요청하는 것보다 빠르고 단순하다."""
        folders = self.repository.list_by_user_id(user_id)
        counts = self.repository.note_count_by_folder(user_id)

        by_parent = {}
        by_pk = {}
        for folder in folders:
            by_parent.setdefault(folder.parent_id, []).append(folder)
            by_pk[folder.pk] = folder

        def build(folder, depth, parent_path):
            path = f"{parent_path} / {folder.name}" if parent_path else folder.name
            node = FolderNode(
                hash_id=folder.hash_id,
                name=folder.name,
                parent_hash=by_pk[folder.parent_id].hash_id if folder.parent_id else None,
                depth=depth,
                path=path,
                note_count=counts.get(folder.pk, 0),
            )
            node.children = [build(child, depth + 1, path) for child in by_parent.get(folder.pk, [])]
            node.total_count = node.note_count + sum(child.total_count for child in node.children)
            return node

        return [build(folder, 0, "") for folder in by_parent.get(None, [])]

    def count_unfiled(self, user_id: int) -> int:
        return self.repository.unfiled_note_count(user_id)

    # --- 변경 -----------------------------------------------------------------

    def _get_owned(self, user_id: int, folder_hash: str):
        folder = self.repository.get_by_hash_id_and_user_id(user_id=user_id, hash_id=folder_hash)
        if folder is None:
            raise self.NotFoundFolder
        return folder

    def _depth_of(self, folder) -> int:
        depth = 0
        while folder.parent_id:
            folder = folder.parent
            depth += 1
        return depth

    def _subtree_height(self, folder) -> int:
        if not folder.children:
            return 0
        return 1 + max(self._subtree_height(child) for child in folder.children)

    def _guard_depth(self, parent, moving=None):
        depth = (self._depth_of(parent) + 1) if parent else 0
        if moving is not None:
            depth += self._subtree_height(moving)
        if depth >= MAX_DEPTH:
            raise HTTPException(status_code=400,
                                detail=f"폴더는 {MAX_DEPTH}단계까지만 만들 수 있습니다.")

    def create_folder(self, user_id: int, request):
        name = (request.name or "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="폴더 이름을 입력해주세요.")

        parent = self._get_owned(user_id, request.parent) if request.parent else None
        self._guard_depth(parent)

        return self.repository.create_folder(
            FolderEntity(user_id=user_id, name=name, parent_id=parent.pk if parent else None)
        )

    def update_folder(self, user_id: int, folder_hash: str, request):
        folder = self._get_owned(user_id, folder_hash)

        name = None
        if request.name is not None:
            name = request.name.strip()
            if not name:
                raise HTTPException(status_code=400, detail="폴더 이름을 입력해주세요.")

        parent_id = -1
        if "parent" in request.model_fields_set:
            if request.parent is None:
                parent_id = None
            else:
                parent = self._get_owned(user_id, request.parent)
                if parent.pk == folder.pk or self._is_descendant(parent, folder):
                    raise HTTPException(status_code=400, detail="폴더를 자기 자신의 하위로는 옮길 수 없습니다.")
                self._guard_depth(parent, moving=folder)
                parent_id = parent.pk

        return self.repository.update_folder(folder, name=name, parent_id=parent_id)

    def _is_descendant(self, candidate, folder) -> bool:
        cursor = candidate
        while cursor.parent_id:
            if cursor.parent_id == folder.pk:
                return True
            cursor = cursor.parent
        return False

    def delete_folder(self, user_id: int, folder_hash: str) -> int:
        """폴더와 하위 폴더를 지우고, 그 안에 있던 노트는 휴지통으로 보낸다.

        노트를 즉시 지우지 않는 것은 휴지통 정책과 같은 이유이고, folder_id 는
        FK 의 ON DELETE SET NULL 로 비워져 복구하면 미분류로 돌아간다.
        """
        folder = self._get_owned(user_id, folder_hash)

        folder_ids = [folder.pk]
        stack = list(folder.children)
        while stack:
            child = stack.pop()
            folder_ids.append(child.pk)
            stack.extend(child.children)

        notes = self.repository.find_notes_in_folders(user_id=user_id, folder_ids=folder_ids)
        trashed = self.repository.soft_delete_notes(notes)
        self._reindex(trashed)

        self.repository.delete_folder(folder)
        return len(trashed)

    def create_from_tags(self, user_id: int, keywords: List[str]) -> dict:
        """이미 쓰고 있는 태그를 폴더로 승격시키고, 그 태그가 붙은 미분류 노트를 옮긴다.

        3.5.x 까지 폴더 없이 쌓인 노트를 처음 정리할 때 쓰는 일회성 경로다.
        한 노트에 태그가 여럿이면 그중 노트 수가 가장 많은 태그의 폴더로 넣는다.
        확실한 쪽 하나만 자동으로 정하고 나머지는 사용자가 옮기게 두는 편이,
        틀린 자동 분류를 되돌리는 것보다 낫다.
        """
        keywords = [keyword.strip() for keyword in keywords if keyword and keyword.strip()]
        if not keywords:
            raise HTTPException(status_code=400, detail="폴더로 만들 태그를 선택해주세요.")

        notes = self.repository.find_unfiled_notes_with_tags(user_id)

        # 태그별 노트 수 — 어느 태그가 이기는지 정하는 기준
        popularity = {keyword: 0 for keyword in keywords}
        for note in notes:
            for tag in note.tags:
                if tag.keyword in popularity:
                    popularity[tag.keyword] += 1

        existing = {folder.name: folder for folder in self.repository.list_by_user_id(user_id)}
        folders = {}
        created = 0
        for keyword in keywords:
            if keyword in existing:
                folders[keyword] = existing[keyword]
                continue
            self._guard_depth(None)
            folders[keyword] = self.repository.create_folder(
                FolderEntity(user_id=user_id, name=keyword, parent_id=None))
            created += 1

        moved = []
        for note in notes:
            candidates = [tag.keyword for tag in note.tags if tag.keyword in folders]
            if not candidates:
                continue
            winner = max(candidates, key=lambda keyword: popularity[keyword])
            note.folder_id = folders[winner].pk
            moved.append(note)

        if moved:
            self.repository.db.commit()

        return {"created_folder_count": created, "moved_note_count": len(moved)}

    def move_notes(self, user_id: int, note_hashes: List[str], folder_hash: str | None):
        folder = self._get_owned(user_id, folder_hash) if folder_hash else None
        notes = self.repository.move_notes(user_id=user_id,
                                           note_hashes=note_hashes,
                                           folder_id=folder.pk if folder else None)
        return [note.hash_id for note in notes]

    def _reindex(self, notes):
        if not self.search_service:
            return
        for note in notes:
            self.search_service.add_to_index(asdict(build_note_document(note)))
