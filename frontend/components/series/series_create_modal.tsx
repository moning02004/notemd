"use client"

import {useState} from "react"
import toast from "react-hot-toast"
import {Modal} from "@/components/ui/modal"
import {SeriesForm} from "@/components/series/series_form"
import {useCreateSeries, useSeriesDetail, useSeriesList, useUpdateSeries} from "@/hooks/useSeries"
import {SeriesNote} from "@/types/series"
import {SelectBox} from "@/components/ui/select_box"

interface Props {
    /** 고른 순서대로의 노트. null 이면 닫혀 있다. */
    picked: SeriesNote[] | null
    onClose: () => void
    onSaved: (seriesHash: string) => void
}

export const SERIES_MODAL_CLASS = "w-full h-full sm:h-auto sm:max-h-[80vh] sm:max-w-md sm:rounded-xl sm:border sm:border-border sm:shadow-xl"

/** 목록에서 고른 노트로 시리즈를 만들거나, 이미 있는 시리즈 뒤에 덧붙인다. */
export function SeriesCreateModal({picked, onClose, onSaved}: Props) {
    return (
        <Modal isOpen={picked !== null} onClose={onClose} variant="sheet" className={SERIES_MODAL_CLASS}>
            {/* 열 때마다 새로 그려 지난번에 적던 제목과 순서가 남지 않게 한다. */}
            {picked && <Content picked={picked} onClose={onClose} onSaved={onSaved}/>}
        </Modal>
    )
}

function Content({picked, onClose, onSaved}: { picked: SeriesNote[], onClose: () => void, onSaved: (hash: string) => void }) {
    const {data: seriesList} = useSeriesList()
    // 비어 있으면 새 시리즈, 아니면 그 시리즈 뒤에 덧붙인다.
    const [targetHash, setTargetHash] = useState("")
    const {data: target} = useSeriesDetail(targetHash || null)
    const createSeries = useCreateSeries()
    const updateSeries = useUpdateSeries()

    const [newNotes, setNewNotes] = useState(picked)
    // 덧붙일 때의 순서. 고른 시리즈를 받아 온 뒤에 한 번 채운다(렌더 중에 앞 상태와 견줘 맞춘다).
    const [merged, setMerged] = useState<{ hash: string, notes: SeriesNote[] } | null>(null)
    if (target && target.hash_id === targetHash && merged?.hash !== targetHash) {
        const existing = new Set(target.notes.map(note => note.hash_id))
        setMerged({hash: targetHash, notes: [...target.notes, ...picked.filter(note => !existing.has(note.hash_id))]})
    }

    const appending = Boolean(targetHash)
    const ready = !appending || (merged?.hash === targetHash && target)
    const busy = createSeries.isPending || updateSeries.isPending

    return (
        <>
            <div className="px-4 pt-4 pb-3 border-b border-border">
                <p className="text-[15px] font-semibold text-foreground">시리즈로 묶기</p>
                <p className="mt-0.5 text-[12px] text-muted">읽을 순서대로 놓으세요. 노트는 그대로 있고 시리즈가 순서만 기억합니다.</p>
                {(seriesList?.length ?? 0) > 0 && (
                    <div className="mt-3">
                        <SelectBox
                            id="series-target"
                            ariaLabel="새로 만들지, 있는 시리즈에 덧붙일지"
                            value={targetHash}
                            onChange={setTargetHash}
                            className="w-full h-10 px-3 rounded-lg border border-border-strong bg-surface
                                       text-[14px] text-foreground"
                            options={[
                                {value: "", label: "새 시리즈 만들기"},
                                ...(seriesList ?? []).map(series => (
                                    {value: series.hash_id, label: `‘${series.title}’ 에 덧붙이기`})),
                            ]}
                        />
                    </div>
                )}
            </div>

            {/* 공개된 시리즈에 덧붙이면 그 노트들도 시리즈 링크로 읽힌다. */}
            {appending && target?.is_public && (
                <p className="px-4 py-2 text-[12px] bg-chip-open-soft text-chip-open">
                    링크로 공개한 시리즈입니다. 덧붙인 노트도 시리즈 링크로 읽을 수 있게 됩니다.
                </p>
            )}

            {ready ? (
                <SeriesForm
                    // 대상을 바꾸면 제목·설명 칸을 그 시리즈 것으로 다시 채운다.
                    key={targetHash}
                    initialTitle={appending ? target!.title : ""}
                    initialDescription={appending ? target!.description : ""}
                    notes={appending ? merged!.notes : newNotes}
                    onNotesChange={notes => appending ? setMerged({hash: targetHash, notes}) : setNewNotes(notes)}
                    submitLabel={appending ? "시리즈에 저장" : "시리즈 만들기"}
                    busy={busy}
                    onCancel={onClose}
                    onSubmit={async input => {
                        const saved = appending
                            ? await updateSeries.mutateAsync({hashId: targetHash, ...input})
                            : await createSeries.mutateAsync(input)
                        toast.success(appending ? "시리즈에 노트를 덧붙였습니다." : "시리즈를 만들었습니다.")
                        onSaved(saved.hash_id)
                    }}
                />
            ) : (
                <p className="flex-1 py-10 text-center text-[13px] text-subtle">시리즈를 불러오는 중…</p>
            )}
        </>
    )
}
