"use client"

import {useEffect, useState} from "react"
import {EditorContent} from "@tiptap/react"
import {Maximize2, X} from "lucide-react"
import {FiLock, FiSlash, FiTrash2} from "react-icons/fi"

import {ApiError, apiRequest} from "@/lib/api"
import {useEditorInstance} from "@/lib/create_editor"
import {NoteDetailResponse} from "@/types/note"

interface Props {
    /** 펼쳐 볼 노트. null 이면 패널이 닫혀 있다. */
    noteId: string | null
    onClose: () => void
    /** 패널 안의 노트 링크를 눌렀을 때. 패널에서 그 노트로 바꿔 보여준다. */
    onNavigate: (noteId: string) => void
    /** 전체 화면으로 열기. 노트 화면으로 옮겨 간다. */
    onOpenFull: (noteId: string) => void
}

type PeekState =
    | { status: "loading" }
    | { status: "ready", note: NoteDetailResponse }
    | { status: "locked" }
    | { status: "deleted" }
    | { status: "unavailable" }

/**
 * 본문의 노트 링크를 눌렀을 때 오른쪽에 펼쳐지는 참조 패널.
 *
 * 링크를 누르는 건 대개 '저 노트에 뭐라고 썼더라' 를 확인하려는 것이지 그리로 옮겨 가려는 게 아니다.
 * 쓰던 노트를 떠나지 않고 옆에 띄워 보고, 정말 가야 할 때만 전체 화면으로 연다.
 * 데스크톱에서는 뒤를 가리지 않아 보면서 계속 쓸 수 있고, 모바일에서는 화면을 덮는다.
 */
export function NotePeekPanel({noteId, onClose, onNavigate, onOpenFull}: Props) {
    const [state, setState] = useState<PeekState>({status: "loading"})

    useEffect(() => {
        if (!noteId) return

        let aborted = false
        setState({status: "loading"})

        apiRequest.get<NoteDetailResponse>(`/notes/${noteId}`)
            .then(note => {
                if (!aborted) setState({status: "ready", note})
            })
            .catch(error => {
                if (aborted) return
                if (error instanceof ApiError && (error.detail as { is_password?: boolean })?.is_password) {
                    setState({status: "locked"})
                } else if (error instanceof ApiError && error.status === 410) {
                    setState({status: "deleted"})
                } else {
                    setState({status: "unavailable"})
                }
            })

        return () => {
            aborted = true
        }
    }, [noteId])

    useEffect(() => {
        if (!noteId) return

        /*
         * 에디터는 Esc 를 늘 preventDefault 하므로 그걸로는 누구 몫인지 알 수 없다.
         * 슬래시 메뉴는 에디터가 Esc 를 받자마자 떼어 내므로, 그보다 먼저(캡처 단계에서) 떠 있는지 본다.
         * 입력칸(노트 고르기 검색, 링크 주소 등)의 Esc 도 그 창을 닫는 몫이다.
         */
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return
            if (document.querySelector("[data-slash-menu]")) return
            if ((event.target as HTMLElement | null)?.closest("input, textarea, select")) return
            onClose()
        }
        window.addEventListener("keydown", onKeyDown, true)
        return () => window.removeEventListener("keydown", onKeyDown, true)
    }, [noteId, onClose])

    if (!noteId) return null

    const title = state.status === "ready" ? (state.note.title?.trim() || "제목 없음") : ""
    const iconButton = "p-2 rounded-lg text-muted hover:bg-background hover:text-foreground cursor-pointer transition-colors duration-150"

    return (
        <aside
            aria-label="참조한 노트"
            className="note-peek fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-border
                       bg-surface shadow-2xl md:w-[var(--note-peek-width)]"
        >
            <div className="flex h-14 shrink-0 items-center gap-1 border-b border-border px-3">
                <span className={`min-w-0 flex-1 truncate px-1 text-[15px] font-medium
                    ${state.status === "ready" && state.note.title?.trim() ? "text-foreground" : "text-subtle"}`}>
                    {title}
                </span>
                <button className={iconButton} title="전체 화면으로 열기" onClick={() => onOpenFull(noteId)}>
                    <Maximize2 size={17}/>
                </button>
                <button className={iconButton} title="닫기 (Esc)" onClick={onClose}>
                    <X size={19}/>
                </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
                {state.status === "loading" && (
                    <div className="flex flex-col gap-3 p-5">
                        <div className="skeleton h-4 w-2/3"/>
                        <div className="skeleton h-4 w-full"/>
                        <div className="skeleton h-4 w-5/6"/>
                    </div>
                )}
                {state.status === "ready" && (
                    // 노트마다 에디터를 새로 만든다. 초기 본문으로만 그리므로 key 로 갈아 끼운다.
                    <PeekContent key={noteId} content={state.note.content ?? ""} onOpenNote={onNavigate}/>
                )}
                {state.status === "locked" && (
                    <PeekMessage icon={<FiLock size={22}/>} text="비밀번호가 걸린 노트입니다.">
                        <button className="text-accent underline cursor-pointer" onClick={() => onOpenFull(noteId)}>
                            전체 화면에서 비밀번호 입력하기
                        </button>
                    </PeekMessage>
                )}
                {state.status === "deleted" && (
                    <PeekMessage icon={<FiTrash2 size={22}/>} text="삭제된 노트입니다."/>
                )}
                {state.status === "unavailable" && (
                    <PeekMessage icon={<FiSlash size={22}/>} text="없거나 볼 수 없는 노트입니다."/>
                )}
            </div>
        </aside>
    )
}

function PeekContent({content, onOpenNote}: { content: string, onOpenNote: (noteId: string) => void }) {
    const editor = useEditorInstance({
        initialContent: content,
        setContent: () => {},
        uploadFile: async () => "",
        onOpenNote,
        editable: false,
    })

    if (!editor) return null
    return <EditorContent editor={editor} className="px-1 pb-10"/>
}

function PeekMessage({icon, text, children}: { icon: React.ReactNode, text: string, children?: React.ReactNode }) {
    return (
        <div className="flex flex-col items-center gap-2 px-6 py-16 text-center text-[13px] text-muted">
            <span className="text-subtle">{icon}</span>
            <p className="text-[14px] text-foreground">{text}</p>
            {children}
        </div>
    )
}
