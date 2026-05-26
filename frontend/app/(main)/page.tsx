// page.tsx
"use client"

import {Suspense, useEffect, useRef} from "react"
import {redirect, useRouter, useSearchParams} from "next/navigation"
import {FiPlus} from "react-icons/fi"
import {useAuthStore} from "@/store/auth"
import {gotoNote} from "@/lib/note"
import {Note} from "@/components/note"
import {LoadingPage} from "@/components/loading"
import NoteFilterBar from "@/components/note_filterbar"
import {useInfiniteNotes} from "@/hooks/useNotes"
import {useTags} from "@/hooks/useTags"

function NoteListContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const {data: tagsData} = useTags()
    const {
        data,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
    } = useInfiniteNotes(searchParams.toString())

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


    const notes = data?.pages.flat() ?? []

    return (
        <>
            <NoteFilterBar tags={tagsData ?? []}/>

            <div className="min-h-full pt-5 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5">
                {isLoading
                    ? <SkeletonCards/>
                    : notes.map(note => (
                        <Note
                            key={note.hash_id}
                            hashId={note.hash_id}
                            onClick={() => gotoNote({id: note.hash_id, router})}
                            title={note.title || "제목 없음"}
                            content={note.content}
                            ownerName={note.owner_name}
                            isPublic={note.is_public}
                            isProtected={note.is_protected}
                            created_at={note.created_at}
                            noteMenu
                        />
                    ))
                }
            </div>

            <div ref={sentinelRef} className="py-4 flex justify-center">
                {isFetchingNextPage && <SkeletonCards count={4}/>}
            </div>

            <button
                onClick={() => gotoNote({id: null, router})}
                className="fixed right-0 bottom-[9vh] m-6 p-4 bg-white border rounded-full shadow-lg
                           hover:bg-gray-100 hover:shadow-xl transition-all duration-200"
            >
                <FiPlus size={22}/>
            </button>
        </>
    )
}

function SkeletonCards({count = 8}: { count?: number }) {
    return (
        <>
            {Array.from({length: count}).map((_, i) => (
                <div key={i} className="mx-3 rounded w-[90%] h-[7rem] md:h-[17rem] bg-gray-200 animate-pulse"/>
            ))}
        </>
    )
}

export default function Page() {
    const router = useRouter()
    const token = useAuthStore((state) => state.token) // 상태 변화 구독

    useEffect(() => {
        if (!token) {
            router.replace("/login")
        }
    }, [token])

    if (!token) return <LoadingPage />

    return (
        <Suspense fallback={<LoadingPage/>}>
            <NoteListContent/>
        </Suspense>
    )
}