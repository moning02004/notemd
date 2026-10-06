"use client"

import {useCallback, useEffect, useState} from "react";
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
import {useSaveBeforeLeaving} from "@/hooks/useSaveBeforeLeaving";
import {FiAlertTriangle, FiTrash2, FiWifiOff} from "react-icons/fi";
import {useCollabDocument} from "@/hooks/useCollabDocument";
import {COLLAB_URL} from "@/constants/api";
import {EDITOR_WIDTHS, useEditorWidth} from "@/hooks/useEditorWidth";

export default function Page() {
    const router = useRouter()
    const token = useAuthStore(state => state.token)
    const {noteId} = useParams() as { noteId: string }

    const [isOpenedSetting, setOpenedSetting] = useState(false)
    const [editorWidth, setEditorWidth] = useEditorWidth()
    const [statusType, setStatusType] = useState("")

    const {state, draft, isOwner, isEditable, isDeleted, setters, unlock, reload, password} = useNoteDetail(noteId)
    const [isRestoring, setIsRestoring] = useState(false)

    const isSavable = isEditable && state.status === "ready"

    /*
     * 공동 편집(4.0). 노트를 불러오면 collab 서버에 붙는다(휴지통 노트는 붙지 않고 저장본을 보여 준다).
     * 로그인한 사람만 붙는다. 공개 링크로 보는 비회원은 실시간 없이 저장본을 본다(서버도 거절한다).
     * 권한은 서버가 정한다: 편집할 수 있으면 읽기·쓰기, 볼 수만 있으면 읽기 전용, 볼 수 없으면 거절.
     * 거절되면 예전처럼 저장본을 읽기 전용으로 보여 준다.
     */
    /*
     * 공동 편집 서버에 붙지 못하면(서버가 꺼졌거나 프록시 설정이 틀림) 실시간 없이 저장본을 고친다(예전처럼 자동 저장).
     * 한 번 그렇게 되면 이 노트를 다시 열 때까지 연결을 멈춘다. 고치는 도중에 붙어 공동 편집 문서로 바꿔 그리면
     * 아직 저장하지 못한 글이 사라진다. 그동안 저장한 본문은 서버가 다음에 문서를 열 때 새로 읽는다(저장된 Y 문서를 비운다).
     */
    const [fallbackNoteId, setFallbackNoteId] = useState<string | null>(null)
    const collabFallback = fallbackNoteId === noteId

    const collabSession = useCollabDocument({
        noteId,
        enabled: Boolean(COLLAB_URL) && Boolean(token) && state.status === "ready" && !isDeleted && !collabFallback,
        password,
        // 이 기기에 사본을 두어 끊겨도 고칠 수 있게 한다(4.1). 암호화·비밀번호 노트는 공용 컴퓨터에 남지 않게 두지 않는다.
        persist: Boolean(draft) && !draft?.isEncrypted && !draft?.password && !password,
    })
    // 서버 문서도 이 기기의 사본도 없이 오래 걸리면 실시간 없이 고치는 쪽으로 넘어간다(위).
    const collabStalled = Boolean(collabSession && !collabSession.synced && collabSession.stalled
        && collabSession.status !== "denied")
    if (collabStalled && !collabFallback) setFallbackNoteId(noteId)
    const collab = collabSession && collabSession.status !== "denied" && !collabStalled ? collabSession : null
    const collabDenied = collabSession?.status === "denied"

    // 방금 고친 채로 나갈 때만 공동 편집의 늦은 저장을 당긴다(useSaveBeforeLeaving).
    const saveBeforeLeaving = useSaveBeforeLeaving(noteId, collab && isEditable ? collab.doc : null)

    // 제목도 Y 문서(Text "title")로 같이 편집한다. 다른 사람이 고친 제목을 화면에 옮긴다.
    const setTitleState = setters.setTitle
    useEffect(() => {
        if (!collab) return
        const title = collab.doc.getText("title")
        const apply = () => setTitleState(title.toString())
        title.observe(apply)
        if (collab.synced) apply()
        return () => title.unobserve(apply)
    }, [collab, setTitleState])

    const setTitle = useCallback((value: string) => {
        if (collab) {
            const title = collab.doc.getText("title")
            collab.doc.transact(() => {
                title.delete(0, title.length)
                title.insert(0, value)
            })
        }
        setTitleState(value)
    }, [collab, setTitleState])

    /*
     * 본문을 통째로 바꾼다(스냅샷 복원·템플릿 적용). 공동 편집에서는 에디터가 content 를 따르지 않으므로
     * 에디터에 직접 넣도록 건넨다. 그러면 Y 문서를 거쳐 같이 보는 모두에게 바뀐다.
     */
    const [replacement, setReplacement] = useState<{ content: string, seq: number } | null>(null)
    const setContentState = setters.setContent
    const replaceContent = useCallback((value: string) => {
        if (collab) setReplacement(previous => ({content: value, seq: (previous?.seq ?? 0) + 1}))
        else setContentState(value)
    }, [collab, setContentState])

    const {saveNow, conflict, overwrite} = useNoteAutosave({
        noteId,
        draft,
        enabled: isSavable,
        collab: Boolean(collab),
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
    // 공동 편집은 서버 문서를 받은 뒤에 그린다. 빈 문서에 먼저 쓰면 받아 온 내용과 섞인다.
    if (collab && !collab.synced) return <EditorSkeleton/>

    // 휴지통 노트는 복원하기 전까지 고칠 수 없다(서버도 막는다). 공동 편집은 서버가 읽기 전용으로 붙였으면 따른다.
    // 오프라인이면 서버가 권한을 알려 주지 못했으므로, 노트를 불러올 때 받은 권한을 따른다.
    // 실시간 없이 고칠 때는 서버가 권한을 알려 주지 못했으므로 노트를 불러올 때 받은 권한을 따른다(오프라인과 같다).
    const isReadonly = !token || draft.isProtected || isDeleted || collabDenied
        || (collabFallback && !isEditable)
        || (collab?.offline ? !isEditable : Boolean(collab?.readOnly))
    // 공동 편집 중에는 저장 표시가 연결 상태를 따른다(편집은 연결돼 있는 동안 계속 저장된다).
    const collabStatusType = collab?.status === "connected" ? "complete"
        : collab?.status === "connecting" ? "loading" : "warning"

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
     * 다른 탭·기기·공유 멤버가 먼저 저장했다(공동 편집을 쓰지 않을 때만 생긴다). 자동 저장은 멈춰 있고,
     * 고친 내용은 화면에 남아 있다. 어느 쪽을 남길지 사람이 고른다.
     */
    const keepMine = () => {
        if (confirm("다른 곳에서 저장한 내용을 지우고 이 화면의 내용으로 저장합니다. 계속하시겠습니까?")) overwrite()
    }
    const conflictNotice = conflict && (
        <div role="alert"
             className="flex flex-wrap items-center gap-2 border-b border-border bg-chip-open-soft px-4 py-2.5 text-[13px] text-chip-open">
            <FiAlertTriangle size={14} className="shrink-0"/>
            <span className="flex-1 min-w-48">
                다른 곳에서 이 노트를 먼저 저장해 자동 저장을 멈췄습니다.
            </span>
            <button onClick={reload}
                    className="shrink-0 rounded-md bg-surface px-3 py-1 font-medium text-foreground
                               border border-border cursor-pointer hover:bg-background">
                최신 내용 불러오기
            </button>
            <button onClick={keepMine}
                    className="shrink-0 rounded-md px-3 py-1 font-medium cursor-pointer hover:underline">
                내 내용으로 덮어쓰기
            </button>
        </div>
    )

    // 서버 문서를 받은 뒤 연결이 끊겼거나, 처음부터 못 붙어 이 기기의 사본으로 고치는 중.
    const collabOffline = Boolean(collab && (collab.offline || collab.status !== "connected"))
    const offlineNotice = collabOffline && !isReadonly && (
        <div role="status"
             className="flex items-center gap-2 border-b border-border bg-background px-4 py-2 text-[13px] text-muted">
            <FiWifiOff size={14} className="shrink-0"/>
            <span className="flex-1">
                {collab?.persisted
                    ? "오프라인입니다. 고친 내용은 이 기기에 저장해 두었다가 다시 연결되면 합칩니다."
                    : "오프라인입니다. 다시 연결되면 합칩니다. 그 전에 창을 닫으면 고친 내용이 사라집니다."}
            </span>
        </div>
    )

    const collabNotice = collabFallback && !isDeleted && (
        <div role="status"
             className="flex items-center gap-2 border-b border-border bg-chip-open-soft px-4 py-2.5 text-[13px] text-chip-open">
            <FiAlertTriangle size={14} className="shrink-0"/>
            <span className="flex-1">
                공동 편집 서버에 연결하지 못해 실시간 반영 없이 편집합니다. 고친 내용은 그대로 저장되지만,
                그사이 다른 사람이 같은 노트를 고치면 먼저 저장된 쪽을 알려 드립니다. 노트를 다시 열면 연결을 다시 시도합니다.
            </span>
        </div>
    )

    return (
        <div className="relative h-screen w-full">
            <div className="flex h-full w-full">
                <MarkdownEditor key={collab ? (collab.offline ? "offline" : "collab") : "static"}
                                collab={collab}
                                setOpenedSetting={setOpenedSetting}
                                isReadonly={isReadonly}
                                isOwner={isOwner && !isDeleted}
                                paramsNoteId={noteId}
                                title={draft.title}
                                content={draft.content}
                                setTitle={setTitle}
                                setContent={setters.setContent}
                                replacement={replacement}
                                statusType={collab ? collabStatusType : statusType}
                                widthClass={EDITOR_WIDTHS[editorWidth].className}
                                notice={deletedNotice || collabNotice || offlineNotice || conflictNotice}
                                peers={collab?.peers}
                                onBeforeLeave={saveBeforeLeaving}
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
                              setTitle={setTitle}
                              setContent={replaceContent}
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