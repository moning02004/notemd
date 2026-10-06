"use client"

import {useEffect, useState} from "react"
import {FiChevronLeft, FiChevronRight, FiLayers} from "react-icons/fi"

import {apiRequest} from "@/lib/api"
import {NoteSeries, SeriesNote} from "@/types/series"

interface Props {
    noteId: string
    onOpenNote: (noteId: string) => void
    onOpenSeries: (seriesId: string) => void
}

/**
 * 이 노트가 들어 있는 시리즈와 앞·뒤 노트. 본문을 다 읽은 자리(맨 아래)에 둔다.
 *
 * 시리즈에 없는 노트에서는 아무것도 그리지 않는다. 시리즈는 만든 사람만 보므로
 * 남의 노트나 로그인하지 않은 화면에서도 비어 있다.
 */
export function NoteSeriesNav({noteId, onOpenNote, onOpenSeries}: Props) {
    const [loaded, setLoaded] = useState<{ noteId: string, items: NoteSeries[] } | null>(null)
    const items = loaded?.noteId === noteId ? loaded.items : []

    useEffect(() => {
        let aborted = false
        apiRequest.get<NoteSeries[]>(`/series/by-note/${noteId}`, {}, {isSilent: true})
            .then(response => {
                if (!aborted) setLoaded({noteId, items: response})
            })
            // 곁가지다. 못 받아 와도 노트를 쓰는 데는 지장이 없으니 조용히 넘어간다.
            .catch(() => {})
        return () => {
            aborted = true
        }
    }, [noteId])

    if (items.length === 0) return null

    return (
        <nav aria-label="시리즈" className="mx-4 mt-8 mb-8 flex flex-col gap-3 border-t border-border pt-4">
            {items.map(series => (
                <div key={series.hash_id}>
                    <button type="button" onClick={() => onOpenSeries(series.hash_id)}
                            className="mb-2 flex max-w-full items-center gap-1.5 text-[12px] font-medium text-muted
                                       cursor-pointer hover:text-accent">
                        <FiLayers size={12} className="shrink-0"/>
                        <span className="truncate">{series.title}</span>
                        <span className="shrink-0 tabular-nums text-subtle">{series.position} / {series.total}</span>
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                        <Neighbor direction="prev" note={series.prev} onOpen={onOpenNote}/>
                        <Neighbor direction="next" note={series.next} onOpen={onOpenNote}/>
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
