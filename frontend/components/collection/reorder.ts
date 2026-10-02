import type {PointerEvent as ReactPointerEvent} from "react"

/**
 * 모음표의 열·행을 마우스로 끌어 옮긴다.
 *
 * HTML5 끌어 놓기(draggable)는 쓰지 않는다. 모음표는 에디터 안에 있어 drag 이벤트를 에디터가 받고
 * (노드 뷰의 stopEvent 가 끌기만은 에디터에 넘긴다) 놓는 자리 표시(Dropcursor)까지 끼어든다. 포인터 이벤트로 직접 다룬다.
 */

/** 놓을 자리 표시선(그리드 기준 좌표) */
export type DropLine = { left: number, top: number, width: number, height: number }

/** 이만큼 움직여야 끌기로 본다. 그 전에 놓으면 그냥 누른 것이다(열 머리는 메뉴를 연다). */
const THRESHOLD = 4

/** from 자리의 것을 빼서, 원래 목록 기준 to 자리(그 앞)에 넣는다. to 는 0 ~ 길이. */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
    if (from === to || from + 1 === to) return items
    const next = [...items]
    const [item] = next.splice(from, 1)
    next.splice(to > from ? to - 1 : to, 0, item)
    return next
}

export function startReorder({event, axis, from, grid, targets, onDragging, onLine, onDrop}: {
    event: ReactPointerEvent<HTMLElement>
    axis: "x" | "y"
    from: number
    /** 표시선 좌표의 기준 */
    grid: HTMLElement
    /** 옮길 수 있는 자리들(열 머리 또는 행의 첫 칸). 지금 화면 순서대로. */
    targets: () => HTMLElement[]
    /** 끌기가 시작·끝날 때(끄는 것을 흐리게) */
    onDragging: (dragging: boolean) => void
    onLine: (line: DropLine | null) => void
    onDrop: (from: number, to: number) => void
}) {
    if (event.button !== 0) return
    const startX = event.clientX, startY = event.clientY
    let dragging = false
    let to = from

    const move = (pointer: PointerEvent) => {
        if (!dragging) {
            if (Math.hypot(pointer.clientX - startX, pointer.clientY - startY) < THRESHOLD) return
            dragging = true
            onDragging(true)
            document.body.classList.add("collection-reordering")
            window.getSelection()?.removeAllRanges()
        }
        pointer.preventDefault()

        const rects = targets().map(element => element.getBoundingClientRect())
        if (rects.length === 0) return
        const position = axis === "x" ? pointer.clientX : pointer.clientY
        to = rects.findIndex(rect => (axis === "x"
            ? position < rect.left + rect.width / 2
            : position < rect.top + rect.height / 2))
        if (to === -1) to = rects.length

        // 표시선: to 번째 자리의 앞 경계(맨 끝이면 마지막 자리의 뒤 경계)
        const box = grid.getBoundingClientRect()
        const edge = to < rects.length ? rects[to] : rects[rects.length - 1]
        if (axis === "x") {
            const x = to < rects.length ? edge.left : edge.right
            onLine({left: x - box.left - 1, top: 0, width: 2, height: box.height})
        } else {
            const y = to < rects.length ? edge.top : edge.bottom
            onLine({left: 0, top: y - box.top - 1, width: box.width, height: 2})
        }
    }

    const up = () => {
        window.removeEventListener("pointermove", move)
        window.removeEventListener("pointerup", up)
        window.removeEventListener("pointercancel", up)
        if (!dragging) return
        document.body.classList.remove("collection-reordering")
        onDragging(false)
        onLine(null)
        // 끌기를 마치며 생기는 click 이 열 머리 메뉴를 열지 않게 한 번 삼킨다.
        const swallow = (click: MouseEvent) => {
            click.stopPropagation()
            click.preventDefault()
        }
        window.addEventListener("click", swallow, {capture: true, once: true})
        setTimeout(() => window.removeEventListener("click", swallow, {capture: true}), 0)
        onDrop(from, to)
    }

    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", up)
}
