"use client"

import {useEffect, useMemo, useState} from "react"
import toast from "react-hot-toast"
import {useQueryClient} from "@tanstack/react-query"
import {FiCheck, FiFolderPlus, FiX} from "react-icons/fi"
import {apiRequest} from "@/lib/api"
import {useFolders} from "@/hooks/useFolders"
import {useTags} from "@/hooks/useTags"

/** 이 개수 아래인 태그는 폴더로 만들어도 금방 비어 보인다. */
const MIN_NOTES_FOR_SUGGESTION = 3

/**
 * 미분류 화면 맨 위, 태그를 폴더로 승격시키는 한 번짜리 제안.
 *
 * 폴더를 넣어도 기존 노트가 전부 미분류에 쌓여 있으면 대부분 그대로 방치된다.
 * 폴더가 하나도 없고 쓸 만한 태그가 있을 때만 나타난다.
 */
export function UnfiledBanner({count}: { count: number }) {
    const {data: folderData} = useFolders()
    const {data: tags} = useTags()
    const queryClient = useQueryClient()

    const [dismissed, setDismissed] = useState(false)
    const [picked, setPicked] = useState<string[]>([])
    const [busy, setBusy] = useState(false)

    const suggestions = useMemo(() => (tags ?? [])
        .filter(tag => tag.keyword !== "전체" && tag.count >= MIN_NOTES_FOR_SUGGESTION)
        .sort((a, b) => b.count - a.count)
        .slice(0, 8), [tags])

    // 폴더가 하나도 없고 쓸 만한 태그가 있을 때만 승격을 권한다.
    const canSuggest = (folderData?.folders.length ?? 0) === 0 && suggestions.length > 0

    useEffect(() => {
        setPicked(suggestions.map(tag => tag.keyword))
    }, [suggestions])

    if (count === 0 || dismissed || !canSuggest) return null

    const promote = async () => {
        if (picked.length === 0 || busy) return
        setBusy(true)
        try {
            const result = await apiRequest.post<{ created_folder_count: number, moved_note_count: number }>(
                "/folders/from-tags", {body: JSON.stringify({keywords: picked})})
            queryClient.invalidateQueries({queryKey: ["folders"]})
            queryClient.invalidateQueries({queryKey: ["notes"]})
            toast.success(`폴더 ${result.created_folder_count}개를 만들고 노트 ${result.moved_note_count}개를 옮겼습니다.`)
            setDismissed(true)
        } catch (error) {
            toast.error((error as Error).message)
        } finally {
            setBusy(false)
        }
    }

    return (
        <section className="px-4 py-3.5 md:px-6 bg-accent-soft border-b border-border">
            <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-semibold text-accent">태그로 폴더를 만들어 드릴까요?</p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
                        쓰고 계신 태그 중 노트가 {MIN_NOTES_FOR_SUGGESTION}개 이상인 것만 골랐습니다.
                        태그는 지워지지 않고 그대로 남습니다.
                    </p>
                </div>
                <button onClick={() => setDismissed(true)} aria-label="닫기"
                        className="shrink-0 p-1.5 -mt-1 -mr-1 rounded text-subtle hover:text-muted cursor-pointer">
                    <FiX size={15}/>
                </button>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-3">
                {suggestions.map(tag => {
                    const on = picked.includes(tag.keyword)
                    return (
                        <button
                            key={tag.keyword}
                            onClick={() => setPicked(current => on
                                ? current.filter(keyword => keyword !== tag.keyword)
                                : [...current, tag.keyword])}
                            className={`flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-[12px]
                                        cursor-pointer transition-colors duration-150
                                ${on
                                ? "bg-surface border-accent text-foreground"
                                : "bg-transparent border-border text-subtle line-through"}`}
                        >
                            {on && <FiCheck size={11} className="text-accent shrink-0"/>}
                            <span className="truncate max-w-[8rem]">{tag.keyword}</span>
                            <span className="tabular-nums text-subtle">{tag.count}</span>
                        </button>
                    )
                })}
            </div>

            <div className="flex gap-2 mt-3">
                <button
                    onClick={promote}
                    disabled={picked.length === 0 || busy}
                    className="h-10 md:h-8 px-3.5 rounded-lg bg-accent text-white text-[13px] font-semibold
                               cursor-pointer hover:bg-accent-hover disabled:opacity-40
                               disabled:cursor-not-allowed transition-colors duration-150"
                >
                    <FiFolderPlus size={13} className="inline mr-1.5 -mt-0.5"/>
                    폴더 {picked.length}개 만들기
                </button>
                <button
                    onClick={() => setDismissed(true)}
                    className="h-10 md:h-8 px-3.5 rounded-lg border border-border text-muted text-[13px]
                               cursor-pointer hover:bg-surface transition-colors duration-150"
                >
                    직접 만들게요
                </button>
            </div>
        </section>
    )
}
