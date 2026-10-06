"use client"

import {useEffect, useState} from "react"
import {useSearchParams} from "next/navigation"
import {FiChevronLeft, FiChevronRight, FiLayers} from "react-icons/fi"

import {apiRequest} from "@/lib/api"
import {useAuthStore} from "@/store/auth"
import {NoteSeries, PublicSeries, SeriesNote} from "@/types/series"

interface Props {
    noteId: string
    /** 받는 것은 갈 주소다(공개 시리즈로 들어왔으면 그 표시가 붙어 있다). */
    onOpenNote: (href: string) => void
    onOpenSeries: (href: string) => void
}

type Loaded = {
    noteId: string
    items: NoteSeries[]
    /** 링크로 공개한 시리즈를 통해 보고 있으면 그 시리즈. 이전·다음 주소에 그대로 이어 붙인다. */
    via: string | null
}

/** 공개 시리즈의 차례에서, 이 노트의 자리와 앞·뒤 노트를 뽑는다. */
function fromPublic(series: PublicSeries, noteId: string): NoteSeries[] {
    const index = series.notes.findIndex(note => note.hash_id === noteId)
    if (index < 0) return []
    const neighbor = (i: number): SeriesNote | null =>
        series.notes[i] ? {hash_id: series.notes[i].hash_id, title: series.notes[i].is_locked ? "" : series.notes[i].title} : null
    return [{
        hash_id: series.hash_id, title: series.title, is_public: true,
        position: index + 1, total: series.notes.length,
        prev: neighbor(index - 1), next: neighbor(index + 1),
    }]
}

/**
 * 이 노트가 들어 있는 시리즈와 앞·뒤 노트. 본문을 다 읽은 자리(맨 아래)에 둔다.
 *
 * 주인에게는 이 노트가 든 자기 시리즈를 모두 보여준다. 공개된 시리즈에는 '공개' 를 붙여, 이 노트가 시리즈 링크로
 * 읽힐 수 있다는 것을 알린다. 링크로 공개한 시리즈를 통해 들어온 사람(/s/노트?series=시리즈)에게는 그 시리즈만
 * 보여주고, 넘겨 읽는 동안 그 표시를 주소에 이어 붙인다. 어느 쪽도 아니면 아무것도 그리지 않는다.
 */
export function NoteSeriesNav({noteId, onOpenNote, onOpenSeries}: Props) {
    const via = useSearchParams().get("series")
    const [loaded, setLoaded] = useState<Loaded | null>(null)
    const current = loaded?.noteId === noteId ? loaded : null
    const items = current?.items ?? []

    useEffect(() => {
        let aborted = false
        const load = async (): Promise<Loaded> => {
            // 내 노트면 내 시리즈를 본다. 곁가지라 못 받아 와도 조용히 넘어간다.
            if (useAuthStore.getState().token) {
                const mine = await apiRequest.get<NoteSeries[]>(`/series/by-note/${noteId}`, {}, {isSilent: true})
                    .catch(() => [] as NoteSeries[])
                if (mine.length > 0) return {noteId, items: mine, via: null}
            }
            if (via) {
                const series = await apiRequest.get<PublicSeries>(`/series/public/${via}`, {}, {isSilent: true})
                    .catch(() => null)
                if (series) return {noteId, items: fromPublic(series, noteId), via}
            }
            return {noteId, items: [], via: null}
        }
        void load().then(result => {
            if (!aborted) setLoaded(result)
        })
        return () => {
            aborted = true
        }
    }, [noteId, via])

    if (items.length === 0) return null

    const suffix = current?.via ? `?series=${encodeURIComponent(current.via)}` : ""
    const openNote = (id: string) => onOpenNote(`/s/${id}${suffix}`)

    return (
        <nav aria-label="시리즈" className="mx-4 mt-8 mb-8 flex flex-col gap-3 border-t border-border pt-4">
            {items.map(series => (
                <div key={series.hash_id}>
                    <button type="button"
                            onClick={() => onOpenSeries(current?.via ? `/p/${series.hash_id}` : `/series/${series.hash_id}`)}
                            className="mb-2 flex max-w-full items-center gap-1.5 text-[12px] font-medium text-muted
                                       cursor-pointer hover:text-accent">
                        <FiLayers size={12} className="shrink-0"/>
                        <span className="truncate">{series.title}</span>
                        <span className="shrink-0 tabular-nums text-subtle">{series.position} / {series.total}</span>
                        {/* 주인에게만: 이 시리즈가 공개라 이 노트도 시리즈 링크로 읽힌다. */}
                        {!current?.via && series.is_public && (
                            <span title="링크로 공개한 시리즈예요. 이 노트도 시리즈 링크로 읽을 수 있어요."
                                  className="shrink-0 rounded-lg px-1.5 text-[10px] leading-[1.6] bg-chip-open-soft text-chip-open">
                                공개
                            </span>
                        )}
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                        <Neighbor direction="prev" note={series.prev} onOpen={openNote}/>
                        <Neighbor direction="next" note={series.next} onOpen={openNote}/>
                    </div>
                </div>
            ))}
        </nav>
    )
}

function Neighbor({direction, note, onOpen}: {
    direction: "prev" | "next"
    note: SeriesNote | null
    onOpen: (noteId: string) => void
}) {
    const isNext = direction === "next"
    // 첫 노트·마지막 노트에서도 칸은 남겨, 다음 노트 버튼이 늘 오른쪽 같은 자리에 있게 한다.
    if (!note) return <span/>

    return (
        <button type="button" onClick={() => onOpen(note.hash_id)}
                className={`group flex min-w-0 items-center gap-2 rounded-lg border border-border px-3 py-2.5
                            cursor-pointer transition-colors duration-150 hover:border-accent hover:bg-accent-soft
                            ${isNext ? "flex-row-reverse text-right" : "text-left"}`}>
            {isNext
                ? <FiChevronRight size={16} className="shrink-0 text-subtle group-hover:text-accent"/>
                : <FiChevronLeft size={16} className="shrink-0 text-subtle group-hover:text-accent"/>}
            <span className="min-w-0 flex-1">
                <span className="block text-[11px] text-subtle">{isNext ? "다음 노트" : "이전 노트"}</span>
                <span className={`block truncate text-[14px] group-hover:text-accent
                                  ${note.title.trim() ? "text-foreground" : "text-subtle"}`}>
                    {note.title.trim() || "제목 없음"}
                </span>
            </span>
        </button>
    )
}
