from typing import List

from fastapi import HTTPException
from fastapi_clean_archi.core.commons.service import Service

from app.modules.note.domain.entity import DownloadResult


class SeriesService(Service):
    NotFoundSeries = HTTPException(status_code=404, detail="시리즈를 찾을 수 없습니다.")

    def __init__(self, repository, note_service=None):
        super().__init__(repository)
        self.note_service = note_service

    def _get_owned(self, user_id: int, series_hash: str):
        series = self.repository.get_by_hash_id_and_user_id(user_id=user_id, hash_id=series_hash)
        if series is None:
            raise self.NotFoundSeries
        return series

    @staticmethod
    def _clean_title(title: str | None) -> str:
        title = (title or "").strip()
        if not title:
            raise HTTPException(status_code=400, detail="시리즈 제목을 입력해주세요.")
        return title

    def _note_ids(self, user_id: int, note_hashes: List[str]) -> List[int]:
        """받은 순서 그대로의 노트 pk. 겹친 것, 남의 노트, 휴지통 노트는 뺀다."""
        by_hash = {note.hash_id: note.pk for note in self.repository.owned_notes(user_id, note_hashes)}
        note_ids = [by_hash[note_hash] for note_hash in dict.fromkeys(note_hashes) if note_hash in by_hash]
        if not note_ids:
            raise HTTPException(status_code=400, detail="시리즈에 담을 노트를 골라주세요.")
        return note_ids

    @staticmethod
    def _summary(series, note_count: int) -> dict:
        return {
            "hash_id": series.hash_id,
            "title": series.title,
            "description": series.description or "",
            "note_count": note_count,
            "is_public": bool(series.is_public),
            "updated_at": series.updated_at,
        }

    def _detail(self, series) -> dict:
        notes = self.repository.notes_of(series)
        return {
            **self._summary(series, len(notes)),
            "notes": [{"hash_id": note.hash_id, "title": note.title or ""} for note in notes],
        }

    # --- 조회 -----------------------------------------------------------------

    def list_series(self, user_id: int) -> List[dict]:
        series_list = self.repository.list_by_user_id(user_id)
        counts = self.repository.note_counts([series.pk for series in series_list])
        return [self._summary(series, counts.get(series.pk, 0)) for series in series_list]

    def get_series(self, user_id: int, series_hash: str) -> dict:
        return self._detail(self._get_owned(user_id, series_hash))

    def series_of_note(self, user_id: int, note_hash: str) -> List[dict]:
        """이 노트가 들어 있는 내 시리즈마다, 몇 번째인지와 앞·뒤 노트.

        시리즈는 만든 사람만 본다. 남의 노트이거나 어느 시리즈에도 없으면 빈 목록이다.
        """
        notes = self.repository.owned_notes(user_id, [note_hash])
        if not notes:
            return []

        result = []
        for series in self.repository.series_containing(user_id, notes[0].pk):
            members = self.repository.notes_of(series)
            index = next(i for i, member in enumerate(members) if member.hash_id == note_hash)

            def neighbor(i: int):
                if not 0 <= i < len(members):
                    return None
                return {"hash_id": members[i].hash_id, "title": members[i].title or ""}

            result.append({
                "hash_id": series.hash_id,
                "title": series.title,
                "is_public": bool(series.is_public),
                "position": index + 1,
                "total": len(members),
                "prev": neighbor(index - 1),
                "next": neighbor(index + 1),
            })
        return result

    # --- 변경 -----------------------------------------------------------------

    def create_series(self, user_id: int, request) -> dict:
        series = self.repository.create_series(
            user_id=user_id,
            title=self._clean_title(request.title),
            description=(request.description or "").strip() or None,
            note_ids=self._note_ids(user_id, request.note_hashes),
        )
        return self._detail(series)

    def update_series(self, user_id: int, series_hash: str, request) -> dict:
        series = self._get_owned(user_id, series_hash)

        note_ids = None
        if request.note_hashes is not None:
            # 화면은 휴지통 노트를 보여주지 않는다. 순서를 고쳐 저장해도 그 자리는 남겨 두어 복원하면 돌아오게 한다.
            note_ids = self._note_ids(user_id, request.note_hashes) + self.repository.trashed_note_ids_of(series)

        series = self.repository.update_series(
            series,
            title=self._clean_title(request.title) if request.title is not None else None,
            description=request.description.strip() if request.description is not None else None,
            note_ids=note_ids,
            is_public=request.is_public,
        )
        return self._detail(series)

    def get_public_series(self, series_hash: str) -> dict:
        """링크로 공개한 시리즈. 로그인 없이 읽는다. 공개가 아니면 있는지도 알리지 않는다.

        비밀번호가 걸린 노트는 제목도 비밀번호 뒤에 있다(본문 링크·백링크와 같은 규칙). 잠긴 줄로만 보여준다.
        """
        series = self.repository.get_public(series_hash)
        if series is None:
            raise self.NotFoundSeries
        notes = self.repository.notes_of(series)
        return {
            "hash_id": series.hash_id,
            "title": series.title,
            "description": series.description or "",
            "owner_name": series.user.name,
            "notes": [{"hash_id": note.hash_id,
                       "title": "" if note.is_password else (note.title or ""),
                       "is_locked": note.is_password} for note in notes],
        }

    def delete_series(self, user_id: int, series_hash: str) -> None:
        self.repository.delete_series(self._get_owned(user_id, series_hash))

    # --- 내보내기 --------------------------------------------------------------

    async def download_series(self, user, series_hash: str, file_format: str) -> DownloadResult:
        """PDF 는 노트를 순서대로 이어 붙인 한 권으로, 마크다운은 '순서. 노트 제목' 파일을 담은 zip 으로 준다."""
        series = self._get_owned(user.pk, series_hash)
        note_hashes = [note.hash_id for note in self.repository.notes_of(series)]
        if not note_hashes:
            raise HTTPException(status_code=404, detail="내보낼 노트가 없습니다.")
        if file_format == "pdf":
            return await self.note_service.download_series_pdf(user_hash=user.hash_id,
                                                               note_hashes=note_hashes,
                                                               title=series.title,
                                                               description=series.description)
        return await self.note_service.download_numbered_zip(user_hash=user.hash_id,
                                                             note_hashes=note_hashes,
                                                             zip_title=series.title,
                                                             file_format=file_format)
