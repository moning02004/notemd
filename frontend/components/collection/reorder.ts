import type {PointerEvent as ReactPointerEvent} from "react"

/**
 * 모음표의 열·행을 마우스로 끌어 옮긴다. 끄는 동안 화면에서는 이미 그 자리로 옮겨 보여 주고(onPreview),
 * 놓을 때 한 번 적는다(onDrop, 되돌리기가 한 번에 되돌린다).
 *
 * 놓을 자리는 끌기 시작할 때의 배치(각 자리의 경계)로 정한다. 옮겨 보이는 배치로 다시 재면 폭이 다른 열끼리
 * 서로 자리를 바꾸며 떨린다(좁은 열을 넓은 열 뒤로 옮기면, 포인터가 다시 넓은 열 위에 놓인다).
 *
 * HTML5 끌어 놓기(draggable)는 쓰지 않는다. 모음표는 에디터 안에 있어 drag 이벤트를 에디터가 받고
 * (노드 뷰의 stopEvent 가 끌기만은 에디터에 넘긴다) 놓는 자리 표시(Dropcursor)까지 끼어든다. 포인터 이벤트로 직접 다룬다.
 */

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

export function startReorder({event, axis, from, grid, targets, onPreview, onDrop}: {
    event: ReactPointerEvent<HTMLElement>
    axis: "x" | "y"
    from: number
    /** 좌표의 기준. 끄는 동안 표가 가로로 밀리거나 페이지가 스크롤돼도 이 기준으로 잰다. */
    grid: HTMLElement
    /** 옮길 수 있는 자리들(열 머리 또는 행의 첫 칸). 지금 화면 순서대로. */
    targets: HTMLElement[]
    /** 끄는 동안 놓을 자리(원래 목록 기준 to)가 바뀔 때. 끌기가 끝나면 null. */
    onPreview: (to: number | null) => void
    onDrop: (from: number, to: number) => void
}) {
    if (event.button !== 0 || targets.length === 0) return
    const startX = event.clientX, startY = event.clientY
    let dragging = false
    let to = from

    // 시작할 때의 각 자리 가운데(그리드 기준)
    const origin = (box: DOMRect) => (axis === "x" ? box.left : box.top)
    const startBox = grid.getBoundingClientRect()
    const middles = targets.map(element => {
        const rect = element.getBoundingClientRect()
        return axis === "x"
            ? rect.left - startBox.left + rect.width / 2
            : rect.top - startBox.top + rect.height / 2
    })

    const move = (pointer: PointerEvent) => {
        if (!dragging) {
            if (Math.hypot(pointer.clientX - startX, pointer.clientY - startY) < THRESHOLD) return
            dragging = true
            document.body.classList.add("collection-reordering")
            window.getSelection()?.removeAllRanges()
        }
        pointer.preventDefault()

        const position = (axis === "x" ? pointer.clientX : pointer.clientY) - origin(grid.getBoundingClientRect())
        let next = middles.findIndex(middle => position < middle)
        if (next === -1) next = middles.length
        // 제자리(바로 앞·뒤 경계)는 하나로 친다.
        if (next === from + 1) next = from
        if (next !== to) {
            to = next
            onPreview(to)
        }
    }

    const up = () => {
        window.removeEventListener("pointermove", move)
        window.removeEventListener("pointerup", up)
        window.removeEventListener("pointercancel", up)
        if (!dragging) return
        document.body.classList.remove("collection-reordering")
        onPreview(null)
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
