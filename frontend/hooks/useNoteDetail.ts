"use client"

import {SetStateAction, useCallback, useEffect, useMemo, useState} from "react";
import {ApiError, apiRequest} from "@/lib/api";
import {useAuthStore} from "@/store/auth";
import {NoteDetailResponse} from "@/types/note";
import {NoteWorkspace} from "@/types/workspace";
import Cookies from "js-cookie";

/** 화면이 편집하는 노트 상태. 서버 응답(snake_case)과 분리해서 관리한다. */
export type NoteDraft = {
    title: string
    content: string
    isPublic: boolean
    isProtected: boolean
    isEncrypted: boolean
    password: string | null
    tags: string[]
    workspaces: NoteWorkspace[]
}

export type NoteLoadState =
    | { status: "loading" }
    | { status: "password" }
    | { status: "ready" }
    | { status: "error", statusCode: number }

const toDraft = (response: NoteDetailResponse): NoteDraft => ({
    title: response.title ?? "",
    content: response.content ?? "",
    isPublic: response.is_public,
    isProtected: response.is_protected,
    isEncrypted: response.is_encrypted,
    password: response.password || "",
    tags: response.tags,
    workspaces: response.workspaces,
})

/** 비밀번호 보호 노트인지 확인 */
const isPasswordRequired = (error: unknown): boolean =>
    error instanceof ApiError && Boolean(error.detail?.is_password)

const getStatusCode = (error: unknown): number =>
    error instanceof ApiError ? error.status : 500

export function useNoteDetail(noteId: string) {
    const {userHash} = useAuthStore.getState()

    const [state, setState] = useState<NoteLoadState>({status: "loading"})
    const [draft, setDraft] = useState<NoteDraft | null>(null)
    const [isOwner, setIsOwner] = useState(false)
    const [isEditable, setIsEditable] = useState(false)

    // 최초 조회와 비밀번호 해제 응답을 동일하게 처리한다(기존 중복 로직 통합).
    const applyNote = useCallback((response: NoteDetailResponse) => {
        setDraft(toDraft(response))
        setIsOwner(response.user_hash === userHash)
        setIsEditable(response.is_editable)
        setState({status: "ready"})
    }, [userHash])

    useEffect(() => {
        let aborted = false

        const load = async () => {
            try {
                const response = await apiRequest.get<NoteDetailResponse>(`/notes/${noteId}`)
                if (Cookies.get('is_first_edit') === undefined) {
                    Cookies.set('is_first_edit', '1')
                }
                if (!aborted) applyNote(response)
            } catch (error) {
                if (aborted) return
                if (isPasswordRequired(error)) {
                    setState({status: "password"})
                    return
                }
                setState({status: "error", statusCode: getStatusCode(error)})
            }
        }

        void load()
        return () => {
            aborted = true
        }
    }, [noteId, applyNote])

    const unlock = useCallback(async (password: string) => {
        const response = await apiRequest.post<NoteDetailResponse>(`/notes/${noteId}`, {
            body: JSON.stringify({password}),
        })
        applyNote(response)
    }, [noteId, applyNote])

    // 필드별 setState 팩토리. NoteSettings/MarkdownEditor가 기대하는
    // Dispatch<SetStateAction<T>> 시그니처를 그대로 유지한다.
    const makeSetter = useCallback(<K extends keyof NoteDraft>(key: K) =>
        (value: SetStateAction<NoteDraft[K]>) => {
            setDraft(prev => {
                if (!prev) return prev
                const next = typeof value === "function"
                    ? (value as (prevValue: NoteDraft[K]) => NoteDraft[K])(prev[key])
                    : value
                return Object.is(prev[key], next) ? prev : {...prev, [key]: next}
            })
        }, [])

    const setters = useMemo(() => ({
        setTitle: makeSetter("title"),
        setContent: makeSetter("content"),
        setIsPublic: makeSetter("isPublic"),
        setIsProtected: makeSetter("isProtected"),
        setIsEncrypted: makeSetter("isEncrypted"),
        setNotePassword: makeSetter("password"),
        setSelectedTags: makeSetter("tags"),
        setSelectedWorkspaces: makeSetter("workspaces"),
    }), [makeSetter])

    return {state, draft, isOwner, isEditable, setters, unlock}
}