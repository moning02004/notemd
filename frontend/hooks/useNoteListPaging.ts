import {useEffect, useRef} from "react"
import {useInfiniteNotes} from "@/hooks/useNotes"
import {useNotesStore} from "@/store/notes"

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
        if (data) {
            const allNotes = data.pages.flat()
            setNotes(allNotes)
        }
    }, [data])

    const removeNotes = (hashIds: string[]) => {
        setNotes(notes.filter(note => !hashIds.includes(note.hash_id)))
    }

    return {notes, setNotes, isLoading, isFetchingNextPage, sentinelRef, removeNotes}
}