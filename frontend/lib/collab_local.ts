/*
 * 이 기기에 두는 공동 편집 문서 사본(IndexedDB, 4.1 오프라인 편집).
 *
 * 연결이 끊긴 동안 고친 것을 창을 닫거나 새로고침해도 잃지 않게 두고, 다시 연결되면 서버 문서와 합친다.
 * 서버가 문서를 저장본 HTML 로 새로 만들었으면(epoch 가 다름) 내력이 달라 합치면 글이 두 번 들어가므로 버린다.
 */
import * as Y from "yjs"

const PREFIX = "notemd-note:"

export function localDbName(noteId: string): string {
    return PREFIX + noteId
}

/** 문서의 내력 id. collab 서버가 붙인다(collab/src/convert.ts). 아직 서버 문서를 받은 적 없으면 없다. */
export function epochOf(doc: Y.Doc): string | undefined {
    return doc.getMap("meta").get("epoch") as string | undefined
}

/** 로그아웃할 때 이 기기에 남은 노트 사본을 모두 지운다(공용 컴퓨터에 남지 않게). */
export async function clearLocalNotes(): Promise<void> {
    if (typeof indexedDB === "undefined" || !indexedDB.databases) return
    try {
        const databases = await indexedDB.databases()
        await Promise.all(databases
            .filter(database => database.name?.startsWith(PREFIX))
            .map(database => new Promise<void>(resolve => {
                const request = indexedDB.deleteDatabase(database.name!)
                request.onsuccess = request.onerror = request.onblocked = () => resolve()
            })))
    } catch {
        // 사본을 못 지워도 로그아웃은 이어 간다.
    }
}
