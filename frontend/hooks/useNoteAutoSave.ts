"use client"

import {Dispatch, SetStateAction, useCallback, useEffect, useRef} from "react";
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
    // if (saved.isEncrypted !== next.isEncrypted) patch.is_encrypted = next.isEncrypted
    if (saved.password !== next.password) patch.password = next.password
    patch.is_first_edit = Cookies.get("is_first_edit") === "1"
    patch.is_encrypted = next.isEncrypted

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
    // 대기 중인 디바운스. 수동 저장이 이걸 앞당겨 실행한다.
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
            timerRef.current = null
            savedRef.current = draft
            patchNoteRef.current(noteId, patch)
        }, isTextEdit ? TEXT_DEBOUNCE_MS : 0)
        timerRef.current = timer

        return () => {
            clearTimeout(timer)
            if (timerRef.current === timer) timerRef.current = null
        }
    }, [draft, enabled, noteId, setStatusType])

    /**
     * 기다리지 않고 지금 저장한다(⌘/Ctrl + S).
     *
     * 자동 저장이 이미 있지만, 타이핑을 멈춘 500ms 사이에 창을 닫거나 하면 불안하다.
     * "저장했다"를 사람이 직접 확인할 수 있는 길을 하나 열어둔다.
     */
    const saveNow = useCallback(() => {
        if (!enabled || !draft) return false

        if (timerRef.current) {
            clearTimeout(timerRef.current)
            timerRef.current = null
        }

        const patch = buildPatch(savedRef.current ?? draft, draft)
        savedRef.current = draft
        setStatusType("loading")
        patchNoteRef.current(noteId, patch)
        return true
    }, [draft, enabled, noteId, setStatusType])

    return {saveNow}
}