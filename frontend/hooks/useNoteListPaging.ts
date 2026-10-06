import {useEffect, useRef} from "react"
import {useInfiniteNotes} from "@/hooks/useNotes"
import {useNotesStore} from "@/store/notes"
import Cookies from "js-cookie";
import {useQueryClient} from "@tanstack/react-query";
import {flushNote, takeNoteLeft} from "@/lib/note";

export function useNoteListPaging(query: string, endPoint: string = "/notes", enabled: boolean = true) {
    const {notes, setNotes} = useNotesStore()

    const {
        data,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
    } = useInfiniteNotes(endPoint, query, enabled)

    const sentinelRef = useRef<HTMLDivElement>(null)

    // 방금 편집 화면에서 돌아왔으면 그 노트의 저장을 당기고 목록을 한 번 더 읽는다.
    // 공동 편집의 저장이 몇 초 늦어, 그냥 읽으면 방금 쓴 내용이 빠진 목록이 나온다.
    const queryClient = useQueryClient()
    useEffect(() => {
        const noteId = takeNoteLeft()
        if (!noteId) return
        flushNote(noteId).then(() => queryClient.invalidateQueries({queryKey: ["notes"]}))
    }, [queryClient])

    useEffect(() => {
        const el = sentinelRef.current
        if (!el) return

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && hasNextPage) fetchNextPage()
            },
            {threshold: 0.1}
        )
        observer.observe(el)
        return () => observer.disconnect()
    }, [hasNextPage, fetchNextPage])

    useEffect(() => {
        Cookies.remove('is_first_edit')
        if (data) {
            const allNotes = data.pages.flat()
            setNotes(allNotes)
        }
    }, [data, setNotes])

    const removeNotes = (hashIds: string[]) => {
        setNotes(notes.filter(note => !hashIds.includes(note.hash_id)))
    }

    return {notes, setNotes, isLoading, isFetchingNextPage, sentinelRef, removeNotes}
}