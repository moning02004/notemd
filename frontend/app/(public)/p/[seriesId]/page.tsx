"use client"

import {useEffect, useState} from "react"
import {useParams} from "next/navigation"
import {FiLayers, FiLock} from "react-icons/fi"
import {ApiError, apiRequest} from "@/lib/api"
import {useProgressRouter} from "@/hooks/useProgressRouter"
import {Spinner} from "@/components/icons"
import {PublicSeries} from "@/types/series"

/**
 * 링크로 공개한 시리즈를 읽는 화면. 로그인 없이 열린다.
 *
 * 차례만 보여주고, 노트는 시리즈 표시를 붙인 주소(/s/노트?series=시리즈)로 연다. 그 표시가 있어야 서버가
 * 공개가 아닌 노트를 읽게 해 준다. 공개를 끄면 이 화면도, 그 주소들도 곧바로 닫힌다.
 */
export default function Page() {
    const router = useProgressRouter()
    const {seriesId} = useParams() as { seriesId: string }
    const [series, setSeries] = useState<PublicSeries | null>(null)
    const [failed, setFailed] = useState<number | null>(null)
    const [openingId, setOpeningId] = useState<string | null>(null)

    useEffect(() => {
        let aborted = false
        apiRequest.get<PublicSeries>(`/series/public/${seriesId}`)
            .then(response => {
                if (!aborted) setSeries(response)
            })
            .catch(error => {
                if (!aborted) setFailed(error instanceof ApiError ? error.status : 500)
            })
        return () => {
            aborted = true
        }
    }, [seriesId])

    if (failed !== null) {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-3 px-6 text-center">
                <FiLayers size={32} className="text-subtle"/>
                <p className="text-[15px] font-medium text-foreground">
                    {failed === 404 ? "볼 수 없는 시리즈입니다." : "시리즈를 불러오지 못했습니다."}
                </p>
                {failed === 404 &&
                    <p className="text-[13px] text-muted">공개가 꺼졌거나 지워진 시리즈입니다.</p>}
            </div>
        )
    }

    if (!series) {
        return (
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 p-5 md:p-8" aria-busy="true">
                <div className="skeleton h-6 w-1/2"/>
                <div className="skeleton h-3 w-2/3"/>
                {Array.from({length: 4}).map((_, i) => <div key={i} className="skeleton h-12 w-full"/>)}
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-surface">
            <div className="mx-auto flex w-full max-w-2xl flex-col p-5 md:p-8">
                <p className="flex items-center gap-1.5 text-[12px] text-subtle">
                    <FiLayers size={12} className="shrink-0"/>
                    시리즈 · {series.owner_name} · 노트 {series.notes.length}개
                </p>
                <h1 className="m-0! border-b-0! mt-1.5! text-[24px] font-bold leading-snug text-foreground break-words">
                    {series.title}
                </h1>
                {series.description && (
                    <p className="mt-3 text-[14.5px] leading-relaxed text-muted whitespace-pre-line break-words">
                        {series.description}
                    </p>
                )}

                <ol className="mt-6 flex flex-col border-t border-border">
                    {series.notes.map((note, index) => (
                        <li key={note.hash_id}>
                            <button
                                onClick={() => {
                                    setOpeningId(note.hash_id)
                                    router.push(`/s/${note.hash_id}?series=${encodeURIComponent(series.hash_id)}`)
                                }}
                                aria-busy={openingId === note.hash_id}
                                className="flex min-h-13 w-full items-center gap-3 border-b border-border px-2 text-left
                                           cursor-pointer transition-colors hover:bg-accent-menu"
                            >
                                <span className="w-7 shrink-0 text-right text-[13px] tabular-nums text-subtle">
                                    {index + 1}.
                                </span>
                                {note.is_locked ? (
                                    <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[14.5px] text-muted">
                                        <FiLock size={13} className="shrink-0"/> 비밀번호가 걸린 노트
                                    </span>
                                ) : (
                                    <span className={`min-w-0 flex-1 truncate text-[14.5px] font-medium
                                                      ${note.title.trim() ? "text-foreground" : "text-subtle"}`}>
                                        {note.title.trim() || "제목 없음"}
                                    </span>
                                )}
                                {openingId === note.hash_id && <Spinner size={14} className="text-accent"/>}
                            </button>
                        </li>
                    ))}
                    {series.notes.length === 0 && (
                        <li className="py-10 text-center text-[13px] text-subtle">아직 노트가 없는 시리즈입니다.</li>
                    )}
                </ol>
            </div>
        </div>
    )
}
