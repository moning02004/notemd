"use client"

import {Suspense, useEffect, useState} from "react"
import {useRouter, useSearchParams} from "next/navigation"
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
import {useViewModeStore} from "@/store/viewMode";
import NotePasswordModal from "@/components/note/password_modal";

function NoteListContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const {data: tagsData} = useTags()
    const {viewMode} = useViewModeStore()

    const {notes, isLoading, isFetchingNextPage, sentinelRef, removeNotes} =
        useNoteListPaging(searchParams.toString())

    const {
        selectMode,
        selectedIds,
        exitSelectMode,
        toggleSelect,
    } = useNoteSelectStore()

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
        <div className="min-h-[100%] bg-surface">
            <div className="sticky top-0 z-10 bg-surface backdrop-blur">
                <NoteFilterBar tags={tagsData ?? []}/>
            </div>

            <div
                className={viewMode === "list"
                    ? "flex flex-col p-4 md:p-6 pb-24"
                    : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4 md:p-6 pb-24"
                }>
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
                            isPublic={note.is_public}
                            isProtected={note.is_protected}
                            isShared={note.is_shared}
                            isPassword={note.is_password}
                            created_at={note.created_at}
                            noteMenu={!selectMode}
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
                    onDownload={handleDownloadSelected}
                    onDelete={handleDeleteSelected}
                />
            )}
        </div>
    )
}

export default function Page() {
    const router = useRouter()
    const {token} = useAuthStore.getState()

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