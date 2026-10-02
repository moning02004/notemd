import type {KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent} from "react"

/*
 * 콜렉션 칸 사이를 키보드로 옮겨 다니기와 마우스로 여러 칸 고르기.
 *
 * 칸은 data-cell 과 화면 순서(data-r 행, data-c 열)를 단다. 칸 안에 입력칸·체크박스·꼬리표 자리가 있으면
 * 그것에, 없으면(수식·ID·진행도) 칸 자체(tabIndex -1)에 포커스를 둔다.
 */

/** 칸 안에서 포커스를 받는 것 */
const FIELD = "textarea, input, .collection-tags"

export type CellPoint = { r: number, c: number }
export type CellRange = { top: number, left: number, bottom: number, right: number }

export const rangeOf = (a: CellPoint, b: CellPoint): CellRange => ({
    top: Math.min(a.r, b.r), bottom: Math.max(a.r, b.r), left: Math.min(a.c, b.c), right: Math.max(a.c, b.c),
})

export const inRange = (range: CellRange | null, r: number, c: number) =>
    range !== null && r >= range.top && r <= range.bottom && c >= range.left && c <= range.right

export function pointOf(element: Element | null): CellPoint | null {
    const cell = element?.closest<HTMLElement>("[data-cell]")
    if (!cell) return null
    return {r: Number(cell.dataset.r), c: Number(cell.dataset.c)}
}

export const cellAt = (grid: HTMLElement, point: CellPoint) =>
    grid.querySelector<HTMLElement>(`[data-cell][data-r="${point.r}"][data-c="${point.c}"]`)

/** 글을 치는 입력칸(커서가 있는 것)인지. 날짜 칸은 화살표가 날짜를 고치므로 뺀다. */
function textField(element: Element | null): HTMLInputElement | HTMLTextAreaElement | null {
    if (element instanceof HTMLTextAreaElement) return element
    if (element instanceof HTMLInputElement && element.type === "text") return element
    return null
}

/** 칸으로 옮겨 간다. 글 칸은 들어온 쪽에 커서를 둔다(왼쪽에서 오면 처음, 그 밖에는 끝). */
export function focusCellAt(grid: HTMLElement, point: CellPoint, caret: "start" | "end" = "end"): boolean {
    const cell = cellAt(grid, point)
    if (!cell) return false
    const field = cell.querySelector<HTMLElement>(FIELD) ?? cell
    field.focus()
    const text = textField(field)
    if (text) {
        const at = caret === "start" ? 0 : text.value.length
        text.setSelectionRange(at, at)
    }
    return true
}

/** 키를 눌렀을 때 갈 곳. null 이면 칸 안에서 원래 하던 대로(커서 옮기기 등). */
export type Move = CellPoint | "title" | "after" | "stay"

/**
 * 화살표·Enter 로 갈 곳을 정한다.
 * - 글 칸에서는 커서가 끝에 닿았을 때만 옆 칸으로(←는 맨 앞, →는 맨 뒤, ↑는 첫 줄, ↓는 마지막 줄).
 * - 맨 윗행에서 ↑ 는 제목으로, 맨 아랫행에서 ↓ 는 콜렉션 밖(아래 글)으로.
 * - Enter 는 한 칸 아래로. 아래 칸이 없으면 그 자리에 머문다(적기만 한다). 글 칸의 Shift+Enter 는 줄바꿈.
 */
export function moveFor(event: ReactKeyboardEvent, point: CellPoint, rowCount: number, columnCount: number): {
    move: Move, caret: "start" | "end"
} | null {
    const target = event.target as HTMLElement
    const text = textField(target)
    const date = target instanceof HTMLInputElement && target.type === "date"
    const value = text?.value ?? ""
    const start = text?.selectionStart ?? 0
    const end = text?.selectionEnd ?? 0
    const collapsed = start === end
    const {r, c} = point

    switch (event.key) {
        case "ArrowLeft":
            if (date || (text && !(collapsed && start === 0))) return null
            return c > 0 ? {move: {r, c: c - 1}, caret: "end"} : null
        case "ArrowRight":
            if (date || (text && !(collapsed && end === value.length))) return null
            return c < columnCount - 1 ? {move: {r, c: c + 1}, caret: "start"} : null
        case "ArrowUp":
            if (date || (text && !(collapsed && !value.slice(0, start).includes("\n")))) return null
            return {move: r === 0 ? "title" : {r: r - 1, c}, caret: "end"}
        case "ArrowDown":
            if (date || (text && !(collapsed && !value.slice(end).includes("\n")))) return null
            return {move: r === rowCount - 1 ? "after" : {r: r + 1, c}, caret: "end"}
        case "Enter":
            if (event.shiftKey && target instanceof HTMLTextAreaElement) return null
            return {move: r < rowCount - 1 ? {r: r + 1, c} : "stay", caret: "end"}
        default:
            return null
    }
}

/** 칸을 고르며 생기는 click 이 그 칸(선택 칸이면 고르는 창)을 열지 않게 한 번 삼킨다. */
export function swallowNextClick() {
    const swallow = (click: MouseEvent) => {
        click.stopPropagation()
        click.preventDefault()
    }
    window.addEventListener("click", swallow, {capture: true, once: true})
    // 누른 채 밖으로 나가 click 이 생기지 않으면 다음 누름까지 남지 않게 걷는다.
    window.addEventListener("pointerdown", () => window.removeEventListener("click", swallow, {capture: true}),
        {capture: true, once: true})
}

/**
 * 칸을 누른 채 다른 칸으로 끌면 여러 칸을 고른다. 한 칸 안에서 끄는 것은 글자 고르기로 그대로 둔다.
 * 고르기가 시작되면 입력칸에서 빠져(적고) 글자 고르기를 막는다.
 */
export function startCellSelect({event, grid, onRange, onEnd}: {
    event: ReactPointerEvent<HTMLElement>
    grid: HTMLElement
    onRange: (range: CellRange) => void
    onEnd: () => void
}) {
    const start = pointOf(event.target as Element)
    if (!start || event.button !== 0) return
    let selecting = false
    let last = ""

    const move = (pointer: PointerEvent) => {
        const over = document.elementFromPoint(pointer.clientX, pointer.clientY)
        if (!over || !grid.contains(over)) return
        const point = pointOf(over)
        if (!point) return
        if (!selecting) {
            if (point.r === start.r && point.c === start.c) return
            selecting = true
            ;(document.activeElement as HTMLElement | null)?.blur()
            document.body.classList.add("collection-selecting")
        }
        window.getSelection()?.removeAllRanges()
        const key = `${point.r}:${point.c}`
        if (key === last) return
        last = key
        onRange(rangeOf(start, point))
    }

    const up = () => {
        window.removeEventListener("pointermove", move)
        window.removeEventListener("pointerup", up)
        window.removeEventListener("pointercancel", up)
        if (!selecting) return
        document.body.classList.remove("collection-selecting")
        swallowNextClick()
        onEnd()
    }

    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", up)
}
