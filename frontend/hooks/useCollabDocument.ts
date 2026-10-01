"use client"

import {useEffect, useState} from "react"
import {HocuspocusProvider} from "@hocuspocus/provider"
import {clearDocument, IndexeddbPersistence} from "y-indexeddb"
import * as Y from "yjs"
import toast from "react-hot-toast"

import {COLLAB_URL} from "@/constants/api"
import {apiRequest, freshAccessToken} from "@/lib/api"
import {epochOf, localDbName} from "@/lib/collab_local"
import {useAuthStore} from "@/store/auth"

export type CollabStatus = "connecting" | "connected" | "disconnected" | "denied"

export type CollabUser = { name: string, color: string, hash?: string }

/** 이 노트를 지금 같이 연 다른 사람(같은 사람의 여러 탭은 하나로). */
export type CollabPeer = CollabUser & { key: string }

export type CollabSession = {
    /** 에디터가 붙는 문서. 서버 문서이거나, 오프라인이면 이 기기의 사본이다. */
    doc: Y.Doc
    provider: HocuspocusProvider
    user: CollabUser
    /** 서버가 이 연결을 읽기 전용으로 붙였다(볼 수만 있는 노트, 보호 노트 등). 비회원은 아예 붙지 않는다. */
    readOnly: boolean
    status: CollabStatus
    /** 에디터를 그려도 된다: 서버 문서를 받았거나, 오프라인으로 이 기기의 사본을 열었다. 그 전에 그리면 받아 온 내용과 섞인다. */
    synced: boolean
    /** 서버 문서도 이 기기의 사본도 없이 STALL_MS 가 지났다(서버가 꺼졌거나 프록시 설정이 틀림). 그동안은 저장본을 보여 준다. */
    stalled: boolean
    /** 서버에 붙지 못해 이 기기의 사본으로 고치는 중(4.1). 연결되면 서버 문서와 합친다. */
    offline: boolean
    /** 이 기기에 사본을 두는지. 암호화·비밀번호 노트는 두지 않는다. */
    persisted: boolean
    peers: CollabPeer[]
}

// 이만큼 기다려도 서버 문서를 못 받으면 이 기기의 사본(있으면)이나 저장본으로 대신한다.
// 뒤에서는 계속 다시 붙어 보고, 붙으면 합쳐서 공동 편집으로 돌아온다.
const STALL_MS = 5000

/** 서버가 '브라우저 문서가 낡았다' 며 끊을 때의 이유(collab/src/server.ts). */
const STALE_REASON = "stale-document"

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
 *
 * 오프라인(4.1, persist 일 때): 서버 문서를 이 기기(IndexedDB)에도 둔다. 연결이 끊긴 동안 고친 것도 남고,
 * 다음에 열 때 서버에 못 붙으면 그 사본으로 이어서 고친다. 서버 문서를 받으면 내력(epoch)이 같을 때만 합친다.
 * 사본은 서버 문서를 받기 전까지 따로 들고 있는다. 처음부터 한 문서에 두면 내력을 견주기 전에 서버로 가 버린다.
 */
export function useCollabDocument({noteId, enabled, password, persist}: {
    noteId: string
    enabled: boolean
    password?: string | null
    /** 이 기기에 사본을 둘지(암호화·비밀번호 노트는 false). */
    persist: boolean
}): CollabSession | null {
    const [session, setSession] = useState<CollabSession | null>(null)
    const userHash = useAuthStore(state => state.userHash)

    useEffect(() => {
        if (!enabled || !COLLAB_URL) return

        let cancelled = false
        const serverDoc = new Y.Doc()
        const user: CollabUser = {name: "손님", color: colorOf(userHash ?? "guest"), hash: userHash ?? undefined}
        const update = (patch: Partial<CollabSession>) => {
            if (!cancelled) setSession(previous => (previous ? {...previous, ...patch} : previous))
        }

        // 이 기기의 사본. 서버 문서를 받기 전까지는 따로 들고 있다가, 내력이 같으면 합친다.
        const dbName = localDbName(noteId)
        // 암호화·비밀번호를 건 노트는 이 기기에 두지 않는다. 걸기 전에 남은 사본도 지운다.
        if (!persist) void clearDocument(dbName)
        const localDoc = persist ? new Y.Doc() : null
        const localStore = localDoc ? new IndexeddbPersistence(dbName, localDoc) : null
        const localLoaded: Promise<unknown> = localStore ? localStore.whenSynced.catch(() => null) : Promise.resolve()
        let serverStore: IndexeddbPersistence | null = null
        let mode: "waiting" | "offline" | "online" = "waiting"

        /** 서버에 못 붙었지만 사본이 있으면 그것으로 고친다. */
        const goOffline = () => {
            if (cancelled || mode !== "waiting" || !localDoc || !epochOf(localDoc)) return false
            mode = "offline"
            update({doc: localDoc, offline: true, synced: true, stalled: false})
            return true
        }

        const onServerSynced = async () => {
            // 끊겼다 다시 붙음. 같은 문서라 Yjs 가 알아서 합쳤다.
            if (mode === "online") return update({synced: true})
            await localLoaded
            if (cancelled) return
            const wasOffline = mode === "offline"
            mode = "online"

            let stale = false
            if (localDoc && epochOf(localDoc)) {
                if (epochOf(localDoc) === epochOf(serverDoc)) {
                    // 이 기기에서 고치고 아직 서버에 못 간 것이 있으면 여기서 함께 올라간다(이미 있는 것은 그대로).
                    Y.applyUpdate(serverDoc, Y.encodeStateAsUpdate(localDoc))
                } else {
                    stale = true
                    if (wasOffline) toast.error("그사이 다른 곳에서 노트가 새로 저장되어, 오프라인으로 고친 내용은 합치지 못했습니다. 스냅샷을 확인해주세요.")
                }
            }
            // 이제부터는 서버 문서를 이 기기에도 둔다.
            if (localStore) {
                await localStore.destroy()
                if (stale) await clearDocument(dbName)
                if (cancelled) return
                serverStore = new IndexeddbPersistence(dbName, serverDoc)
            }
            // 오프라인 사본(localDoc)은 에디터가 서버 문서로 옮겨 그려진 뒤에 거둔다(아래 정리 함수).
            update({doc: serverDoc, offline: false, synced: true, stalled: false})
        }

        /** 다시 붙었더니 서버가 문서를 새로 만들어 두었다. 사본을 버리고 새로 받는다(합치면 글이 두 번 들어간다). */
        const resetStale = async () => {
            if (cancelled) return
            cancelled = true
            provider.destroy()
            await serverStore?.destroy()
            await clearDocument(dbName)
            window.location.reload()
        }

        const provider = new HocuspocusProvider({
            url: COLLAB_URL,
            name: noteId,
            document: serverDoc,
            // 다시 붙을 때는 들고 있는 문서의 내력을 함께 보낸다. 서버 문서와 다르면 서버가 합치지 않고 끊는다.
            token: async () => JSON.stringify({
                jwt: await freshAccessToken(), password: password ?? null, epoch: epochOf(serverDoc) ?? null,
            }),
            onStatus: ({status}) => update({status: status as CollabStatus}),
            onSynced: ({state}) => {
                if (state) void onServerSynced()
            },
            onAuthenticated: ({scope}) => update({readOnly: scope !== "read-write"}),
            onAuthenticationFailed: () => update({status: "denied"}),
            onClose: ({event}) => {
                if (event?.reason === STALE_REASON) void resetStale()
            },
        })

        // 같이 연 사람들. 커서가 움직일 때마다 바뀌므로, 사람 목록이 달라졌을 때만 화면을 고친다.
        const awareness = provider.awareness
        let peersKey = ""
        const refreshPeers = () => {
            if (!awareness) return
            const peers = new Map<string, CollabPeer>()
            awareness.getStates().forEach((state, clientId) => {
                const peer = state.user as CollabUser | undefined
                if (clientId === awareness.clientID || !peer?.name) return
                // 내 다른 탭은 빼고, 같은 사람의 여러 탭은 하나로.
                if (peer.hash && peer.hash === user.hash) return
                const key = peer.hash ?? String(clientId)
                if (!peers.has(key)) peers.set(key, {...peer, key})
            })
            const list = [...peers.values()].sort((a, b) => a.name.localeCompare(b.name))
            const nextKey = list.map(peer => `${peer.key}:${peer.name}:${peer.color}`).join("|")
            if (nextKey === peersKey) return
            peersKey = nextKey
            update({peers: list})
        }
        awareness?.on("change", refreshPeers)

        // 바깥 연결(WebSocket)을 만들고 거두는 곳이라 effect 안에서 상태를 둔다. 렌더 중에 만들면
        // StrictMode 의 두 번 그리기마다 연결이 하나씩 더 생긴다.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSession({
            doc: serverDoc, provider, user, readOnly: true, status: "connecting",
            synced: false, stalled: false, offline: false, persisted: persist, peers: [],
        })
        const stallTimer = setTimeout(() => {
            if (cancelled || mode !== "waiting") return
            void localLoaded.then(() => {
                if (!goOffline() && !cancelled && mode === "waiting") update({stalled: true})
            })
        }, STALL_MS)

        // 커서와 '같이 보는 사람' 에 붙일 이름. 로그인한 사람만 이름이 있다.
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
            awareness?.off("change", refreshPeers)
            provider.destroy()
            void serverStore?.destroy()
            void localStore?.destroy()
            serverDoc.destroy()
            localDoc?.destroy()
            setSession(null)
        }
    }, [enabled, noteId, password, userHash, persist])

    return session
}
