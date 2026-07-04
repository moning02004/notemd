"use client"

import {Suspense, useEffect, useRef} from "react"
import {useRouter, useSearchParams} from "next/navigation"
import {FiPlus} from "react-icons/fi"
import {useAuthStore} from "@/store/auth"
import {useNoteSelectStore} from "@/store/noteSelect"
import {downloadNoteRequest, gotoNote} from "@/lib/note"
import {Note} from "@/components/note"
import {LoadingPage} from "@/components/loading"
import NoteFilterBar from "@/components/note_filterbar"
import SelectActionBar from "@/components/select_action_bar"
import {useInfiniteNotes} from "@/hooks/useNotes"
import {useTags} from "@/hooks/useTags"
import {apiRequest} from "@/lib/api";
import toast from "react-hot-toast";
import {useNotesStore} from "@/store/notes";

function NoteListContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const {notes, setNotes, clearNotes} = useNotesStore()

    const {
        selectMode,
        selectedIds,
        exitSelectMode,
        toggleSelect,
    } = useNoteSelectStore()

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

    useEffect(() => {
        if (data) {
            const allNotes = data.pages.flat()
            setNotes(allNotes)
        }
    }, [data]);

    // ── 배치 액션 ────────────────────────────────────────────
    async function handleDownloadSelected() {
        await downloadNoteRequest([...selectedIds])
    }

    function handleDeleteSelected() {
        apiRequest.delete("/notes", {
            body: JSON.stringify({
                note_hashes: [...selectedIds],
            })
        }).then((note_hashes: Array<string>) => {
            toast.success("노트가 삭제되었습니다.")
            setNotes(notes.filter(note => !note_hashes.includes(note.hash_id)))
            exitSelectMode()
        })
    }

    function handleShareSelected() {
        // TODO: 선택 노트 공유/공개 설정
        console.log("share", [...selectedIds])
    }

    return (
        <>
            <NoteFilterBar tags={tagsData ?? []}/>

            <div
                className={`min-h-full pt-5 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 ${selectMode ? "pb-20" : ""}`}>
                {isLoading
                    ? <SkeletonCards/>
                    : notes.map(note => (
                        <Note
                            key={note.hash_id}
                            hashId={note.hash_id}
                            data-note-id={note.hash_id}
                            onClick={() => gotoNote({id: note.hash_id, router})}
                            title={note.title || "제목 없음"}
                            content={note.content}
                            ownerName={note.owner_name}
                            isPublic={note.is_public}
                            isProtected={note.is_protected}
                            created_at={note.created_at}
                            noteMenu={!selectMode}
                            selectable={selectMode}
                            selected={selectedIds.has(note.hash_id)}
                            onSelect={toggleSelect}
                        />
                    ))
                }
            </div>

            <div ref={sentinelRef} className="py-4 flex justify-center">
                {isFetchingNextPage && <SkeletonCards count={4}/>}
            </div>

            {selectMode ? (
                <SelectActionBar
                    selectedCount={selectedIds.size}
                    onDownload={handleDownloadSelected}
                    onDelete={handleDeleteSelected}
                    onShare={handleShareSelected}
                />
            ) : (
                <button
                    onClick={() => gotoNote({id: null, router})}
                    className="fixed right-0 bottom-[9vh] m-6 p-4 bg-white border rounded-full shadow-lg
                               hover:bg-gray-100 hover:shadow-xl transition-all duration-200"
                    aria-label="새 노트 작성"
                >
                    <FiPlus size={22}/>
                </button>
            )}
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
    const token = useAuthStore((state) => state.token)

    useEffect(() => {
        if (!token) router.replace("/login")
    }, [token])

    if (!token) return <LoadingPage/>

    return (
        <Suspense fallback={<LoadingPage/>}>
            <NoteListContent/>
        </Suspense>
    )
}