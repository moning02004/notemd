"use client"

import {Dispatch, SetStateAction, useEffect, useRef} from "react";
import {useNotePatch} from "@/hooks/useNotePatch";
import {NoteDraft} from "@/hooks/useNoteDetail";
import Cookies from "js-cookie";

const TEXT_DEBOUNCE_MS = 500

const sameList = (a: readonly string[], b: readonly string[]) =>
    a.length === b.length && a.every((value, index) => value === b[index])

const workspaceIds = (draft: NoteDraft) => draft.workspaces.map(workspace => workspace.hashId)

/** 마지막으로 저장한 스냅샷과 비교해 바뀐 필드만 서버 형식으로 만든다. */
function buildPatch(saved: NoteDraft, next: NoteDraft): Record<string, unknown> {
    const patch: Record<string, unknown> = {}

    if (saved.title !== next.title) patch.title = next.title
    if (saved.content !== next.content) patch.content = next.content
    if (saved.isPublic !== next.isPublic) patch.is_public = next.isPublic
    if (saved.isProtected !== next.isProtected) patch.is_protected = next.isProtected
    if (saved.isEncrypted !== next.isEncrypted) patch.is_encrypted = next.isEncrypted
    if (saved.password !== next.password) patch.password = next.password
    patch.is_first_edit = Cookies.get("is_first_edit") === "1"
    if (!sameList(saved.tags, next.tags)) patch.tags = next.tags
    if (!sameList(workspaceIds(saved), workspaceIds(next))) patch.workspaces = workspaceIds(next)

    // 암호화 설정이 바뀌면 서버가 본문을 다시 처리해야 하므로 content를 함께 보낸다.
    if ("is_encrypted" in patch || "password" in patch) patch.content = next.content

    return patch
}

type Options = {
    noteId: string
    draft: NoteDraft | null
    /** 소유자이고 노트 로딩이 끝났을 때만 true */
    enabled: boolean
    setStatusType: Dispatch<SetStateAction<string>>
}

export function useNoteAutosave({noteId, draft, enabled, setStatusType}: Options) {
    const patchNote = useNotePatch(setStatusType)
    const patchNoteRef = useRef(patchNote)
    const savedRef = useRef<NoteDraft | null>(null)

    useEffect(() => {
        patchNoteRef.current = patchNote
    })

    useEffect(() => {
        if (!enabled || !draft) return

        // 로드 직후 첫 스냅샷. 이 시점에는 저장할 변경분이 없다.
        if (!savedRef.current) {
            savedRef.current = draft
            return
        }

        const patch = buildPatch(savedRef.current, draft)
        if (Object.keys(patch).length === 0) return

        // 본문/제목은 타이핑이 멈춘 뒤에, 설정 변경은 즉시 저장한다.
        const isTextEdit = "title" in patch || "content" in patch
        setStatusType("loading")

        const timer = setTimeout(() => {
            savedRef.current = draft
            patchNoteRef.current(noteId, patch)
        }, isTextEdit ? TEXT_DEBOUNCE_MS : 0)

        return () => clearTimeout(timer)
    }, [draft, enabled, noteId, setStatusType])
}