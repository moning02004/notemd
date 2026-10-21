import type {DragEvent} from "react"

const GHOST_LINES = 4

/**
 * 코드 블록을 끄는 동안 커서를 따라올 작은 코드 블록(노트를 폴더로 끌 때의 카드와 같은 생각, lib/note_drag.ts).
 *
 * tiptap 은 블록을 복제해 에디터 바깥(body)에 두고 찍는데, 그 자리에는 .ProseMirror pre 규칙이 닿지 않아
 * 어두운 바탕 없이 글자만 떠다녔다. 그렇다고 블록을 그대로 찍으면 긴 코드는 화면을 가린다.
 * 위 막대(언어)와 앞 몇 줄만 담은 작은 블록을 그려 쓴다.
 */
function buildCodeGhost(language: string, code: string): HTMLElement {
    // pre 로 만들어야 고정폭 글꼴이 든다. body * 의 본문 글꼴이 !important 라 인라인 글꼴을 덮는다(globals.css).
    const ghost = document.createElement("pre")
    Object.assign(ghost.style, {
        margin: "0",
        position: "fixed",
        // 화면 밖에 두되 렌더는 되어야 setDragImage 가 찍을 수 있다.
        top: "-1000px",
        left: "0",
        boxSizing: "border-box",
        width: "240px",
        borderRadius: "8px",
        overflow: "hidden",
        background: "var(--foreground)",
        color: "var(--surface)",
        boxShadow: "0 8px 20px -8px rgba(0, 0, 0, 0.45)",
        pointerEvents: "none",
    })

    const header = document.createElement("div")
    header.textContent = language
    Object.assign(header.style, {
        padding: "5px 10px",
        fontSize: "10px",
        fontWeight: "700",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        background: "rgba(255, 255, 255, 0.08)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
    })
    ghost.appendChild(header)

    const lines = code.split("\n")
    const shown = lines.slice(0, GHOST_LINES)
    if (lines.length > GHOST_LINES) shown.push("…")
    const body = document.createElement("div")
    Object.assign(body.style, {padding: "7px 10px 8px"})
    for (const text of shown) {
        const line = document.createElement("div")
        // 빈 줄도 한 줄 높이를 차지하게.
        line.textContent = text || " "
        Object.assign(line.style, {
            fontSize: "11px",
            lineHeight: "1.45",
            whiteSpace: "pre",
            overflow: "hidden",
            textOverflow: "ellipsis",
        })
        body.appendChild(line)
    }
    ghost.appendChild(body)

    document.body.appendChild(ghost)
    // 드래그가 시작되고 나면 원본은 필요 없다. 다음 틱에 치운다.
    setTimeout(() => ghost.remove(), 0)
    return ghost
}

/** tiptap 이 정한 드래그 그림을 작은 코드 블록으로 바꾼다. tiptap 의 onDragStart 뒤에 부른다. */
export function setCodeDragImage(event: DragEvent, language: string, code: string) {
    // 커서가 위 막대 왼쪽 안쪽에 오도록. 막대를 집어 든 것처럼 보인다.
    event.dataTransfer?.setDragImage(buildCodeGhost(language, code), 16, 10)
}
