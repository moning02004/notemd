import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query"
import toast from "react-hot-toast"
import {apiRequest} from "@/lib/api"
import {FolderTree} from "@/types/folder"

const FOLDERS_KEY = ["folders"]

export function useFolders(enabled: boolean = true) {
    return useQuery({
        queryKey: FOLDERS_KEY,
        queryFn: () => apiRequest.get<FolderTree>("/folders"),
        enabled,
        staleTime: 1000 * 60,
    })
}

/** 폴더가 바뀌면 노트 목록의 개수·소속도 같이 흔들리므로 둘 다 무효화한다. */
export function useFolderInvalidate() {
    const queryClient = useQueryClient()
    return () => {
        queryClient.invalidateQueries({queryKey: FOLDERS_KEY})
        queryClient.invalidateQueries({queryKey: ["notes"]})
    }
}

export function useCreateFolder() {
    const invalidate = useFolderInvalidate()
    return useMutation({
        mutationFn: ({name, parent}: { name: string, parent?: string | null }) =>
            apiRequest.post<{ hash_id: string, name: string }>("/folders", {
                body: JSON.stringify({name, parent: parent ?? null}),
            }),
        onSuccess: invalidate,
        onError: (error: Error) => toast.error(error.message),
    })
}

export function useRenameFolder() {
    const invalidate = useFolderInvalidate()
    return useMutation({
        mutationFn: ({hashId, name}: { hashId: string, name: string }) =>
            apiRequest.patch(`/folders/${hashId}`, {body: JSON.stringify({name})}),
        onSuccess: invalidate,
        onError: (error: Error) => toast.error(error.message),
    })
}

export function useMoveFolder() {
    const invalidate = useFolderInvalidate()
    return useMutation({
        mutationFn: ({hashId, parent}: { hashId: string, parent: string | null }) =>
            apiRequest.patch(`/folders/${hashId}`, {body: JSON.stringify({parent})}),
        onSuccess: invalidate,
        onError: (error: Error) => toast.error(error.message),
    })
}

export function useDeleteFolder() {
    const invalidate = useFolderInvalidate()
    return useMutation({
        mutationFn: (hashId: string) =>
            apiRequest.delete<{ trashed_note_count: number }>(`/folders/${hashId}`),
        onSuccess: (result) => {
            invalidate()
            toast.success(result.trashed_note_count > 0
                ? `폴더를 지웠습니다. 안에 있던 노트 ${result.trashed_note_count}개는 휴지통에 있습니다.`
                : "폴더를 지웠습니다.")
        },
        onError: (error: Error) => toast.error(error.message),
    })
}

export function useMoveNotes() {
    const invalidate = useFolderInvalidate()
    return useMutation({
        mutationFn: ({noteHashes, folder}: { noteHashes: string[], folder: string | null }) =>
            apiRequest.patch<string[]>("/folders/notes", {
                body: JSON.stringify({note_hashes: noteHashes, folder}),
            }),
        onSuccess: invalidate,
        onError: (error: Error) => toast.error(error.message),
    })
}
