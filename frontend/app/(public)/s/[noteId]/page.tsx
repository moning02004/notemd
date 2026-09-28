"use client"

import {useEffect, useState} from "react";
import {notFound, useParams, useRouter} from "next/navigation";
import toast from "react-hot-toast";

import {MarkdownEditor} from "@/components/editor";
import {EditorSkeleton} from "@/components/editor_skeleton";
import {NoteSettings} from "@/components/note_settings";
import NotePasswordModal from "@/components/note/password_modal";
import {useAuthStore} from "@/store/auth";
import {useNoteDetail} from "@/hooks/useNoteDetail";
import {useNoteAutosave} from "@/hooks/useNoteAutoSave";
import {apiRequest} from "@/lib/api";
import {FiAlertTriangle, FiTrash2} from "react-icons/fi";

// Tailwind는 소스에 리터럴로 존재하는 클래스명만 인식하므로 `w-[${n}%]`처럼 동적으로
// 조합하면 CSS가 생성되지 않는다. note_settings.tsx의 <select> 옵션과 값을 맞춰야 함.
const EDITOR_WIDTH_CLASSES: Record<number, string> = {
    100: "w-[100%]",
    70: "w-[70%]",
    50: "w-[50%]",
}
const DEFAULT_EDITOR_WIDTH = 100

export default function Page() {
    const router = useRouter()
    const token = useAuthStore(state => state.token)
    const {noteId} = useParams() as { noteId: string }

    const [isOpenedSetting, setOpenedSetting] = useState(false)
    const [editorWidth, setEditorWidth] = useState(DEFAULT_EDITOR_WIDTH)
    const [statusType, setStatusType] = useState("")

    const {state, draft, isOwner, isEditable, isDeleted, setters, unlock, reload} = useNoteDetail(noteId)
    const [isRestoring, setIsRestoring] = useState(false)

    const isSavable = isEditable && state.status === "ready"

    const {saveNow, conflict, overwrite} = useNoteAutosave({
        noteId,
        draft,
        enabled: isSavable,
        setStatusType,
    })

    // ⌘/Ctrl + S 로 지금 저장. 브라우저의 '페이지 저장' 대화상자를 대신 가로챈다.
    // 편집할 수 있는 노트에서만 막는다 — 읽기 전용 화면에서는 브라우저 기본 동작이 맞다.
    useEffect(() => {
        if (!isSavable) return

        const onKeyDown = (event: KeyboardEvent) => {
            if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "s") return
            event.preventDefault()
            if (saveNow()) toast.success("저장했습니다.")
        }

        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [isSavable, saveNow])

    if (state.status === "error") {
        if (state.statusCode === 404) return notFound()
        // 볼 수 있던 노트가 휴지통으로 옮겨졌다. 없는 노트(404)와 구분해 알려준다.
        if (state.statusCode === 410) return (
            <div className="flex h-screen w-full flex-col items-center justify-center gap-3 px-4 text-center">
                <FiTrash2 size={28} className="text-subtle"/>
                <p className="text-[15px] font-medium text-foreground">삭제된 노트입니다.</p>
                <p className="text-[13px] text-muted">작성자가 이 노트를 휴지통으로 옮겼습니다.</p>
                {token &&
                    <button className="mt-2 text-[13px] text-accent underline cursor-pointer"
                            onClick={() => router.replace("/")}>
                        내 노트로 돌아가기
                    </button>}
            </div>
        )
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center gap-2">
                <p>노트를 불러오지 못했습니다. (오류 {state.statusCode})</p>
                <button className="underline" onClick={() => router.refresh()}>다시 시도</button>
            </div>
        )
    }

    if (state.status === "password") {
        return (
            <>
                <EditorSkeleton/>
                <NotePasswordModal
                    open
                    onClose={() => router.replace("/")}
                    onSubmit={async (password: string) => {
                        try {
                            await unlock(password)
                        } catch {
                            toast.error("비밀번호가 일치하지 않습니다.")
                        }
                    }}
                />
            </>
        )
    }

    if (!draft) return <EditorSkeleton/>

    // 휴지통 노트는 복원하기 전까지 고칠 수 없다(서버도 막는다).
    const isReadonly = !token || draft.isProtected || isDeleted

    const restore = async () => {
        setIsRestoring(true)
        try {
            await apiRequest.patch(`/notes/${noteId}/restore`)
            toast.success("노트를 복원했습니다.")
            reload()
        } catch {
            toast.error("복원하지 못했습니다.")
        } finally {
            setIsRestoring(false)
        }
    }

    const deletedNotice = isDeleted && (
        <div className="flex items-center gap-2 border-b border-border bg-danger-soft px-4 py-2.5 text-[13px] text-danger">
            <FiTrash2 size={14} className="shrink-0"/>
            <span className="flex-1">휴지통에 있는 노트입니다. 복원하면 다시 고칠 수 있습니다.</span>
            <button onClick={restore}
                    disabled={isRestoring}
                    className="shrink-0 rounded-md bg-surface px-3 py-1 font-medium text-foreground
                               border border-border cursor-pointer hover:bg-background disabled:opacity-50">
                {isRestoring ? "복원 중…" : "복원"}
            </button>
        </div>
    )

    /*
     * 다른 탭·기기·공유 멤버가 먼저 저장했다. 자동 저장은 멈춰 있고, 고친 내용은 화면에 남아 있다.
     * 어느 쪽을 남길지 사람이 고른다. 불러오면 이 화면에서 고친 내용은 사라진다.
     */
    const conflictNotice = conflict && (
        <div role="alert"
             className="flex flex-wrap items-center gap-2 border-b border-border bg-chip-open-soft px-4 py-2.5 text-[13px] text-chip-open">
            <FiAlertTriangle size={14} className="shrink-0"/>
            <span className="flex-1 min-w-48">
                다른 곳에서 이 노트를 먼저 저장해 자동 저장을 멈췄습니다. 어느 내용을 남길까요?
            </span>
            <div className="flex shrink-0 gap-1.5">
                <button onClick={reload} title="이 화면에서 고친 내용은 사라집니다"
                        className="rounded-md bg-surface px-3 py-1 font-medium text-foreground
                                   border border-border cursor-pointer hover:bg-background">
                    최신 내용 불러오기
                </button>
                <button onClick={overwrite}
                        className="rounded-md bg-surface px-3 py-1 font-medium text-foreground
                                   border border-border cursor-pointer hover:bg-background">
                    지금 내용으로 저장
                </button>
            </div>
        </div>
    )

    return (
        <div className="relative h-screen w-full">
            <div className="flex h-full w-full">
                <MarkdownEditor setOpenedSetting={setOpenedSetting}
                                isReadonly={isReadonly}
                                isOwner={isOwner && !isDeleted}
                                isEditable={isEditable}
                                paramsNoteId={noteId}
                                title={draft.title}
                                content={draft.content}
                                setTitle={setters.setTitle}
                                setContent={setters.setContent}
                                statusType={statusType}
                                widthClass={EDITOR_WIDTH_CLASSES[editorWidth] ?? EDITOR_WIDTH_CLASSES[DEFAULT_EDITOR_WIDTH]}
                                notice={deletedNotice || conflictNotice}
                />
            </div>

            {isOpenedSetting &&
                <div
                    className="fixed inset-0 z-10 bg-foreground/25 backdrop-blur-[2px] transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    onClick={() => setOpenedSetting(false)}
                />
            }

            {token && !isDeleted &&
                <NoteSettings noteId={noteId}
                              {...setters}
                              isPublic={draft.isPublic}
                              isProtected={draft.isProtected}
                              isEncrypted={draft.isEncrypted}
                              notePassword={draft.password}
                              selectedTags={draft.tags}
                              selectedWorkspaces={draft.workspaces}
                              currentTitle={draft.title}
                              currentContent={draft.content}
                              editorWidth={editorWidth}
                              setEditorWidth={setEditorWidth}
                              isOpenedSetting={isOpenedSetting}
                              setOpenedSetting={setOpenedSetting}
                              setStatusType={setStatusType}
                              afterApplyTemplate={() => setOpenedSetting(false)}
                />
            }
        </div>
    );
}