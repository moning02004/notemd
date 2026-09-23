"use client"

import {Suspense, useEffect, useState} from "react"
import {useRouter, useSearchParams} from "next/navigation"
import {useProgressRouter} from "@/hooks/useProgressRouter"
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
import {NoteListSkeleton, SkeletonLoading} from "@/components/skeleton";
import {useViewModeStore} from "@/store/viewMode";
import NotePasswordModal from "@/components/note/password_modal";
import {FolderBar, FolderDrilldown} from "@/components/folder/folder_bar";
import {UnfiledBanner} from "@/components/folder/unfiled_banner";
import {useMoveSheetStore} from "@/store/moveSheet";
import {useFolderUiStore} from "@/store/folderUi";
import {useFolders} from "@/hooks/useFolders";
import {findFolder} from "@/types/folder";

function NoteListContent() {
    const router = useProgressRouter()
    const searchParams = useSearchParams()
    const {data: tagsData} = useTags()
    const {data: folderData} = useFolders()
    const {viewMode} = useViewModeStore()
    const {userHash} = useAuthStore.getState()

    const openMoveSheet = useMoveSheetStore(state => state.openSheet)
    const includeSub = useFolderUiStore(state => state.includeSub)

    const folderHash = searchParams.get("folder")
    const isUnfiled = searchParams.get("unfiled") === "1"

    // 하위 포함 토글은 URL 로 넘겨야 서버가 같은 조건으로 조회한다.
    const query = (() => {
        const params = new URLSearchParams(searchParams.toString())
        if (folderHash && includeSub) params.set("include_sub", "1")
        else params.delete("include_sub")
        return params.toString()
    })()

    const {notes, isLoading, isFetchingNextPage, sentinelRef, removeNotes} =
        useNoteListPaging(query)

    // 여러 폴더가 섞여 보이는 목록에서만 경로를 붙인다. 한 폴더만 보고 있을 때는 군더더기다.
    // 개인 노트(루트)는 폴더 안 노트까지 모두 모아 보여주므로 여기에 해당한다.
    const isRoot = !folderHash && !isUnfiled
    const showFolderPath = Boolean(searchParams.get("keyword")) || isRoot || (Boolean(folderHash) && includeSub)

    // 루트·검색은 트리 전체가 섞이니 전체 경로를, 한 폴더 안(하위 포함)에서는 폴더 이름만.
    const folderLabel = (hashId: string | null | undefined) => {
        if (!hashId) return "미분류"
        const folder = findFolder(folderData?.folders ?? [], hashId)
        if (!folder) return "미분류"
        return isRoot || searchParams.get("keyword") ? folder.path : folder.name
    }

    const {
        selectMode,
        selectedIds,
        exitSelectMode,
        toggleSelect,
    } = useNoteSelectStore()

    // 노트를 여는 동안 누른 칸에 표시를 남긴다. 목록 -> 노트 이동이 가장 자주 기다리는 구간이다.
    const [openingId, setOpeningId] = useState<string | null>(null)

    async function openNote(hashId: string) {
        setOpeningId(hashId)
        await gotoNote({id: hashId, router})
    }

    async function handleDownloadSelected() {
        await downloadNoteRequest([...selectedIds])
    }

    function handleMoveSelected() {
        openMoveSheet([...selectedIds], folderHash)
        exitSelectMode()
    }

    function handleDeleteSelected() {
        return apiRequest.delete("/notes", {
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
                <FolderBar/>
                <NoteFilterBar tags={tagsData ?? []}/>
            </div>

            {/* 폴더도 노트와 같은 목록에 두되 맨 위에 모은다. */}
            <FolderDrilldown/>

            {isUnfiled && <UnfiledBanner count={notes.length}/>}

            <div
                className={viewMode === "list"
                    ? "flex flex-col p-4 md:p-6 pb-24"
                    : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4 md:p-6 pb-24"
                }>
                {isLoading
                    ? <SkeletonLoading count={viewMode === "list" ? 8 : 4} viewMode={viewMode}/>
                    : notes.map(note => (
                        <Note
                            key={note.hash_id}
                            hashId={note.hash_id}
                            data-note-id={note.hash_id}
                            onClick={() => openNote(note.hash_id)}
                            title={note.title || "제목 없음"}
                            content={note.content}
                            isOwner={note.user_hash == userHash}
                            isPublic={note.is_public}
                            isProtected={note.is_protected}
                            isShared={note.is_shared}
                            isEncrypted={note.is_encrypted}
                            isPassword={note.is_password}
                            created_at={note.created_at}
                            folderPath={showFolderPath ? folderLabel(note.folder?.hashId) : null}
                            folderUnfiled={!note.folder}
                            folderHash={note.folder?.hashId ?? null}
                            draggable
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
                    onMove={handleMoveSelected}
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
        <Suspense fallback={<NoteListSkeleton/>}>
            <NoteListContent/>
        </Suspense>
    )
}