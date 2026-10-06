"use client"

import {useEffect, useState} from "react"
import {useParams, useRouter} from "next/navigation"
import toast from "react-hot-toast"
import {FiChevronLeft, FiEdit2, FiFileText, FiLayers, FiPlus, FiTrash2} from "react-icons/fi"
import {useProgressRouter} from "@/hooks/useProgressRouter"
import {useAuthStore} from "@/store/auth"
import {useDeleteSeries, useSeriesDetail, useUpdateSeries} from "@/hooks/useSeries"
import {DownloadFormat, downloadSeriesRequest, gotoNote} from "@/lib/note"
import {LoadingPage} from "@/components/loading"
import {Spinner} from "@/components/icons"
import {Modal} from "@/components/ui/modal"
import {SeriesForm} from "@/components/series/series_form"
import {SERIES_MODAL_CLASS} from "@/components/series/series_create_modal"
import {NotePickerModal} from "@/components/note/note_picker_modal"
import {SeriesDetail, SeriesNote} from "@/types/series"

function SeriesDetailContent({seriesId}: { seriesId: string }) {
    const router = useProgressRouter()
    const {data: series, isLoading, isError} = useSeriesDetail(seriesId)
    const deleteSeries = useDeleteSeries()
    const updateSeries = useUpdateSeries()
    const [picking, setPicking] = useState(false)

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

    // 고른 노트를 맨 뒤에 붙인다. 자리는 '고치기' 에서 옮긴다.
    const addNote = async (note: { hashId: string, title: string }) => {
        setPicking(false)
        if (series.notes.some(item => item.hash_id === note.hashId)) {
            toast("이미 이 시리즈에 있는 노트입니다.")
            return
        }
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

                <h1 className="m-0! text-[20px] font-bold leading-snug text-foreground break-words">{series.title}</h1>
                {series.description && (
                    <p className="mt-2 text-[14px] leading-relaxed text-muted whitespace-pre-line break-words">
                        {series.description}
                    </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <ActionButton onClick={() => exportAs("pdf")} disabled={empty || exporting !== null} primary>
                        {exporting === "pdf" ? <Spinner size={14}/> : <FiFileText size={14}/>}
                        {exporting === "pdf" ? "PDF 만드는 중…" : "PDF로 내보내기"}
                    </ActionButton>
                    <ActionButton onClick={() => exportAs("md")} disabled={empty || exporting !== null}>
                        {exporting === "md" && <Spinner size={14}/>}
                        Markdown(zip)
                    </ActionButton>
                    <span className="flex-1"/>
                    <ActionButton onClick={() => setEditing(true)}>
                        <FiEdit2 size={13}/> 고치기
                    </ActionButton>
                    <ActionButton onClick={remove} disabled={deleteSeries.isPending} danger>
                        <FiTrash2 size={13}/> 삭제
                    </ActionButton>
                </div>
                <p className="mt-2 text-[12px] text-subtle">
                    PDF 는 노트를 순서대로 이어 붙인 한 파일입니다. 첫 쪽에 차례가 붙고 노트마다 새 쪽에서 시작합니다.
                </p>

                <ol className="mt-5 flex flex-col border-t border-border">
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

function ActionButton({onClick, disabled, primary, danger, children}: {
    onClick: () => void
    disabled?: boolean
    primary?: boolean
    danger?: boolean
    children: React.ReactNode
}) {
    return (
        <button onClick={onClick} disabled={disabled}
                className={`h-9 px-3 rounded-lg border text-[13px] font-medium flex items-center gap-1.5 cursor-pointer
                            transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed
                            ${primary ? "bg-accent border-accent text-white hover:bg-accent-hover"
                    : danger ? "border-border text-muted hover:border-danger hover:text-danger hover:bg-danger-soft"
                        : "border-border text-muted hover:border-accent hover:text-accent"}`}>
            {children}
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
