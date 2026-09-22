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

function line(text: string, styles: Partial<CSSStyleDeclaration>): HTMLElement {
    const el = document.createElement("div")
    el.textContent = text
    Object.assign(el.style, {
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
    }, styles)
    return el
}

/**
 * 끌고 다니는 동안 커서를 따라올 작은 노트.
 *
 * 기본 드래그 이미지는 끌기 시작한 요소를 그대로 찍어서, 노트 카드처럼 큰 요소를
 * 잡으면 사이드바의 폴더가 가려 어디에 놓는지 안 보인다. 그렇다고 글자만 남기면
 * 알약처럼 보여 무엇을 들고 있는지 알기 어렵다. 카드 모양은 유지한 채 줄인다.
 */
function buildDragGhost(title: string, excerpt?: string): HTMLElement {
    const ghost = document.createElement("div")

    Object.assign(ghost.style, {
        position: "fixed",
        // 화면 밖에 두되 렌더는 되어야 setDragImage 가 찍을 수 있다.
        top: "-1000px",
        left: "0",
        boxSizing: "border-box",
        width: "150px",
        padding: "7px 9px",
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        borderRadius: "8px",
        background: "var(--surface)",
        border: "1px solid var(--border-strong)",
        boxShadow: "0 6px 16px -8px rgba(0, 0, 0, 0.35)",
        fontFamily: "var(--font-sans), -apple-system, sans-serif",
        pointerEvents: "none",
    })

    ghost.appendChild(line(title, {
        fontSize: "12px",
        fontWeight: "500",
        lineHeight: "1.35",
        color: "var(--foreground)",
    }))
    if (excerpt) {
        ghost.appendChild(line(excerpt, {
            fontSize: "11px",
            lineHeight: "1.35",
            color: "var(--subtle)",
        }))
    }

    document.body.appendChild(ghost)
    // 드래그가 시작되고 나면 원본은 필요 없다. 다음 틱에 치운다.
    setTimeout(() => ghost.remove(), 0)
    return ghost
}

function startDrag(event: DragEvent, payload: DragPayload, title: string, excerpt?: string) {
    event.dataTransfer.setData(NOTE_DRAG_TYPE, JSON.stringify(payload))
    event.dataTransfer.effectAllowed = "move"
    // 커서가 카드 왼쪽 위 안쪽에 오도록. 집어 든 자리처럼 보인다.
    event.dataTransfer.setDragImage(buildDragGhost(title, excerpt), 12, 14)
}

export function startNoteDrag(event: DragEvent, noteId: string, title: string, excerpt?: string) {
    startDrag(event, {kind: "note", id: noteId}, title.trim() || "제목 없음", excerpt?.trim() || undefined)
}

export function startFolderDrag(event: DragEvent, folderId: string, name: string) {
    startDrag(event, {kind: "folder", id: folderId}, name)
}
