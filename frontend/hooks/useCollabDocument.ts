"use client"

import {useEffect, useState} from "react"
import {HocuspocusProvider} from "@hocuspocus/provider"
import * as Y from "yjs"

import {COLLAB_URL} from "@/constants/api"
import {apiRequest, freshAccessToken} from "@/lib/api"
import {useAuthStore} from "@/store/auth"

export type CollabStatus = "connecting" | "connected" | "disconnected" | "denied"

export type CollabUser = { name: string, color: string }

export type CollabSession = {
    doc: Y.Doc
    provider: HocuspocusProvider
    user: CollabUser
    /** 서버가 이 연결을 읽기 전용으로 붙였다(볼 수만 있는 노트, 보호 노트 등). 비회원은 아예 붙지 않는다. */
    readOnly: boolean
    status: CollabStatus
    /** 처음 문서를 받아 왔다. 그 전에는 에디터를 그리지 않는다(빈 문서 위에 쓰면 받아 온 내용과 섞인다). */
    synced: boolean
    /** 붙은 지 STALL_MS 가 지나도 문서를 받지 못했다(서버가 꺼졌거나 프록시 설정이 틀림). 그동안은 저장본을 보여 준다. */
    stalled: boolean
}

// 이만큼 기다려도 문서를 못 받으면 저장본으로 대신한다. 뒤에서는 계속 다시 붙어 보고, 붙으면 공동 편집으로 돌아온다.
const STALL_MS = 5000

// 사람마다 커서 색을 고정한다(같은 사람은 늘 같은 색). 옅은 배경 위에서도 보이는 진한 색들.
const CARET_COLORS = ["#1F6650", "#B3261E", "#8A5E06", "#2B5FA8", "#7B3FA0", "#A0422E", "#2E7D6B", "#9C2E6B"]

function colorOf(seed: string): string {
    let hash = 0
    for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0
    return CARET_COLORS[Math.abs(hash) % CARET_COLORS.length]
}

/**
 * 노트 하나의 공동 편집 연결(4.0). 문서 이름 = 노트 id.
 *
 * 연결할 때(다시 붙을 때마다) 로그인 토큰과, 비밀번호 노트를 맞혀 열었으면 그 비밀번호를 보낸다.
 * 권한은 서버가 정한다: 편집할 수 있으면 읽기·쓰기, 볼 수만 있으면 읽기 전용, 볼 수 없으면 거절.
 * COLLAB_URL 이 없거나 enabled 가 아니면 null 이고, 화면은 예전처럼(자동 저장 PATCH) 동작한다.
 */
export function useCollabDocument({noteId, enabled, password}: {
    noteId: string
    enabled: boolean
    password?: string | null
}): CollabSession | null {
    const [session, setSession] = useState<CollabSession | null>(null)
    const userHash = useAuthStore(state => state.userHash)

    useEffect(() => {
        if (!enabled || !COLLAB_URL) return

        let cancelled = false
        const doc = new Y.Doc()
        const user: CollabUser = {name: "손님", color: colorOf(userHash ?? "guest")}
        const update = (patch: Partial<CollabSession>) => {
            if (!cancelled) setSession(previous => (previous ? {...previous, ...patch} : previous))
        }

        const provider = new HocuspocusProvider({
            url: COLLAB_URL,
            name: noteId,
            document: doc,
            token: async () => JSON.stringify({jwt: await freshAccessToken(), password: password ?? null}),
            onStatus: ({status}) => update({status: status as CollabStatus}),
            onSynced: () => update({synced: true, stalled: false}),
            onAuthenticated: ({scope}) => update({readOnly: scope !== "read-write"}),
            onAuthenticationFailed: () => update({status: "denied"}),
        })

        // 바깥 연결(WebSocket)을 만들고 거두는 곳이라 effect 안에서 상태를 둔다. 렌더 중에 만들면
        // StrictMode 의 두 번 그리기마다 연결이 하나씩 더 생긴다.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSession({doc, provider, user, readOnly: true, status: "connecting", synced: false, stalled: false})
        const stallTimer = setTimeout(() => {
            if (!cancelled && !provider.isSynced) update({stalled: true})
        }, STALL_MS)

        // 커서에 붙일 이름. 로그인한 사람만 이름이 있다.
        if (userHash) {
            apiRequest.get<{ name: string }>(`/users/${userHash}`, {}, {isSilent: true})
                .then(({name}) => {
                    user.name = name
                    provider.setAwarenessField("user", user)
                })
                .catch(() => {})
        }
        provider.setAwarenessField("user", user)

        return () => {
            cancelled = true
            clearTimeout(stallTimer)
            provider.destroy()
            doc.destroy()
            setSession(null)
        }
    }, [enabled, noteId, password, userHash])

    return session
}
