"use client"

import {useEffect, useMemo, useRef, useState} from "react"
import {FiFileText, FiFolder, FiInbox, FiSearch} from "react-icons/fi"
import {previewText} from "@/lib/note"

import {Modal} from "@/components/ui/modal"
import {apiRequest} from "@/lib/api"
import {useFolders} from "@/hooks/useFolders"
import {folderPathLabel} from "@/types/folder"
import {NoteSearchResult} from "@/types/note"

interface Props {
    open: boolean
    onClose: () => void
    onPick: (note: { hashId: string, title: string }) => void
    /** 지금 편집 중인 노트. 자기 자신을 가리키는 링크는 만들 수 없다. */
    excludeId?: string
}

const DEBOUNCE_MS = 250

/**
 * 본문에 끼워 넣을 노트를 고르는 창.
 *
 * 열자마자 최근 노트를 보여준다 — 대부분은 방금 쓰던 노트를 가리키려는 것이라
 * 검색어를 치기 전에 답이 이미 목록에 있다. 키보드만으로 끝나야 "/" 로 부른 흐름이 끊기지 않는다.
 */
export function NotePickerModal({open, onClose, onPick, excludeId}: Props) {
    const [keyword, setKeyword] = useState("")
    const [notes, setNotes] = useState<NoteSearchResult[]>([])
    // 받은 목록이 어느 검색어 것인지. 지금 검색어와 다르면 받는 중이다.
    const [loadedFor, setLoadedFor] = useState<string | null>(null)
    const [cursor, setCursor] = useState(0)

    const {data: folderData} = useFolders(open)
    const listRef = useRef<HTMLDivElement>(null)

    const items = useMemo(
        () => notes.filter(note => note.hash_id !== excludeId),
        [notes, excludeId])

    // 열릴 때마다 검색어와 고른 줄을 비운다(렌더 중에 앞 상태와 견줘 맞춘다).
    const [wasOpen, setWasOpen] = useState(open)
    if (open !== wasOpen) {
        setWasOpen(open)
        if (open) {
            setKeyword("")
            setCursor(0)
        }
    }
    const requestKey = keyword.trim()
    const isLoading = open && loadedFor !== requestKey

    useEffect(() => {
        if (!open) return

        let aborted = false

        // 검색어가 없으면 최근 노트. 있으면 검색. 둘 다 같은 엔드포인트다.
        const query = keyword.trim() ? `?keyword=${encodeURIComponent(keyword.trim())}` : "?page=1"
        const timer = setTimeout(() => {
            apiRequest.get<NoteSearchResult[]>(`/notes${query}`)
                .then(data => {
                    if (aborted) return
                    setNotes(data)
                    setCursor(0)
                })
                .catch(() => {
                    if (!aborted) setNotes([])
                })
                .finally(() => {
                    if (!aborted) setLoadedFor(keyword.trim())
                })
        }, keyword.trim() ? DEBOUNCE_MS : 0)

        return () => {
            aborted = true
            clearTimeout(timer)
        }
    }, [keyword, open])

    useEffect(() => {
        listRef.current?.querySelector<HTMLElement>("[data-active='true']")
            ?.scrollIntoView({block: "nearest"})
    }, [cursor])

    /*
     * 창은 닫히는 애니메이션 동안 남아 있어서, 검색칸이 포커스를 쥔 채로 에디터가 포커스를
     * 되찾으려 하면 실패하고 검색칸이 사라질 때 포커스가 body 로 떨어진다(이어서 친 글자가 증발).
     * 넘기기 전에 먼저 놓아준다.
     */
    const release = () => (document.activeElement as HTMLElement | null)?.blur()

    const close = () => {
        release()
        onClose()
    }

    const pick = (note: NoteSearchResult) => {
        release()
        onPick({hashId: note.hash_id, title: note.title?.trim() || "제목 없음"})
    }

    const onKeyDown = (event: React.KeyboardEvent) => {
        // 한글 조합 중의 Enter/화살표는 글자를 확정하는 키다. 확정 뒤에 한 번 더 들어온다.
        if (event.nativeEvent.isComposing) return
        if (event.key === "ArrowDown") {
            event.preventDefault()
            setCursor(current => Math.min(current + 1, items.length - 1))
        } else if (event.key === "ArrowUp") {
            event.preventDefault()
            setCursor(current => Math.max(current - 1, 0))
        } else if (event.key === "Enter") {
            event.preventDefault()
            if (items[cursor]) pick(items[cursor])
        } else if (event.key === "Escape") {
            event.preventDefault()
            close()
        }
    }

    return (
        <Modal isOpen={open} onClose={close} slide
               className="md:rounded-xl w-full max-w-xl md:mx-4 md:h-[70vh] h-full">
            <div onKeyDown={onKeyDown} className="flex flex-col h-full min-h-0">
                <div className="flex items-center gap-2 border-b border-border px-4 h-14 shrink-0">
                    <FiSearch size={16} className="text-subtle shrink-0"/>
                    <input
                        // Modal 은 열린 뒤에야 내용을 마운트하므로 effect 에서 focus() 하면 늦는다.
                        autoFocus
                        value={keyword}
                        onChange={event => setKeyword(event.target.value)}
                        placeholder="가져올 노트 제목"
                        autoComplete="off"
                        className="flex-1 bg-transparent outline-none text-[15px] md:text-[14px]
                                   text-foreground placeholder:text-subtle min-w-0"
                    />
                    <span className="hidden md:block text-[11px] text-subtle shrink-0">↑↓ 이동 · Enter 선택 · Esc 닫기</span>
                </div>

                <div ref={listRef} className="flex-1 overflow-y-auto p-2 min-h-0">
                    {isLoading && items.length === 0 ? (
                        Array.from({length: 5}).map((_, i) => (
                            <div key={i} className="flex flex-col gap-2 px-3 py-2.5">
                                <div className="skeleton h-3.5 w-1/3"/>
                                <div className="skeleton h-3 w-2/3"/>
                            </div>
                        ))
                    ) : items.length === 0 ? (
                        <p className="py-10 text-center text-[13px] text-subtle">
                            {keyword.trim() ? "찾는 노트가 없습니다." : "가져올 노트가 없습니다."}
                        </p>
                    ) : (
                        items.map((note, index) => {
                            const preview = previewText(note.content)

                            return (
                                <button
                                    key={note.hash_id}
                                    data-active={index === cursor}
                                    onMouseEnter={() => setCursor(index)}
                                    onClick={() => pick(note)}
                                    className={`w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-left
                                        cursor-pointer transition-colors duration-100
                                        ${index === cursor ? "bg-accent-menu" : "hover:bg-background"}`}
                                >
                                    <FiFileText size={15}
                                                className={`mt-0.5 shrink-0 ${index === cursor ? "text-accent" : "text-subtle"}`}/>
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-center gap-1 text-[11px] leading-tight text-subtle">
                                            {note.folder
                                                ? <FiFolder size={10} className="shrink-0"/>
                                                : <FiInbox size={10} className="shrink-0"/>}
                                            <span className="truncate">
                                                {note.folder
                                                    ? folderPathLabel(folderData?.folders ?? [], note.folder.hashId).replace(/^\//, "")
                                                    : "개인 노트"}
                                            </span>
                                        </span>
                                        <span className={`block truncate text-[14px] font-medium
                                            ${note.title?.trim() ? "text-foreground" : "text-subtle"}`}>
                                            {note.title?.trim() || "제목 없음"}
                                        </span>
                                        {preview && (
                                            <span className="block truncate text-[12px] text-muted">{preview}</span>
                                        )}
                                    </span>
                                </button>
                            )
                        })
                    )}
                </div>

                <button
                    onClick={close}
                    className="md:hidden border-t border-border py-3.5 text-[15px] font-medium text-muted cursor-pointer shrink-0"
                >
                    취소
                </button>
            </div>
        </Modal>
    )
}
