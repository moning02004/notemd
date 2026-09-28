import {ApiError, apiRequest} from "@/lib/api"
import Cookies from "js-cookie";
import {NoteDetailResponse} from "@/types/note";

export type NotePatchData = Partial<{
    title: string | null
    content: string
    is_public: boolean
    is_protected: boolean
    is_encrypted: boolean
    password: string
    tags: string[]
    workspaces: string[]
    is_first_edit: boolean
    /** 편집 화면이 마지막으로 받은 버전. 그 사이 다른 곳에서 저장했으면 서버가 409 로 거절한다. */
    base_updated_at: string
}>

export type NotePatchResult =
    | { ok: true, updatedAt: string | null }
    | { ok: false, conflict: boolean }

/** 노트 PATCH + 상태 반영(complete/warning) 공통 로직. 디바운스·순서는 호출부가 결정. */
export function useNotePatch(setStatusType: (status: string) => void) {
    return async (noteId: string, data: NotePatchData): Promise<NotePatchResult> => {
        try {
            const response = await apiRequest.patch<NoteDetailResponse>(`/notes/${noteId}`, {
                body: JSON.stringify(data)
            }, {isSilent: true})
            setStatusType("complete")
            Cookies.set('is_first_edit', '0')
            return {ok: true, updatedAt: response?.updated_at ?? null}
        } catch (error) {
            setStatusType("warning")
            const conflict = error instanceof ApiError && error.status === 409 && Boolean(error.detail?.is_conflict)
            return {ok: false, conflict}
        }
    }
}
