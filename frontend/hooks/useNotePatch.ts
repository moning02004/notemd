import {apiRequest} from "@/lib/api"
import Cookies from "js-cookie";

type NotePatchData = Partial<{
    title: string | null
    content: string
    is_public: boolean
    is_protected: boolean
    is_encrypted: boolean
    password: string
    tags: string[]
    workspaces: string[]
}>

/** 노트 PATCH + 상태 반영(complete/warning) 공통 로직. 디바운스 여부는 호출부가 결정. */
export function useNotePatch(setStatusType: (status: string) => void) {
    return (noteId: string, data: NotePatchData) => {
        return apiRequest.patch(`/notes/${noteId}`, {
            body: JSON.stringify(data)
        }).then(() => {
            setStatusType("complete")
            Cookies.set('is_first_edit', '0')
        }).catch(() => {
            setStatusType("warning")
        })
    }
}
