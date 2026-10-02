import type {KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent} from "react"

/*
 * 콜렉션 칸 사이를 키보드로 옮겨 다니기와 마우스로 여러 칸 고르기.
 *
 * 칸은 data-cell 과 화면 순서(data-r 행, data-c 열)를 단다. 칸 안에 입력칸·체크박스·꼬리표 자리가 있으면
 * 그것에, 없으면(수식·ID·진행도) 칸 자체(tabIndex -1)에 포커스를 둔다.
 */

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

/** 칸에서 글을 치는 입력칸(체크박스·꼬리표 자리는 아니다) */
const INPUT = "textarea, input:not([type=checkbox])"

export const inputOf = (cell: HTMLElement) => cell.querySelector<HTMLInputElement | HTMLTextAreaElement>(INPUT)

/*
 * 칸을 고른 상태는 두 가지로 둔다.
 * - 글 칸(텍스트·숫자·링크): 입력칸에 포커스를 두되 칸에 data-selecting 을 단다(커서를 감춘다). 한글 조합을 포함해
 *   치는 글자가 바로 입력칸에 들어가야 해서다. 칸(div)에 포커스가 있으면 입력기가 조합을 시작하지 않는다.
 *   글자가 들어오면(input) 입력 상태로 바뀐다.
 * - 그 밖의 칸(선택·체크·진행도·날짜·수식·ID): 칸 자체(tabIndex -1)에 포커스.
 */
export const isSelecting = (cell: HTMLElement) => cell.hasAttribute("data-selecting")

export function markSelecting(cell: HTMLElement, selecting: boolean) {
    if (selecting) cell.setAttribute("data-selecting", "")
    else cell.removeAttribute("data-selecting")
}

/** 칸을 고른 상태로. 글 칸은 입력칸에 커서를 끝에 두고 고른 표시를 단다. */
export function selectCell(cell: HTMLElement) {
    const input = inputOf(cell)
    const text = input ? textField(input) : null
    if (!text) {
        cell.focus()
        return
    }
    markSelecting(cell, true)
    if (document.activeElement !== text) text.focus()
    text.setSelectionRange(text.value.length, text.value.length)
}

/** 칸에 입력을 시작한다. 입력칸이 없는 칸은 고르기만 한다. */
export function editCell(cell: HTMLElement, caret: "start" | "end" = "end") {
    const input = inputOf(cell)
    if (!input) {
        cell.focus()
        return
    }
    markSelecting(cell, false)
    if (document.activeElement !== input) input.focus()
    const text = textField(input)
    if (text) {
        const at = caret === "start" ? 0 : text.value.length
        text.setSelectionRange(at, at)
    }
}

export function focusCellAt(grid: HTMLElement, point: CellPoint, mode: "select" | "edit",
                            caret: "start" | "end" = "end"): boolean {
    const cell = cellAt(grid, point)
    if (!cell) return false
    if (mode === "select") selectCell(cell)
    else editCell(cell, caret)
    return true
}

/**
 * 키를 눌렀을 때 할 일. null 이면 칸 안에서 원래 하던 대로(커서 옮기기 등).
 * - go: 다른 칸(또는 제목·콜렉션 밖)으로. mode 는 도착한 칸의 상태.
 * - edit: 고른 칸에 입력을 시작한다. stay: 입력을 마치고 그 칸을 고른 상태로.
 */
export type Action =
    | { kind: "go", to: CellPoint | "title" | "after", mode: "select" | "edit", caret: "start" | "end" }
    | { kind: "edit" }
    | { kind: "stay" }

/**
 * 칸을 고른 상태(칸 자체에 포커스)와 입력하는 상태(입력칸에 포커스)를 나눈다(스프레드시트처럼).
 *
 * 고른 상태: 화살표는 늘 칸을 옮긴다. Enter 는 입력을 시작한다.
 * 입력 상태: 화살표는 커서가 끝에 닿았을 때만 옆 칸을 고른다(← 맨 앞, → 맨 뒤, ↑ 첫 줄, ↓ 마지막 줄).
 *           Enter 는 적고 아래 칸에 바로 입력한다. 아래 칸이 없으면 적고 고른 상태로 돌아온다. 글 칸의 Shift+Enter 는 줄바꿈.
 * 어느 쪽이든 맨 윗행의 ↑ 는 제목으로, 맨 아랫행의 ↓ 는 콜렉션 밖(아래 글)으로.
 */
export function actionFor(event: ReactKeyboardEvent, cell: HTMLElement, point: CellPoint,
                          rowCount: number, columnCount: number): Action | null {
    const target = event.target as HTMLElement
    const editing = target !== cell && !isSelecting(cell)
    const text = editing ? textField(target) : null
    const date = editing && target instanceof HTMLInputElement && target.type === "date"
    const value = text?.value ?? ""
    const start = text?.selectionStart ?? 0
    const end = text?.selectionEnd ?? 0
    const collapsed = start === end
    const {r, c} = point
    const go = (to: CellPoint | "title" | "after", caret: "start" | "end" = "end"): Action =>
        ({kind: "go", to, mode: "select", caret})

    switch (event.key) {
        case "ArrowLeft":
            if (date || (text && !(collapsed && start === 0))) return null
            return c > 0 ? go({r, c: c - 1}) : null
        case "ArrowRight":
            if (date || (text && !(collapsed && end === value.length))) return null
            return c < columnCount - 1 ? go({r, c: c + 1}, "start") : null
        case "ArrowUp":
            if (date || (text && !(collapsed && !value.slice(0, start).includes("\n")))) return null
            return go(r === 0 ? "title" : {r: r - 1, c})
        case "ArrowDown":
            if (date || (text && !(collapsed && !value.slice(end).includes("\n")))) return null
            return go(r === rowCount - 1 ? "after" : {r: r + 1, c})
        case "Enter":
            if (!editing) return {kind: "edit"}
            if (event.shiftKey && target instanceof HTMLTextAreaElement) return null
            return r < rowCount - 1 ? {kind: "go", to: {r: r + 1, c}, mode: "edit", caret: "end"} : {kind: "stay"}
        case "Escape":
            return editing ? {kind: "stay"} : null
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
