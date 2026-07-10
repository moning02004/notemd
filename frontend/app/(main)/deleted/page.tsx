"use client"

import {Suspense, useEffect} from "react"
import {useRouter} from "next/navigation"
import {useAuthStore} from "@/store/auth"
import {useNoteSelectStore} from "@/store/noteSelect"
import {Note} from "@/components/note"
import {LoadingPage} from "@/components/loading"
import SelectActionBar from "@/components/select_action_bar"
import {useNoteListPaging} from "@/hooks/useNoteListPaging"
import {apiRequest} from "@/lib/api";
import toast from "react-hot-toast";
import {SkeletonLoading} from "@/components/skeleton";
import {useViewModeStore} from "@/store/viewMode";
import ViewModeToggle from "@/components/view_mode_toggle";

function NoteListContent() {
    const {viewMode} = useViewModeStore()
    const {notes, isLoading, isFetchingNextPage, sentinelRef, removeNotes} = useNoteListPaging("is_deleted=1")

    const {
        selectMode,
        selectedIds,
        exitSelectMode,
        toggleSelect,
    } = useNoteSelectStore()

    const handleRestoreSelected = async () => {
        await apiRequest.patch(`/notes/restore`,
            {body: JSON.stringify({note_hashes: [...selectedIds]})}
        ).then((note_hashes: Array<string>) => {
            toast.success("노트가 복구되었습니다.")
            removeNotes(note_hashes)
            exitSelectMode()
        })
    }
    const handleDeleteSelected = async () => {
        await apiRequest.delete(`/notes/permanently`,
            {body: JSON.stringify({note_hashes: [...selectedIds]})}
        ).then((note_hashes: Array<string>) => {
            toast.success("노트가 삭제되었습니다.")
            removeNotes(note_hashes)
            exitSelectMode()
        })
    }

    return (
        <>
            <div className="sticky top-0 z-10 backdrop-blur border-b border-[#E8E5DD] bg-white/80 flex items-center justify-end px-4 h-11">
                <ViewModeToggle/>
            </div>

            <div
                className={viewMode === "list"
                    ? `flex flex-col p-4 md:p-6 ${selectMode ? "pb-20" : ""}`
                    : `grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 pt-5 ${selectMode ? "pb-20" : ""}`
                }>
                {isLoading
                    ? <SkeletonLoading count={4}/>
                    : notes.map(note => (
                        <Note
                            key={note.hash_id}
                            hashId={note.hash_id}
                            data-note-id={note.hash_id}
                            title={note.title || "제목 없음"}
                            content={note.content}
                            created_at={note.created_at}
                            deletedMenu={!selectMode}
                            selectable={selectMode}
                            selected={selectedIds.has(note.hash_id)}
                            onSelect={toggleSelect}
                            viewMode={viewMode}
                        />
                    ))
                }
            </div>

            <div ref={sentinelRef} className="py-4 flex justify-center">
                {isFetchingNextPage && <SkeletonLoading count={4}/>}
            </div>

            {selectMode && (
                <SelectActionBar
                    selectedCount={selectedIds.size}
                    onRestore={handleRestoreSelected}
                    onDelete={handleDeleteSelected}
                />
            )}
        </>
    )
}

export default function Page() {
    const router = useRouter()
    const {token} = useAuthStore.getState();

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