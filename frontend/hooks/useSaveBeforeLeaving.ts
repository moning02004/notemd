import {useCallback, useEffect, useRef} from "react"
import type * as Y from "yjs"
import {flushNote, markNoteLeft} from "@/lib/note"

/**
 * 공동 편집 서버는 마지막 편집 2초 뒤에 저장한다(collab 의 debounce). 여유를 조금 더해,
 * 이 시간 안에 고친 것이 있을 때만 '아직 저장되지 않았을 수 있다' 고 본다.
 */
const SAVE_LAG_MS = 3000

/**
 * 노트를 쓰고 곧바로 나갈 때, 목록이 저장되기 전의 본문을 읽지 않게 한다.
 *
 * 저장을 당기는 요청은 필요할 때만 보낸다. 열어 보기만 했거나, 고친 뒤 몇 초가 지나 이미 저장된 노트에서는
 * 아무것도 하지 않는다. 방금 고친 채로 나갈 때만:
 *   - 제목 옆 뒤로가기: 돌려주는 함수를 불러 저장시킨 뒤 나간다. 목록은 처음부터 맞는 내용을 읽는다.
 *   - 브라우저의 뒤로 가기: 그럴 틈이 없으니 떠난 노트를 적어 두고, 목록이 저장을 당긴 뒤 한 번 더 읽는다.
 * 둘이 겹쳐 두 번 하지 않는다.
 */
export function useSaveBeforeLeaving(noteId: string, doc: Y.Doc | null) {
    const lastEditAt = useRef(0)

    useEffect(() => {
        if (!doc) return
        // 이 문서에서 직접 고친 것만 센다. 같이 보는 사람의 편집은 그쪽이 연결돼 있는 동안 서버가 저장한다.
        const onUpdate = (_update: Uint8Array, _origin: unknown, _doc: Y.Doc, transaction: Y.Transaction) => {
            if (transaction.local) lastEditAt.current = Date.now()
        }
        doc.on("update", onUpdate)
        return () => {
            doc.off("update", onUpdate)
            if (Date.now() - lastEditAt.current < SAVE_LAG_MS) markNoteLeft(noteId)
            lastEditAt.current = 0
        }
    }, [doc, noteId])

    return useCallback(async () => {
        if (Date.now() - lastEditAt.current >= SAVE_LAG_MS) return
        await flushNote(noteId)
        // 저장시켰으니 떠날 때 적어 둘 것이 없다(목록이 또 당기지 않게).
        lastEditAt.current = 0
    }, [noteId])
}
