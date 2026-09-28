"use client"

import {Dispatch, SetStateAction, useCallback, useEffect, useRef, useState} from "react";
import {NotePatchData, useNotePatch} from "@/hooks/useNotePatch";
import {NoteDraft} from "@/hooks/useNoteDetail";
import Cookies from "js-cookie";

const TEXT_DEBOUNCE_MS = 500

const sameList = (a: readonly string[], b: readonly string[]) =>
    a.length === b.length && a.every((value, index) => value === b[index])

const workspaceIds = (draft: NoteDraft) => draft.workspaces.map(workspace => workspace.hashId)

/** 마지막으로 저장한 스냅샷과 비교해 바뀐 필드만 서버 형식으로 만든다. */
function buildPatch(saved: NoteDraft, next: NoteDraft): NotePatchData {
    const patch: NotePatchData = {}

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
    // 디바운스에 걸려 아직 못 보낸 변경분. 노트를 떠날 때 버리지 않고 보낸다.
    const pendingRef = useRef<{ noteId: string, patch: NotePatchData } | null>(null)

    /*
     * 다른 곳의 저장을 덮어쓰지 않기.
     *
     * 서버에서 마지막으로 받은 버전(updated_at)을 들고 있다가 본문·제목을 저장할 때 함께 보낸다.
     * 그 사이 다른 탭·기기·공유 멤버가 저장했으면 서버가 거절(409)하고, 그때부터 자동 저장을 멈춘 채
     * 다른 곳에서 무엇이 바뀌었는지 보여 주고 합칠지(acceptMerged), 최신 내용을 불러올지, 덮어쓸지 사람에게 묻는다.
     * 자기 저장끼리 버전이 엇갈리지 않도록 저장은 한 번에 하나씩, 앞 저장의 응답을 받은 뒤에 보낸다.
     */
    const baseRef = useRef<{ noteId: string, updatedAt: string | null } | null>(null)
    // 마지막으로 서버와 맞춰 둔 제목·본문. 합칠 때 기준본이 된다(무엇이 어디서 바뀌었는지 가르는 기준).
    const syncedRef = useRef<{ noteId: string, title: string, content: string } | null>(null)
    const queueRef = useRef<Promise<void>>(Promise.resolve())
    const conflictRef = useRef(false)
    const [conflict, setConflict] = useState(false)

    const markConflict = useCallback((value: boolean) => {
        conflictRef.current = value
        setConflict(value)
    }, [])

    /** force: 버전을 보내지 않고 덮어쓴다('지금 내용으로 저장'). */
    const send = useCallback((targetNoteId: string, patch: NotePatchData, force = false) => {
        queueRef.current = queueRef.current.then(async () => {
            if (conflictRef.current && !force) return

            const base = baseRef.current?.noteId === targetNoteId ? baseRef.current.updatedAt : null
            const isTextEdit = "title" in patch || "content" in patch
            const body = isTextEdit && base && !force ? {...patch, base_updated_at: base} : patch

            const result = await patchNoteRef.current(targetNoteId, body)
            if ("updatedAt" in result) {
                if (baseRef.current?.noteId === targetNoteId) baseRef.current.updatedAt = result.updatedAt
                const synced = syncedRef.current
                if (synced?.noteId === targetNoteId) {
                    if (patch.title !== undefined) synced.title = patch.title ?? ""
                    if (patch.content !== undefined) synced.content = patch.content
                }
                if (force) markConflict(false)
            } else if (result.conflict && baseRef.current?.noteId === targetNoteId) {
                markConflict(true)
            }
        })
    }, [markConflict])

    useEffect(() => {
        patchNoteRef.current = patchNote
    })

    useEffect(() => {
        if (!enabled || !draft) return

        // 로드 직후 첫 스냅샷. 이 시점에는 저장할 변경분이 없다.
        // 다시 불러온 경우(버전이 바뀜)도 새로 시작한다. 충돌 뒤 '최신 내용 불러오기' 가 이 길이다.
        if (!savedRef.current || savedRef.current.updatedAt !== draft.updatedAt) {
            savedRef.current = draft
            baseRef.current = {noteId, updatedAt: draft.updatedAt}
            syncedRef.current = {noteId, title: draft.title, content: draft.content}
            if (conflictRef.current) {
                markConflict(false)
                // 충돌 때 켜 둔 경고 표시를 거둔다. 방금 불러온 내용은 서버와 같다.
                setStatusType("")
            }
            return
        }

        // 충돌을 정리하기 전에는 저장하지 않는다. 고친 내용은 화면(draft)에 그대로 남아 있다.
        if (conflictRef.current) return

        const patch = buildPatch(savedRef.current, draft)
        if (Object.keys(patch).length === 0) return

        // 본문/제목은 타이핑이 멈춘 뒤에, 설정 변경은 즉시 저장한다.
        const isTextEdit = "title" in patch || "content" in patch
        setStatusType("loading")

        pendingRef.current = {noteId, patch}
        const timer = setTimeout(() => {
            timerRef.current = null
            pendingRef.current = null
            savedRef.current = draft
            send(noteId, patch)
        }, isTextEdit ? TEXT_DEBOUNCE_MS : 0)
        timerRef.current = timer

        return () => {
            clearTimeout(timer)
            if (timerRef.current === timer) timerRef.current = null
        }
    }, [draft, enabled, noteId, setStatusType, send, markConflict])

    /*
     * 본문의 노트 링크나 사이드바로 다른 노트에 옮겨 가면 위 effect 의 정리 함수가
     * 대기 중인 타이머를 지운다. 타이핑하고 500ms 안에 떠나면 그 글자들이 사라지므로,
     * 노트가 바뀌거나 화면이 내려갈 때 남은 변경분을 그 노트 앞으로 보내고, 다음 노트는
     * 첫 스냅샷부터 다시 잡는다.
     */
    useEffect(() => {
        return () => {
            const pending = pendingRef.current
            pendingRef.current = null
            savedRef.current = null
            if (pending) send(pending.noteId, pending.patch)
            // 떠난 노트의 충돌 안내가 다음 노트에 남지 않게 한다.
            conflictRef.current = false
        }
    }, [noteId, send])

    /**
     * 기다리지 않고 지금 저장한다(⌘/Ctrl + S).
     *
     * 자동 저장이 이미 있지만, 타이핑을 멈춘 500ms 사이에 창을 닫거나 하면 불안하다.
     * "저장했다"를 사람이 직접 확인할 수 있는 길을 하나 열어둔다.
     * 충돌을 정리하기 전에는 저장하지 않는다(안내의 단추로 고른다).
     */
    const saveNow = useCallback(() => {
        if (!enabled || !draft || conflictRef.current) return false

        if (timerRef.current) {
            clearTimeout(timerRef.current)
            timerRef.current = null
        }

        const patch = buildPatch(savedRef.current ?? draft, draft)
        pendingRef.current = null
        savedRef.current = draft
        setStatusType("loading")
        send(noteId, patch)
        return true
    }, [draft, enabled, noteId, setStatusType, send])

    /** 충돌했을 때 다른 곳의 저장을 덮어쓰고 지금 화면의 내용으로 저장한다. */
    const overwrite = useCallback(() => {
        if (!enabled || !draft) return
        const patch = {...buildPatch(savedRef.current ?? draft, draft), title: draft.title, content: draft.content}
        savedRef.current = draft
        setStatusType("loading")
        send(noteId, patch, true)
    }, [draft, enabled, noteId, setStatusType, send])

    /** 합칠 때 기준본. 마지막으로 서버와 맞춰 둔 제목·본문이다. */
    const synced = useCallback(() => {
        const value = syncedRef.current
        return value?.noteId === noteId ? {title: value.title, content: value.content} : null
    }, [noteId])

    /**
     * 다른 곳의 저장(theirs, 버전 updatedAt)과 합친 결과(merged)를 받아들이고 저장한다.
     * 화면에 합친 내용을 넣는 것은 호출부가 한다. 합친 결과가 지금 화면과 같아도(내 것만 고른 경우)
     * 서버에는 아직 다른 곳 내용이 있으므로 다른 곳 내용과 견주어 바뀐 것을 보낸다.
     */
    const acceptMerged = useCallback((updatedAt: string | null,
                                      theirs: { title: string, content: string },
                                      merged: { title: string, content: string }) => {
        if (!enabled || !draft) return
        baseRef.current = {noteId, updatedAt}
        syncedRef.current = {noteId, ...theirs}
        markConflict(false)

        const patch: NotePatchData = {}
        if (merged.title !== theirs.title) patch.title = merged.title
        if (merged.content !== theirs.content) patch.content = merged.content
        savedRef.current = {...draft, title: merged.title, content: merged.content}

        if (Object.keys(patch).length === 0) {
            setStatusType("complete")
            return
        }
        setStatusType("loading")
        send(noteId, patch)
    }, [draft, enabled, noteId, setStatusType, send, markConflict])

    return {saveNow, conflict, overwrite, synced, acceptMerged}
}
