import type {DragEvent} from "react"

/** 노트·폴더 드래그에 함께 쓰는 커스텀 MIME. 다른 곳에서 온 드롭과 섞이지 않게 한다. */
export const NOTE_DRAG_TYPE = "application/x-notemd"

export type DragPayload = { kind: "note" | "folder", id: string }

export function readDragPayload(event: DragEvent): DragPayload | null {
    try {
        return JSON.parse(event.dataTransfer.getData(NOTE_DRAG_TYPE)) as DragPayload
    } catch {
        return null
    }
}

/**
 * 끌고 다니는 동안 커서를 따라올 작은 라벨.
 *
 * 기본 드래그 이미지는 끌기 시작한 요소를 그대로 찍어서, 노트 카드처럼 큰 요소를
 * 잡으면 사이드바의 폴더가 가려 어디에 놓는지 안 보인다. 커서보다 조금 큰 칩으로 바꾼다.
 */
function buildDragGhost(label: string): HTMLElement {
    const ghost = document.createElement("div")
    ghost.textContent = label

    Object.assign(ghost.style, {
        position: "fixed",
        // 화면 밖에 두되 렌더는 되어야 setDragImage 가 찍을 수 있다.
        top: "-1000px",
        left: "0",
        maxWidth: "180px",
        height: "26px",
        padding: "0 10px",
        display: "flex",
        alignItems: "center",
        borderRadius: "7px",
        background: "var(--surface)",
        color: "var(--foreground)",
        border: "1px solid var(--accent)",
        boxShadow: "0 4px 12px -4px rgba(0, 0, 0, 0.25)",
        font: "600 12px/1 var(--font-sans), -apple-system, sans-serif",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        pointerEvents: "none",
    })

    document.body.appendChild(ghost)
    // 드래그가 시작되고 나면 원본은 필요 없다. 다음 틱에 치운다.
    setTimeout(() => ghost.remove(), 0)
    return ghost
}

function startDrag(event: DragEvent, payload: DragPayload, label: string) {
    event.dataTransfer.setData(NOTE_DRAG_TYPE, JSON.stringify(payload))
    event.dataTransfer.effectAllowed = "move"
    // 커서가 칩의 왼쪽 위 근처에 오도록. 칩이 커서를 가리지 않는다.
    event.dataTransfer.setDragImage(buildDragGhost(label), 10, 13)
}

export function startNoteDrag(event: DragEvent, noteId: string, title: string) {
    startDrag(event, {kind: "note", id: noteId}, title.trim() || "제목 없음")
}

export function startFolderDrag(event: DragEvent, folderId: string, name: string) {
    startDrag(event, {kind: "folder", id: folderId}, name)
}
