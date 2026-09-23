"use client"

import {Suspense, useEffect, useState} from "react"
import {useRouter, useSearchParams} from "next/navigation"
import {useProgressRouter} from "@/hooks/useProgressRouter"
import {MdWorkspacesFilled} from "react-icons/md"
import {useAuthStore} from "@/store/auth"
import {useNoteSelectStore} from "@/store/noteSelect"
import {useWorkspaceStore} from "@/store/workspace"
import {useViewModeStore} from "@/store/viewMode"
import {downloadNoteRequest, gotoNote} from "@/lib/note"
import {Note} from "@/components/note"
import {LoadingPage} from "@/components/loading"
import NoteFilterBar from "@/components/note_filterbar"
import SelectActionBar from "@/components/select_action_bar"
import {useNoteListPaging} from "@/hooks/useNoteListPaging"
import {useTags} from "@/hooks/useTags"
import {apiRequest} from "@/lib/api";
import toast from "react-hot-toast";
import {NoteListSkeleton, SkeletonLoading} from "@/components/skeleton";

function WorkspaceNoteListContent() {
    const router = useProgressRouter()
    const searchParams = useSearchParams()
    const {data: tagsData} = useTags()
    const {viewMode} = useViewModeStore()
    const userHash = useAuthStore(state => state.userHash)

    const {
        workspaces,
        selectedWorkspaceId,
        isLoading: isWorkspacesLoading,
        hasLoaded: hasLoadedWorkspaces,
        fetchWorkspaces,
    } = useWorkspaceStore()

    useEffect(() => {
        if (userHash) fetchWorkspaces(userHash)
    }, [userHash])

    const {notes, isLoading, isFetchingNextPage, sentinelRef, removeNotes} =
        useNoteListPaging(searchParams.toString(), `/workspaces/${selectedWorkspaceId}/notes`, !!selectedWorkspaceId)

    const {
        selectMode,
        selectedIds,
        exitSelectMode,
        toggleSelect,
    } = useNoteSelectStore()

    // 노트를 여는 동안 누른 칸에 표시를 남긴다.
    const [openingId, setOpeningId] = useState<string | null>(null)

    async function openNote(hashId: string) {
        setOpeningId(hashId)
        await gotoNote({id: hashId, router})
    }

    // ── 배치 액션 ────────────────────────────────────────────
    async function handleDownloadSelected() {
        await downloadNoteRequest([...selectedIds])
    }

    // 소속된 워크스페이스가 없는 경우
    if (hasLoadedWorkspaces && !isWorkspacesLoading && workspaces.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] gap-3 px-6 text-center">
                <MdWorkspacesFilled size={40} className="text-subtle"/>
                <p className="text-muted font-medium">아직 소속된 워크스페이스가 없습니다</p>
                <p className="text-sm text-subtle">설정에서 워크스페이스를 생성하거나 초대를 받아보세요.</p>
            </div>
        )
    }

    return (
        <div className="min-h-[100%] bg-surface">
            <div className="sticky top-0 z-10 backdrop-blur border-b border-border">
                <NoteFilterBar tags={tagsData ?? []}/>
            </div>

            <div
                className={viewMode === "list"
                    ? "flex flex-col p-4 md:p-6 pb-24"
                    : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4 md:p-6 pb-24"
                }>
                {isLoading || isWorkspacesLoading
                    ? <SkeletonLoading count={viewMode === "list" ? 8 : 4} viewMode={viewMode}/>
                    : notes.map(note => (
                        <Note
                            key={note.hash_id}
                            hashId={note.hash_id}
                            data-note-id={note.hash_id}
                            onClick={() => openNote(note.hash_id)}
                            title={note.title || "제목 없음"}
                            content={note.content}
                            isOwner={note.user_hash === userHash}
                            ownerName={note.owner_name}
                            created_at={note.created_at}
                            noteMenu={!selectMode}
                            selectable={selectMode}
                            selected={selectedIds.has(note.hash_id)}
                            onSelect={toggleSelect}
                            viewMode={viewMode}
                            isOpening={openingId === note.hash_id}
                        />
                    ))
                }
            </div>

            <div ref={sentinelRef}
                 className={viewMode === "list"
                     ? "flex flex-col px-4 md:px-6 pb-4"
                     : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 px-4 md:px-6 pb-4"}>
                {isFetchingNextPage && <SkeletonLoading count={viewMode === "list" ? 3 : 4} viewMode={viewMode}/>}
            </div>

            {selectMode && (
                <SelectActionBar
                    selectedCount={selectedIds.size}
                    onDownload={handleDownloadSelected}
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
        <Suspense fallback={<NoteListSkeleton/>}>
            <WorkspaceNoteListContent/>
        </Suspense>
    )
}