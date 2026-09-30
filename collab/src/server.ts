/*
 * note.md 공동 편집 서버(Hocuspocus).
 *
 * 문서를 메모리에 들고 편집(Yjs)을 연결된 모두에게 나눠 줄 뿐이다. 권한 판단과 영구 저장은 백엔드(FastAPI)의
 * 내부 API 가 한다(/internal/collab/*, 공유 비밀 X-Collab-Secret). 이 서버는 DB 도 암호화 키도 모른다.
 *
 * 문서 이름 = 노트 id. 연결할 때 브라우저는 토큰으로 JSON 문자열을 보낸다:
 *   {"jwt": "<로그인 토큰 또는 null>", "password": "<비밀번호 노트를 맞혀 열었을 때>"}
 */
import {Server} from "@hocuspocus/server"
import * as Y from "yjs"
import {bodyHtml, fillFromHtml, titleOf} from "./convert"

const BACKEND_URL = process.env.BACKEND_URL ?? "http://backend:8000"
const COLLAB_SECRET = process.env.COLLAB_SECRET ?? ""
const PORT = Number(process.env.PORT ?? 1234)

if (!COLLAB_SECRET) {
    console.error("COLLAB_SECRET 이 필요합니다(백엔드와 같은 값).")
    process.exit(1)
}

type Context = {
    userId: string | null
    userName: string
    access: "edit" | "read"
}

async function backend(path: string, init: RequestInit = {}): Promise<Response> {
    return fetch(`${BACKEND_URL}/internal/collab${path}`, {
        ...init,
        headers: {"Content-Type": "application/json", "X-Collab-Secret": COLLAB_SECRET, ...init.headers},
    })
}

function parseToken(token: string): { jwt?: string | null, password?: string | null } {
    try {
        return JSON.parse(token || "{}")
    } catch {
        return {}
    }
}

const server = new Server<Context>({
    name: "notemd-collab",
    port: PORT,
    // 편집이 멈추고 2초 뒤에 저장하되, 계속 쓰고 있어도 10초에 한 번은 저장한다.
    debounce: 2000,
    maxDebounce: 10000,

    /** 이 연결이 노트를 편집할 수 있는지, 볼 수만 있는지 백엔드에 묻는다. 볼 수 없으면 연결을 거절한다. */
    async onAuthenticate({token, documentName, connectionConfig}) {
        const {jwt, password} = parseToken(token)
        const response = await backend("/authorize", {
            method: "POST",
            body: JSON.stringify({note: documentName, token: jwt ?? null, password: password ?? null}),
        })
        if (!response.ok) throw new Error(`이 노트에 연결할 수 없습니다(${response.status}).`)

        const auth = await response.json() as { access: "edit" | "read", user_id: string | null, user_name: string }
        connectionConfig.readOnly = auth.access !== "edit"
        return {userId: auth.user_id, userName: auth.user_name, access: auth.access}
    },

    /** 저장된 Y 문서를 불러온다. 처음 여는 노트는 저장된 HTML·제목으로 만든다(일괄 마이그레이션 없음). */
    async onLoadDocument({documentName, document}) {
        const response = await backend(`/notes/${encodeURIComponent(documentName)}/state`)
        if (!response.ok) throw new Error(`노트를 불러오지 못했습니다(${response.status}).`)

        const state = await response.json() as { ydoc: string | null, html: string, title: string }
        if (state.ydoc) Y.applyUpdate(document, Buffer.from(state.ydoc, "base64"))
        else fillFromHtml(document, state.html, state.title)
        return document
    },

    /** Y 문서와, 그것으로 만든 HTML 사본·제목을 백엔드에 저장한다(검색·내보내기·API 는 HTML 을 읽는다). */
    async onStoreDocument({documentName, document}) {
        const response = await backend(`/notes/${encodeURIComponent(documentName)}/state`, {
            method: "PUT",
            body: JSON.stringify({
                ydoc: Buffer.from(Y.encodeStateAsUpdate(document)).toString("base64"),
                html: bodyHtml(document),
                title: titleOf(document),
            }),
        })
        // 409: 그사이 휴지통으로 옮겨졌다. 저장하지 않는 것이 맞다.
        if (!response.ok && response.status !== 409) {
            throw new Error(`노트를 저장하지 못했습니다(${response.status}).`)
        }
    },
})

await server.listen()
console.log(`notemd-collab: ws://0.0.0.0:${PORT} (백엔드 ${BACKEND_URL})`)
