/*
 * 두 연결로 같은 노트를 동시에 고쳐 보는 확인(개발용).
 *   npx tsx src/e2e.ts <노트 id> <로그인 토큰> [다른 사람 토큰]
 */
import {HocuspocusProvider, HocuspocusProviderWebsocket} from "@hocuspocus/provider"
import WebSocket from "ws"
import * as Y from "yjs"

const [note, jwtA, jwtB] = process.argv.slice(2)
const URL = process.env.COLLAB_URL ?? "ws://localhost:1234"

function connect(jwt: string | null, name: string) {
    const doc = new Y.Doc()
    const socket = new HocuspocusProviderWebsocket({url: URL, WebSocketPolyfill: WebSocket as never})
    const provider = new HocuspocusProvider({
        websocketProvider: socket, name: note, document: doc,
        token: JSON.stringify({jwt}),
        onAuthenticationFailed: ({reason}) => console.log(`${name}: 인증 실패 ${reason}`),
    })
    // 소켓을 따로 만들어 넘긴 provider 는 직접 붙여야 한다.
    provider.attach()
    const synced = new Promise<void>(resolve => provider.on("synced", () => resolve()))
    return {doc, provider, socket, synced}
}

const text = (doc: Y.Doc) => doc.getXmlFragment("default").toString().replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()

const a = connect(jwtA, "A")
const b = connect(jwtB ?? jwtA, "B")
await Promise.all([a.synced, b.synced])
console.log("둘 다 연결됨. 처음 본문:", text(a.doc).slice(0, 60))

// A 와 B 가 거의 동시에 서로 다른 줄을 덧붙인다.
const para = (s: string) => { const p = new Y.XmlElement("paragraph"); p.insert(0, [new Y.XmlText(s)]); return p }
a.doc.transact(() => a.doc.getXmlFragment("default").push([para("A 가 쓴 줄")]))
b.doc.transact(() => b.doc.getXmlFragment("default").push([para("B 가 쓴 줄")]))
await new Promise(r => setTimeout(r, 800))
console.log("A 가 보는 본문:", text(a.doc).slice(-40))
console.log("B 가 보는 본문:", text(b.doc).slice(-40))
console.log("같은가:", text(a.doc) === text(b.doc))

// 저장(2초 디바운스)을 기다렸다 끊는다.
await new Promise(r => setTimeout(r, 3500))
a.provider.destroy(); b.provider.destroy(); a.socket.destroy(); b.socket.destroy()
process.exit(0)
