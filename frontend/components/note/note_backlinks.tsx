"use client"

import {useEffect, useState} from "react"
import {FiLock} from "react-icons/fi"

import {apiRequest} from "@/lib/api"
import {NoteBacklink} from "@/types/note"

interface Props {
    noteId: string
    /** 누르면 옮겨 가지 않고 오른쪽 패널에 펼친다(본문 링크와 같다). */
    onOpen: (noteId: string) => void
}

const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("ko-KR", {year: "numeric", month: "short", day: "numeric"})

/**
 * 이 노트를 가리키는 노트들. 본문 맨 아래에 둔다.
 *
 * 없으면 아무것도 그리지 않는다. 링크를 쓰지 않는 사람에게 빈 칸은 군더더기다.
 * 서버가 보는 사람이 열 수 있는 노트만 돌려주므로, 여기서는 받은 그대로 보여준다.
 */
export function NoteBacklinks({noteId, onOpen}: Props) {
    const [loaded, setLoaded] = useState<{ noteId: string, items: NoteBacklink[] } | null>(null)
    const items = loaded?.noteId === noteId ? loaded.items : []

    useEffect(() => {
        let aborted = false
        apiRequest.get<NoteBacklink[]>(`/notes/${noteId}/backlinks`)
            .then(response => {
                if (!aborted) setLoaded({noteId, items: response})
            })
            // 백링크는 곁가지다. 못 받아 와도 노트를 쓰는 데는 지장이 없으니 조용히 넘어간다.
            .catch(() => {})
        return () => {
            aborted = true
        }
    }, [noteId])

    if (items.length === 0) return null

    return (
        <section aria-label="이 노트를 가리키는 노트" className="mx-4 mt-8 mb-12 border-t border-border pt-4">
            <p className="mb-2 text-[12px] font-medium tracking-wide text-muted">
                이 노트를 가리키는 노트 <span className="tabular-nums text-subtle">{items.length}</span>
            </p>
            <ul className="flex flex-col">
                {items.map(item => (
                    <li key={item.hash_id}>
                        <button type="button"
                                onClick={() => onOpen(item.hash_id)}
                                className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left
                                           cursor-pointer hover:bg-background transition-colors duration-150">
                            <span aria-hidden className="text-[12px] text-accent opacity-70">↗</span>
                            {item.is_locked ? (
                                <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[14px] text-muted">
                                    <FiLock size={12} className="shrink-0"/>잠긴 노트
                                </span>
                            ) : (
                                <span className={`min-w-0 flex-1 truncate text-[14px] group-hover:text-accent
                                    ${item.title.trim() ? "text-foreground" : "text-subtle"}`}>
                                    {item.title.trim() || "제목 없음"}
                                </span>
                            )}
                            <span className="shrink-0 text-[11px] tabular-nums text-subtle">{formatDate(item.updated_at)}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    )
}
