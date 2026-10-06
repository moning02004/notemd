"use client"

import {useEffect, useState} from "react"
import {useParams, useRouter} from "next/navigation"
import toast from "react-hot-toast"
import {FiArchive, FiChevronLeft, FiCopy, FiEdit2, FiGlobe, FiLock, FiFileText, FiLayers, FiMoreHorizontal, FiPlus, FiTrash2} from "react-icons/fi"
import {useClickOutside} from "@/hooks/useClickOutside"
import {useProgressRouter} from "@/hooks/useProgressRouter"
import {useAuthStore} from "@/store/auth"
import {useDeleteSeries, usePublishSeries, useSeriesDetail, useUpdateSeries} from "@/hooks/useSeries"
import {DownloadFormat, downloadSeriesRequest, gotoNote} from "@/lib/note"
import {LoadingPage} from "@/components/loading"
import {Spinner} from "@/components/icons"
import {Modal} from "@/components/ui/modal"
import {SeriesForm} from "@/components/series/series_form"
import {SERIES_MODAL_CLASS} from "@/components/series/series_create_modal"
import {NotePickerModal} from "@/components/note/note_picker_modal"
import {SeriesDetail, SeriesNote} from "@/types/series"

const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("ko-KR", {year: "numeric", month: "short", day: "numeric"})

function SeriesDetailContent({seriesId}: { seriesId: string }) {
    const router = useProgressRouter()
    const {data: series, isLoading, isError} = useSeriesDetail(seriesId)
    const deleteSeries = useDeleteSeries()
    const updateSeries = useUpdateSeries()
    const publishSeries = usePublishSeries()
    const [picking, setPicking] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)
    const menuRef = useClickOutside<HTMLDivElement>(() => setMenuOpen(false), menuOpen)

    const [editing, setEditing] = useState(false)
    const [exporting, setExporting] = useState<DownloadFormat | null>(null)
    const [openingId, setOpeningId] = useState<string | null>(null)

    if (isLoading) {
        return (
            <div className="flex flex-col gap-3 p-4 md:p-6 max-w-3xl w-full mx-auto">
                <div className="skeleton h-5 w-1/3"/>
                <div className="skeleton h-3 w-2/3"/>
                {Array.from({length: 4}).map((_, i) => <div key={i} className="skeleton h-10 w-full"/>)}
            </div>
        )
    }

    if (isError || !series) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] gap-3 px-6 text-center">
                <FiLayers size={36} className="text-subtle"/>
                <p className="text-muted font-medium">시리즈를 찾을 수 없습니다</p>
                <button onClick={() => router.push("/series")} className="text-[13px] text-accent underline cursor-pointer">
                    시리즈 목록으로
                </button>
            </div>
        )
    }

    const exportAs = async (format: DownloadFormat) => {
        if (exporting) return
        setExporting(format)
        try {
            await downloadSeriesRequest(series.hash_id, format)
        } catch {
            toast.error("시리즈를 내보내지 못했습니다.")
        } finally {
            setExporting(null)
        }
    }

    const remove = async () => {
        if (!confirm(`'${series.title}' 시리즈를 지웁니다. 안에 있는 노트는 그대로 남습니다.`)) return
        await deleteSeries.mutateAsync(series.hash_id)
        toast.success("시리즈를 지웠습니다.")
        router.replace("/series")
    }

    const shareUrl = () => `${window.location.origin}/p/${series.hash_id}`
    const copyLink = async () => {
        await navigator.clipboard.writeText(shareUrl())
        toast("시리즈 링크가 복사되었습니다.")
    }

    /*
     * 링크로 공개. 노트 각각의 공개 설정은 바꾸지 않는다. 시리즈 링크로 들어온 사람에게만, 공개인 동안만 열린다.
     * 무엇이 읽히게 되는지 켜기 전에 한 번 알린다.
     */
    const togglePublic = async () => {
        if (!series.is_public && !confirm(
            `이 시리즈를 링크로 공개합니다.\n\n` +
            `링크가 있는 누구나 안의 노트 ${series.notes.length}개를 읽을 수 있습니다(고칠 수는 없습니다).\n` +
            `노트 각각의 공개 설정은 바뀌지 않고, 공개를 끄면 곧바로 막힙니다.`)) return
        const saved = await publishSeries.mutateAsync({hashId: series.hash_id, isPublic: !series.is_public})
        if (saved.is_public) await copyLink().catch(() => toast.success("시리즈를 공개했습니다."))
        else toast.success("공개를 껐습니다. 링크로는 더 열리지 않습니다.")
    }

    // 고른 노트를 맨 뒤에 붙인다. 자리는 '고치기' 에서 옮긴다.
    const addNote = async (note: { hashId: string, title: string }) => {
        setPicking(false)
        if (series.notes.some(item => item.hash_id === note.hashId)) {
            toast("이미 이 시리즈에 있는 노트입니다.")
            return
        }
        // 공개된 시리즈에 넣으면 그 노트도 링크로 읽힌다.
        if (series.is_public && !confirm(
            `공개된 시리즈입니다. '${note.title}' 도 시리즈 링크로 읽을 수 있게 됩니다. 넣을까요?`)) return
        await updateSeries.mutateAsync({
            hashId: series.hash_id,
            title: series.title,
            description: series.description,
            noteHashes: [...series.notes.map(item => item.hash_id), note.hashId],
        })
        toast.success(`${series.notes.length + 1}번째로 넣었습니다.`)
    }

    const empty = series.notes.length === 0

    return (
        <div className="min-h-[100%] bg-surface">
            <div className="flex flex-col p-4 md:p-6 pb-24 max-w-3xl w-full mx-auto">
                <button onClick={() => router.push("/series")}
                        className="hidden md:flex self-start items-center gap-0.5 -ml-1 mb-3 text-[12.5px] text-muted
                                   cursor-pointer hover:text-accent">
                    <FiChevronLeft size={14}/> 시리즈
                </button>

                {/* 시리즈에 하는 일(내보내기·고치기·삭제)은 제목 옆 ⋯ 하나에 모은다. */}
                {/* 제목 줄 높이와 버튼 높이를 같게(32px) 두고 위에서 맞춘다. 제목이 두 줄이 되어도 ⋯ 는 첫 줄 가운데에 온다. */}
                <div className="flex items-start gap-2">
                    {/* 전역 h1 스타일의 밑줄을 뺀다. 제목 밑에만 그어지고 옆의 ⋯ 앞에서 끊겨 줄이 어긋나 보였다. */}
                    <div className="m-0! border-b-0! flex-1 min-w-0 text-[1.2rem] font-bold leading-8 text-foreground break-words">
                        {series.title}
                    </div>
                    <div ref={menuRef} className="relative shrink-0">
                        <button onClick={() => setMenuOpen(open => !open)}
                                aria-label="시리즈 메뉴" aria-haspopup="menu" aria-expanded={menuOpen}
                                aria-busy={exporting !== null}
                                className={`h-8 w-8 flex items-center justify-center rounded-lg cursor-pointer
                                            transition-colors duration-150
                                            ${menuOpen ? "bg-accent-soft text-accent"
                                    : "text-muted hover:bg-background hover:text-foreground"}`}>
                            {/* 내보내기는 몇 초 걸린다. 메뉴는 닫혔으니 누른 자리에서 진행 중임을 보여준다. */}
                            {exporting ? <Spinner size={16} className="text-accent"/> : <FiMoreHorizontal size={18}/>}
                        </button>
                        {menuOpen && (
                            <div role="menu"
                                 className="absolute right-0 top-9 z-20 w-56 py-1 bg-surface border border-border
                                            rounded-xl shadow-lg overflow-hidden">
                                <MenuItem icon={<FiFileText size={14}/>} label="PDF로 내보내기"
                                          hint="차례가 붙은 한 파일"
                                          disabled={empty || exporting !== null}
                                          onClick={() => {
                                              setMenuOpen(false)
                                              exportAs("pdf")
                                          }}/>
                                <MenuItem icon={<FiArchive size={14}/>} label="Markdown으로 내보내기"
                                          hint="‘순서. 제목.md’ 를 담은 zip"
                                          disabled={empty || exporting !== null}
                                          onClick={() => {
                                              setMenuOpen(false)
                                              exportAs("md")
                                          }}/>
                                <div className="my-1 h-px bg-border"/>
                                {series.is_public && (
                                    <MenuItem icon={<FiCopy size={14}/>} label="링크 복사"
                                              onClick={() => {
                                                  setMenuOpen(false)
                                                  void copyLink()
                                              }}/>
                                )}
                                <MenuItem icon={series.is_public ? <FiLock size={14}/> : <FiGlobe size={14}/>}
                                          label={series.is_public ? "공개 끄기" : "링크로 공개"}
                                          hint={series.is_public ? "링크로는 더 열리지 않음" : "링크가 있는 누구나 읽기"}
                                          disabled={publishSeries.isPending}
                                          onClick={() => {
                                              setMenuOpen(false)
                                              void togglePublic()
                                          }}/>
                                <div className="my-1 h-px bg-border"/>
                                <MenuItem icon={<FiEdit2 size={14}/>} label="고치기"
                                          onClick={() => {
                                              setMenuOpen(false)
                                              setEditing(true)
                                          }}/>
                                <MenuItem icon={<FiTrash2 size={14}/>} label="삭제" danger
                                          disabled={deleteSeries.isPending}
                                          onClick={() => {
                                              setMenuOpen(false)
                                              remove()
                                          }}/>
                            </div>
                        )}
                    </div>
                </div>
                {/* 제목 바로 아래에 이 시리즈가 얼마나 되는지. 버튼 줄이 빠진 자리를 비워 두지 않고 제목과 한 덩어리로 묶는다. */}
                <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-subtle">
                    <FiLayers size={12} className="shrink-0"/>
                    <span className="tabular-nums">노트 {series.notes.length}개</span>
                    <span aria-hidden>·</span>
                    <span>{formatDate(series.updated_at)}에 고침</span>
                    {series.is_public && (
                        <button onClick={copyLink} title="링크가 있는 누구나 읽을 수 있어요. 누르면 링크를 복사해요."
                                className="ml-1 inline-flex items-center gap-1 rounded-lg px-1.5 text-[10.5px] leading-[1.7]
                                           font-medium bg-chip-open-soft text-chip-open cursor-pointer hover:opacity-80">
                            <FiGlobe size={10}/> 공개 중
                            {/* 누르면 링크가 복사된다는 것을 아이콘으로 보여준다. 색만으로는 버튼인 줄 모른다. */}
                            <FiCopy size={10} className="ml-0.5 opacity-70"/>
                        </button>
                    )}
                </p>
                {series.description && (
                    <p className="mt-3 text-[14px] leading-relaxed text-muted whitespace-pre-line break-words">
                        {series.description}
                    </p>
                )}

                <ol className="mt-6 flex flex-col border-t border-border">
                    {series.notes.map((note, index) => (
                        <li key={note.hash_id}>
                            <button
                                onClick={async () => {
                                    setOpeningId(note.hash_id)
                                    await gotoNote({id: note.hash_id, router})
                                }}
                                aria-busy={openingId === note.hash_id}
                                className="w-full flex items-center gap-3 px-2 min-h-13 border-b border-border text-left
                                           cursor-pointer hover:bg-background transition-colors"
                            >
                                <span className="w-7 shrink-0 text-right text-[13px] tabular-nums text-subtle">
                                    {index + 1}.
                                </span>
                                <span className={`flex-1 min-w-0 truncate text-[14.5px] font-medium
                                                  ${note.title.trim() ? "text-foreground" : "text-subtle"}`}>
                                    {note.title.trim() || "제목 없음"}
                                </span>
                                {openingId === note.hash_id && <Spinner size={14} className="text-accent"/>}
                            </button>
                        </li>
                    ))}
                    {empty && (
                        <li className="py-10 text-center text-[13px] text-subtle">
                            시리즈에 남은 노트가 없습니다. 노트가 휴지통에 있다면 복원하면 다시 보입니다.
                        </li>
                    )}
                </ol>

                <button onClick={() => setPicking(true)} disabled={updateSeries.isPending}
                        className="mt-3 flex items-center justify-center gap-1.5 min-h-12 rounded-lg border border-dashed
                                   border-border-strong text-[13.5px] font-medium text-muted cursor-pointer
                                   hover:border-accent hover:text-accent disabled:opacity-50 disabled:cursor-wait">
                    {updateSeries.isPending ? <Spinner size={14}/> : <FiPlus size={15}/>}
                    노트 추가
                </button>
            </div>

            <NotePickerModal open={picking} onClose={() => setPicking(false)} onPick={addNote}/>

            <Modal isOpen={editing} onClose={() => setEditing(false)} variant="sheet" className={SERIES_MODAL_CLASS}>
                {editing && <EditForm series={series} onClose={() => setEditing(false)}/>}
            </Modal>
        </div>
    )
}

function EditForm({series, onClose}: { series: SeriesDetail, onClose: () => void }) {
    const updateSeries = useUpdateSeries()
    const [notes, setNotes] = useState<SeriesNote[]>(series.notes)

    return (
        <>
            <p className="px-4 pt-4 pb-3 border-b border-border text-[15px] font-semibold text-foreground">시리즈 고치기</p>
            <SeriesForm
                initialTitle={series.title}
                initialDescription={series.description}
                notes={notes}
                onNotesChange={setNotes}
                submitLabel="저장"
                busy={updateSeries.isPending}
                onCancel={onClose}
                onSubmit={async input => {
                    await updateSeries.mutateAsync({hashId: series.hash_id, ...input})
                    toast.success("시리즈를 고쳤습니다.")
                    onClose()
                }}
            />
        </>
    )
}

function MenuItem({icon, label, hint, danger, disabled, onClick}: {
    icon: React.ReactNode
    label: string
    /** 이름만으로 무엇이 나오는지 알기 어려울 때 아래에 한 줄. */
    hint?: string
    danger?: boolean
    disabled?: boolean
    onClick: () => void
}) {
    return (
        <button role="menuitem" onClick={onClick} disabled={disabled}
                className={`w-full flex items-start gap-2.5 px-3.5 py-2.5 text-left cursor-pointer
                            disabled:opacity-40 disabled:cursor-not-allowed
                            ${danger ? "text-danger hover:bg-danger-soft" : "text-foreground hover:bg-background"}`}>
            <span className={`mt-0.5 shrink-0 ${danger ? "" : "text-muted"}`}>{icon}</span>
            <span className="flex flex-col">
                <span className="text-[13.5px] leading-snug">{label}</span>
                {hint && <span className="text-[11.5px] leading-snug text-subtle">{hint}</span>}
            </span>
        </button>
    )
}

export default function Page() {
    const router = useRouter()
    const {seriesId} = useParams() as { seriesId: string }
    const {token} = useAuthStore.getState()

    useEffect(() => {
        if (!token) router.replace("/login")
    }, [token, router])

    if (!token) return <LoadingPage/>

    return <SeriesDetailContent seriesId={seriesId}/>
}
