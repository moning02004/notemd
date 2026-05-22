// hooks/useNotes.ts
import {useInfiniteQuery} from "@tanstack/react-query"
import {apiRequest} from "@/lib/api"
import {NoteCard} from "@/types/note"

const PAGE_SIZE = 20

export function useInfiniteNotes(searchParams: string) {
    return useInfiniteQuery({
        queryKey: ["notes", searchParams],
        queryFn: ({pageParam = 1}) => {
            const params = searchParams ? `?${searchParams}&page=${pageParam}` : `?page=${pageParam}`
            return apiRequest.get<NoteCard[]>(`/notes${params}`)
        },
        getNextPageParam: (lastPage, _, lastPageParam) =>
            lastPage.length === PAGE_SIZE ? lastPageParam + 1 : undefined,
        initialPageParam: 1,
    })
}