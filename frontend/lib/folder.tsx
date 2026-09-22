import toast from "react-hot-toast"
import {apiRequest} from "@/lib/api"
import {NoteCard} from "@/types/note"

type MoveArgs = {
    noteHashes: string[]
    folder: string | null
    folderName: string
    /** 되돌릴 때 필요한 이동 전 위치. 노트 목록에서 그대로 읽어 넘긴다. */
    notes: NoteCard[]
    /**
     * 캐시 무효화. 이 헬퍼는 훅 밖(실행 취소 토스트 안)에서도 요청을 보내야 해서
     * mutation 대신 apiRequest 를 직접 쓴다. 그래서 갱신을 호출부가 넘겨줘야 한다.
     */
    invalidate: () => void
    onDone?: () => void
}

async function sendMove(noteHashes: string[], folder: string | null) {
    return apiRequest.patch<string[]>("/folders/notes", {
        body: JSON.stringify({note_hashes: noteHashes, folder}),
    })
}

/**
 * 노트를 옮기고 실행 취소가 달린 토스트를 띄운다.
 *
 * 정리는 연속 동작이라 한 번은 반드시 잘못 놓는다. 되돌릴 수 있다는 걸 알면
 * 망설임이 줄어 정리 속도가 올라간다.
 */
export async function moveNotesWithUndo({noteHashes, folder, folderName, notes, invalidate, onDone}: MoveArgs) {
    // 이동 전 위치를 노트별로 기록해 둔다. 검색 결과처럼 출처가 섞여 있어도 각자 제자리로 돌아간다.
    const previous = new Map<string | null, string[]>()
    noteHashes.forEach(hash => {
        const note = notes.find(n => n.hash_id === hash)
        const from = note?.folder?.hashId ?? null
        previous.set(from, [...(previous.get(from) ?? []), hash])
    })

    await sendMove(noteHashes, folder)
    invalidate()
    onDone?.()

    const label = noteHashes.length === 1 ? "노트를" : `노트 ${noteHashes.length}개를`

    toast.custom(t => (
        <div className="flex items-center gap-3 bg-foreground text-background text-sm px-4 py-3 rounded-lg shadow-lg">
            <span>{label} <b className="font-semibold">{folderName}</b>(으)로 옮겼습니다.</span>
            <button
                className="text-accent-soft font-semibold cursor-pointer whitespace-nowrap"
                onClick={async () => {
                    toast.dismiss(t.id)
                    for (const [from, hashes] of previous) {
                        await sendMove(hashes, from)
                    }
                    invalidate()
                    onDone?.()
                }}
            >
                실행 취소
            </button>
        </div>
    ), {duration: 6000})
}
