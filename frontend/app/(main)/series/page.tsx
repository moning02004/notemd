"use client"

import {useEffect} from "react"
import {useRouter} from "next/navigation"
import {FiLayers} from "react-icons/fi"
import {useProgressRouter} from "@/hooks/useProgressRouter"
import {useAuthStore} from "@/store/auth"
import {useNoteSelectStore} from "@/store/noteSelect"
import {useSeriesList} from "@/hooks/useSeries"
import {LoadingPage} from "@/components/loading"

const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("ko-KR", {year: "numeric", month: "short", day: "numeric"})

function SeriesListContent() {
    const router = useProgressRouter()
    const {data, isLoading} = useSeriesList()

    // 시리즈는 노트 목록에서 골라 만든다. 여기서 바로 그 화면의 선택 모드로 보낸다.
    const startPicking = () => {
        router.push("/")
        useNoteSelectStore.getState().requestSelectMode()
    }

    if (isLoading) {
        return (
            <div className="flex flex-col gap-3 p-4 md:p-6 max-w-3xl w-full mx-auto">
                {Array.from({length: 3}).map((_, i) => (
                    <div key={i} className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-2.5">
                        <div className="skeleton h-4 w-1/3"/>
                        <div className="skeleton h-3 w-2/3"/>
                    </div>
                ))}
            </div>
        )
    }

    if (!data?.length) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] gap-3 px-6 text-center">
                <FiLayers size={36} className="text-subtle"/>
                <p className="text-muted font-medium">아직 시리즈가 없습니다</p>
                <p className="text-sm text-subtle">
                    이어서 읽을 노트를 순서대로 묶어 두는 곳입니다.<br/>
                    개인 노트에서 노트를 고른 뒤 ‘시리즈’ 를 누르면 만들어집니다.
                </p>
                <button onClick={startPicking}
                        className="mt-2 h-10 px-4 rounded-lg bg-accent text-white text-[14px] font-semibold
                                   cursor-pointer hover:bg-accent-hover">
                    노트 고르러 가기
                </button>
            </div>
        )
    }

    return (
        <div className="min-h-[100%] bg-surface">
            <div className="flex flex-col gap-3 p-4 md:p-6 pb-24 max-w-3xl w-full mx-auto">
                <button onClick={startPicking}
                        className="self-end h-9 px-3 rounded-lg border border-border text-[13px] font-medium text-muted
                                   cursor-pointer hover:border-accent hover:text-accent">
                    새 시리즈 만들기
                </button>
                {data.map(series => (
                    <button
                        key={series.hash_id}
                        onClick={() => router.push(`/series/${series.hash_id}`)}
                        className="text-left rounded-xl border border-border bg-surface p-4 cursor-pointer
                                   transition-all duration-150 hover:border-border-strong
                                   hover:shadow-[0_8px_18px_-12px_rgba(0,0,0,0.25)]"
                    >
                        <p className="flex items-center gap-2">
                            <FiLayers size={14} className="shrink-0 text-accent"/>
                            <span className="flex-1 min-w-0 truncate text-[15px] font-semibold text-foreground">
                                {series.title}
                            </span>
                            <span className="shrink-0 text-[12px] tabular-nums text-subtle">노트 {series.note_count}개</span>
                        </p>
                        {series.description && (
                            <p className="mt-1.5 text-[13px] leading-relaxed text-muted line-clamp-2 whitespace-pre-line">
                                {series.description}
                            </p>
                        )}
                        <p className="mt-2 text-[11px] text-subtle">{formatDate(series.updated_at)}에 고침</p>
                    </button>
                ))}
            </div>
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

    return <SeriesListContent/>
}
