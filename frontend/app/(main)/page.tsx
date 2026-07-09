"use client"

import {Suspense, useEffect} from "react"
import {useRouter, useSearchParams} from "next/navigation"
import {FiPlus} from "react-icons/fi"
import {useAuthStore} from "@/store/auth"
import {useNoteSelectStore} from "@/store/noteSelect"
import {downloadNoteRequest, gotoNote} from "@/lib/note"
import {Note} from "@/components/note"
import {LoadingPage} from "@/components/loading"
import NoteFilterBar from "@/components/note_filterbar"
import SelectActionBar from "@/components/select_action_bar"
import {useNoteListPaging} from "@/hooks/useNoteListPaging"
import {useTags} from "@/hooks/useTags"
import {apiRequest} from "@/lib/api";
import toast from "react-hot-toast";
import {SkeletonLoading} from "@/components/skeleton";

function NoteListContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const {data: tagsData} = useTags()

    const {notes, isLoading, isFetchingNextPage, sentinelRef, removeNotes} =
        useNoteListPaging(searchParams.toString())

    const {
        selectMode,
        selectedIds,
        exitSelectMode,
        toggleSelect,
    } = useNoteSelectStore()

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
            removeNotes(note_hashes)
            exitSelectMode()
        })
    }

    return (
        <div className="min-h-screen">
            <div className="sticky top-0 z-10 backdrop-blur border-b border-[#E8E5DD]">
                <NoteFilterBar tags={tagsData ?? []}/>
            </div>

            <div
                className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4 md:p-6 ${selectMode ? "pb-24" : "pb-24"}`}>
                {isLoading
                    ? <SkeletonLoading count={4}/>
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
                {isFetchingNextPage && <SkeletonLoading count={4}/>}
            </div>

            {selectMode ? (
                <SelectActionBar
                    selectedCount={selectedIds.size}
                    onDownload={handleDownloadSelected}
                    onDelete={handleDeleteSelected}
                />
            ) : (
                <button
                    onClick={() => gotoNote({id: null, router})}
                    className="fixed right-5 bottom-[calc(9vh+1rem)] flex items-center gap-2 pl-4 pr-5 py-3.5
                               bg-[#3F6C51] text-white rounded-full shadow-lg cursor-pointer
                               hover:bg-[#345A44] hover:shadow-xl active:scale-95
                               transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    aria-label="새 노트 작성"
                >
                    <FiPlus size={20}/>
                    <span className="hidden sm:inline text-sm font-medium">새 노트</span>
                </button>
            )}
        </div>
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