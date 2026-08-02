"use client"

import {useState} from "react";
import {notFound, useParams, useRouter} from "next/navigation";
import toast from "react-hot-toast";

import {MarkdownEditor} from "@/components/editor";
import {LoadingPage} from "@/components/loading";
import {NoteSettings} from "@/components/note_settings";
import NotePasswordModal from "@/components/note/password_modal";
import {useAuthStore} from "@/store/auth";
import {useNoteDetail} from "@/hooks/useNoteDetail";
import {useNoteAutosave} from "@/hooks/useNoteAutoSave";

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

    const {state, draft, isOwner, setters, unlock} = useNoteDetail(noteId)

    useNoteAutosave({
        noteId,
        draft,
        enabled: isOwner && state.status === "ready",
        setStatusType,
    })

    if (state.status === "error") {
        if (state.statusCode === 404) return notFound()
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center gap-2">
                <p>노트를 불러오지 못했습니다. (오류 {state.statusCode})</p>
                <button className="underline" onClick={() => router.refresh()}>다시 시도</button>
            </div>
        )
    }

    if (state.status === "password") {
        return (
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
        )
    }

    if (!draft) return <LoadingPage/>

    const isReadonly = !token || draft.isProtected

    return (
        <div className="relative h-screen w-full">
            <div className="flex h-full w-full">
                <MarkdownEditor setOpenedSetting={setOpenedSetting}
                                isReadonly={isReadonly}
                                paramsNoteId={noteId}
                                isOwner={isOwner}
                                title={draft.title}
                                content={draft.content}
                                setTitle={setters.setTitle}
                                setContent={setters.setContent}
                                statusType={statusType}
                                widthClass={EDITOR_WIDTH_CLASSES[editorWidth] ?? EDITOR_WIDTH_CLASSES[DEFAULT_EDITOR_WIDTH]}
                />
            </div>

            {isOpenedSetting &&
                <div
                    className="fixed inset-0 z-10 bg-foreground/25 backdrop-blur-[2px] transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    onClick={() => setOpenedSetting(false)}
                />
            }

            {token &&
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