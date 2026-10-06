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
import {FolderBar, FolderDrilldown} from "@/components/folder/folder_bar";
import {UnfiledBanner} from "@/components/folder/unfiled_banner";
import {useMoveSheetStore} from "@/store/moveSheet";
import {useIncludeSub} from "@/hooks/useIncludeSub";
import {useFolders} from "@/hooks/useFolders";
import {findFolder} from "@/types/folder";
import {SeriesCreateModal} from "@/components/series/series_create_modal";
import {SeriesNote} from "@/types/series";

function NoteListContent() {
    const router = useProgressRouter()
    const searchParams = useSearchParams()
    const {data: tagsData} = useTags()
    const {data: folderData} = useFolders()
    const {viewMode} = useViewModeStore()
    const {userHash} = useAuthStore.getState()

    const openMoveSheet = useMoveSheetStore(state => state.openSheet)
    const [includeSub] = useIncludeSub()

    const folderHash = searchParams.get("folder")
    /*
     * 개인 노트(루트)는 폴더에 넣지 않은 노트만 보여준다. 파일 탐색기에서 파일을 폴더로 옮기면 위 폴더에서
     * 사라지는 것과 같다. 예전처럼 폴더 안 노트까지 모아 보여주면 옮긴 노트가 그대로 남아 옮겨진 줄 알 수 없다.
     */
    const isRoot = !folderHash

    // 하위 포함 토글은 URL 로 넘겨야 서버가 같은 조건으로 조회한다.
    const query = (() => {
        const params = new URLSearchParams(searchParams.toString())
        if (folderHash && includeSub) params.set("include_sub", "1")
        else params.delete("include_sub")
        if (isRoot) params.set("unfiled", "1")
        else params.delete("unfiled")
        return params.toString()
    })()

    const {notes, isLoading, isFetchingNextPage, sentinelRef, removeNotes} =
        useNoteListPaging(query)

    // 여러 폴더가 섞여 보이는 목록에서만 경로를 붙인다. 한 폴더만 보고 있을 때는 군더더기다.
    // 검색은 폴더를 가로지르고, 하위 포함은 하위 폴더 노트가 섞인다.
    const isSearching = Boolean(searchParams.get("keyword"))
    const showFolderPath = isSearching || (Boolean(folderHash) && includeSub)

    // 검색은 트리 전체가 섞이니 전체 경로를, 한 폴더 안(하위 포함)에서는 폴더 이름만.
    const folderLabel = (hashId: string | null | undefined) => {
        if (!hashId) return "개인 노트"
        const folder = findFolder(folderData?.folders ?? [], hashId)
        if (!folder) return "개인 노트"
        return isSearching ? folder.path : folder.name
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

    // 시리즈로 묶을 노트. 고른 순서(Set 에 들어간 순서)가 처음 순서가 된다.
    const [seriesPicked, setSeriesPicked] = useState<SeriesNote[] | null>(null)

    function handleSeriesSelected() {
        const byHash = new Map(notes.map(note => [note.hash_id, note]))
        const picked = [...selectedIds].flatMap(hashId => {
            const note = byHash.get(hashId)
            return note ? [{hash_id: note.hash_id, title: note.title ?? ""}] : []
        })
        // 시리즈에는 내 노트만 담긴다(서버도 걸러낸다).
        const mine = picked.filter(note => byHash.get(note.hash_id)?.user_hash == userHash)
        if (mine.length < picked.length) toast("내 노트만 시리즈에 담을 수 있어 나머지는 뺐습니다.")
        if (mine.length > 0) setSeriesPicked(mine)
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

            {isRoot && <UnfiledBanner count={notes.length}/>}

            {/* 노트가 모두 폴더에 들어가 있으면 루트가 비어 보인다. 없어진 게 아니라 폴더 안에 있다고 알려준다. */}
            {isRoot && !isLoading && !isSearching && notes.length === 0 && (folderData?.folders.length ?? 0) > 0 && (
                <p className="px-4 md:px-6 pt-10 text-center text-[13px] text-subtle">
                    폴더에 넣지 않은 노트가 없습니다. 노트는 폴더 안에 있어요.
                </p>
            )}

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
                            series={note.series}
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
                    onSeries={handleSeriesSelected}
                    onDelete={handleDeleteSelected}
                />
            )}

            <SeriesCreateModal
                picked={seriesPicked}
                onClose={() => setSeriesPicked(null)}
                onSaved={seriesHash => {
                    setSeriesPicked(null)
                    exitSelectMode()
                    router.push(`/series/${seriesHash}`)
                }}
            />
        </div>
    )
}

export default function Page() {
    const router = useRouter()
    const {token} = useAuthStore.getState()

    useEffect(() => {
        if (!token) router.replace("/login")
    }, [token, router])

    if (!token) return <LoadingPage/>

    return (
        <Suspense fallback={<NoteListSkeleton/>}>
            <NoteListContent/>
        </Suspense>
    )
}