"use client"

import {ReactNode, useEffect, useLayoutEffect, useRef, useState} from "react"
import {createPortal} from "react-dom"

/**
 * 칸·열 머리에 붙어 뜨는 작은 창.
 *
 * 콜렉션은 가로로 밀리는 틀(overflow-x) 안에 있어 그 안에 그리면 잘린다. body 에 띄우고 붙을 자리(anchor)의
 * 화면 좌표를 따라간다. 아래가 좁으면 위로 뒤집는다. 바깥을 누르거나 Esc 를 누르면 닫힌다.
 * 에디터 밖(body)에 있으므로 안에서 치는 글자는 에디터에 가지 않는다.
 */
export function Popover({anchor, onClose, children, width = 260}: {
    anchor: HTMLElement
    onClose: () => void
    children: ReactNode
    width?: number
}) {
    const ref = useRef<HTMLDivElement>(null)
    const [position, setPosition] = useState<{ top: number, left: number } | null>(null)

    useLayoutEffect(() => {
        const place = () => {
            const rect = anchor.getBoundingClientRect()
            const height = ref.current?.offsetHeight ?? 0
            const gap = 4
            const below = rect.bottom + gap
            const top = below + height > window.innerHeight - 8 && rect.top - gap - height > 8
                ? rect.top - gap - height
                : below
            const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))
            setPosition({top, left})
        }
        place()
        // 안의 내용이 바뀌어 높이가 달라져도(선택지 추가 등) 다시 맞춘다.
        const observer = new ResizeObserver(place)
        if (ref.current) observer.observe(ref.current)
        window.addEventListener("scroll", place, true)
        window.addEventListener("resize", place)
        return () => {
            observer.disconnect()
            window.removeEventListener("scroll", place, true)
            window.removeEventListener("resize", place)
        }
    }, [anchor, width])

    useEffect(() => {
        const onDown = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node
            if (ref.current?.contains(target) || anchor.contains(target)) return
            onClose()
        }
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.stopPropagation()
                onClose()
            }
        }
        document.addEventListener("mousedown", onDown)
        document.addEventListener("touchstart", onDown)
        document.addEventListener("keydown", onKey, true)
        return () => {
            document.removeEventListener("mousedown", onDown)
            document.removeEventListener("touchstart", onDown)
            document.removeEventListener("keydown", onKey, true)
        }
    }, [anchor, onClose])

    return createPortal(
        <div ref={ref}
             className="fixed z-[9999] rounded-xl border border-border bg-surface p-1.5 shadow-lg text-[13px] text-foreground"
             style={{
                 width,
                 top: position?.top ?? -9999,
                 left: position?.left ?? -9999,
                 // visibility: hidden 이면 안의 autoFocus 가 먹지 않는다. 자리를 잡기 전에는 투명하게만 둔다.
                 opacity: position ? 1 : 0,
             }}>
            {children}
        </div>,
        document.body,
    )
}
