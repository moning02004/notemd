"use client"

import {useEffect, useMemo, useRef, useState} from "react"
import {FiCornerDownLeft, FiFolder, FiInbox, FiPlus, FiSearch} from "react-icons/fi"
import {useCreateFolder, useFolderInvalidate, useFolders} from "@/hooks/useFolders"
import {useNotesStore} from "@/store/notes"
import {moveNotesWithUndo} from "@/lib/folder"
import {flattenFolders} from "@/types/folder"

interface Props {
    open: boolean
    onClose: () => void
    noteHashes: string[]
    /** 지금 들어 있는 폴더. 목록에서 표시만 하고 선택은 막지 않는다. */
    currentFolder?: string | null
    onMoved?: (folder: { hashId: string, name: string } | null) => void
}

type Target = { hashId: string | null, name: string, path: string }

/**
 * 노트를 폴더로 옮기는 단일 진입점.
 *
 * 데스크톱에서는 화면 가운데 커맨드 팔레트로, 모바일에서는 아래에서 올라오는 시트로
 * 같은 목록을 보여준다. 모바일은 손가락이 닿는 크기(최소 52px)와 아래쪽 배치가,
 * 데스크톱은 키보드만으로 끝나는 흐름이 중요해서 배치만 다르게 했다.
 */
export function MoveNotesSheet({open, onClose, noteHashes, currentFolder, onMoved}: Props) {
    const {data} = useFolders(open)
    const createFolder = useCreateFolder()
    const invalidate = useFolderInvalidate()
    const notes = useNotesStore(state => state.notes)

    const [query, setQuery] = useState("")
    const [cursor, setCursor] = useState(0)
    const [busy, setBusy] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLDivElement>(null)

    const targets: Target[] = useMemo(() => {
        const folders = flattenFolders(data?.folders ?? [])
            .map(folder => ({hashId: folder.hash_id, name: folder.name, path: folder.path}))
        return [{hashId: null, name: "미분류", path: "미분류"}, ...folders]
    }, [data])

    const matches = useMemo(() => {
        const keyword = query.trim().toLowerCase()
        if (!keyword) return targets
        return targets.filter(target => target.path.toLowerCase().includes(keyword))
    }, [targets, query])

    const canCreate = query.trim().length > 0 &&
        !targets.some(target => target.name.toLowerCase() === query.trim().toLowerCase())

    useEffect(() => {
        if (!open) return
        setQuery("")
        setCursor(0)
        // 모바일에서 키보드가 바로 올라오면 목록이 가려진다. 데스크톱에서만 포커스를 준다.
        if (window.matchMedia("(min-width: 768px)").matches) inputRef.current?.focus()
    }, [open])

    useEffect(() => {
        setCursor(current => Math.min(current, Math.max(0, matches.length - 1)))
    }, [matches.length])

    useEffect(() => {
        listRef.current?.querySelector<HTMLElement>("[data-active='true']")
            ?.scrollIntoView({block: "nearest"})
    }, [cursor])

    if (!open) return null

    const move = async (target: Target) => {
        if (busy) return
        setBusy(true)
        try {
            await moveNotesWithUndo({
                noteHashes,
                folder: target.hashId,
                folderName: target.path,
                notes,
                invalidate,
                onDone: () => onMoved?.(target.hashId ? {hashId: target.hashId, name: target.name} : null),
            })
            onClose()
        } finally {
            setBusy(false)
        }
    }

    const createAndMove = async () => {
        const created = await createFolder.mutateAsync({name: query.trim()})
        await move({hashId: created.hash_id, name: created.name, path: created.name})
    }

    const onKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === "Escape") {
            event.preventDefault()
            onClose()
        } else if (event.key === "ArrowDown") {
            event.preventDefault()
            setCursor(current => Math.min(current + 1, matches.length - 1))
        } else if (event.key === "ArrowUp") {
            event.preventDefault()
            setCursor(current => Math.max(current - 1, 0))
        } else if (event.key === "Enter") {
            event.preventDefault()
            if (matches[cursor]) move(matches[cursor])
            else if (canCreate) createAndMove()
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 bg-foreground/30 flex items-end md:items-start md:justify-center md:pt-28"
            onClick={onClose}
            role="presentation"
        >
            <div
                className="w-full md:max-w-md bg-surface rounded-t-2xl md:rounded-xl border border-border
                           shadow-xl overflow-hidden flex flex-col max-h-[80vh] md:max-h-[60vh]"
                onClick={event => event.stopPropagation()}
                onKeyDown={onKeyDown}
                role="dialog"
                aria-label="폴더로 이동"
            >
                {/* 모바일 시트 손잡이 */}
                <div className="md:hidden pt-2.5 pb-1 flex justify-center">
                    <span className="w-9 h-1 rounded-full bg-border-strong"/>
                </div>

                <div className="px-4 pt-2 pb-3 md:pt-3 border-b border-border">
                    <p className="md:hidden text-[13px] font-semibold text-foreground mb-2.5">
                        {noteHashes.length === 1 ? "노트 이동" : `노트 ${noteHashes.length}개 이동`}
                    </p>
                    <div className="flex items-center gap-2 bg-background rounded-lg px-3 h-11 md:h-9">
                        <FiSearch size={15} className="text-subtle shrink-0"/>
                        <input
                            id="move-folder-query"
                            ref={inputRef}
                            value={query}
                            onChange={event => {
                                setQuery(event.target.value)
                                setCursor(0)
                            }}
                            placeholder="폴더 이름"
                            autoComplete="off"
                            className="flex-1 bg-transparent outline-none text-[15px] md:text-[13px] text-foreground
                                       placeholder:text-subtle min-w-0"
                        />
                    </div>
                </div>

                <div ref={listRef} className="overflow-y-auto p-2 flex-1">
                    {matches.map((target, index) => {
                        const isCurrent = (target.hashId ?? null) === (currentFolder ?? null)
                        const parentPath = target.path.includes(" / ")
                            ? target.path.slice(0, target.path.lastIndexOf(" / "))
                            : null

                        return (
                            <button
                                key={target.hashId ?? "unfiled"}
                                data-active={index === cursor}
                                onMouseEnter={() => setCursor(index)}
                                onClick={() => move(target)}
                                disabled={busy}
                                className={`w-full flex items-center gap-2.5 px-3 rounded-lg text-left
                                    min-h-[52px] md:min-h-[36px] cursor-pointer transition-colors duration-100
                                    ${index === cursor ? "bg-accent-menu text-accent" : "text-muted hover:bg-background"}`}
                            >
                                {target.hashId === null
                                    ? <FiInbox size={16} className="shrink-0"/>
                                    : <FiFolder size={16} className="shrink-0"/>}
                                <span className="flex-1 min-w-0">
                                    <span className="block text-[15px] md:text-[13px] font-medium truncate">
                                        {target.name}
                                    </span>
                                    {parentPath && (
                                        <span className="block text-[11px] text-subtle truncate">{parentPath}</span>
                                    )}
                                </span>
                                {isCurrent && <span className="text-[11px] text-subtle shrink-0">현재 위치</span>}
                            </button>
                        )
                    })}

                    {canCreate && (
                        <button
                            onClick={createAndMove}
                            disabled={busy}
                            className="w-full flex items-center gap-2.5 px-3 rounded-lg text-left min-h-[52px]
                                       md:min-h-[36px] text-accent hover:bg-background cursor-pointer"
                        >
                            <FiPlus size={16} className="shrink-0"/>
                            <span className="text-[15px] md:text-[13px] font-medium truncate">
                                “{query.trim()}” 폴더를 만들어 옮기기
                            </span>
                        </button>
                    )}

                    {matches.length === 0 && !canCreate && (
                        <p className="py-8 text-center text-[13px] text-subtle">폴더가 없습니다.</p>
                    )}
                </div>

                <div className="hidden md:flex items-center gap-4 px-4 py-2 border-t border-border text-[11px] text-subtle">
                    <span className="flex items-center gap-1"><FiCornerDownLeft size={11}/> 선택</span>
                    <span>↑↓ 이동</span>
                    <span>Esc 닫기</span>
                </div>

                <button
                    onClick={onClose}
                    className="md:hidden border-t border-border py-3.5 text-[15px] font-medium text-muted cursor-pointer"
                >
                    취소
                </button>
            </div>
        </div>
    )
}
