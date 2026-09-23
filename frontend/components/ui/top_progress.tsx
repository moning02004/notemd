"use client"

import {useEffect, useRef, useState} from "react"
import {useProgressStore} from "@/store/progress"

/** 이 안에 끝나는 일에는 막대를 띄우지 않는다. 깜빡이면 오히려 느려 보인다. */
const APPEAR_DELAY_MS = 120
const TICK_MS = 180
const FADE_MS = 280

/**
 * 화면 맨 위를 가로지르는 진행 막대.
 *
 * 요청이나 화면 이동이 얼마나 걸릴지 모르므로 90%까지 점점 느리게 채우다가,
 * 일이 끝나면 100%로 밀고 사라진다. 눌렀는데 아무 반응이 없는 구간을 없애는 게 목적이다.
 */
export function TopProgress() {
    const active = useProgressStore(state => state.pending > 0)
    const [value, setValue] = useState(0) // 0 이면 감춘다
    const startedRef = useRef(false)

    useEffect(() => {
        if (active) {
            startedRef.current = true
            const appear = setTimeout(() => setValue(current => (current === 0 ? 12 : current)), APPEAR_DELAY_MS)
            const tick = setInterval(() => {
                setValue(current => (current === 0 ? 0 : current + Math.max(0.4, (90 - current) * 0.12)))
            }, TICK_MS)
            return () => {
                clearTimeout(appear)
                clearInterval(tick)
            }
        }

        // 막대를 띄우지도 않고 끝난 일이라면 그대로 둔다.
        if (!startedRef.current) return
        startedRef.current = false

        setValue(current => (current === 0 ? 0 : 100))
        const fade = setTimeout(() => setValue(0), FADE_MS)
        return () => clearTimeout(fade)
    }, [active])

    if (value === 0) return null

    return (
        <div className="fixed inset-x-0 top-0 z-[100] h-[2px] pointer-events-none"
             role="progressbar"
             aria-label="불러오는 중"
             aria-valuemin={0}
             aria-valuemax={100}>
            <div
                className="h-full bg-accent transition-[width,opacity] duration-200 ease-out motion-reduce:transition-none"
                style={{
                    width: `${Math.min(value, 100)}%`,
                    opacity: value >= 100 ? 0 : 1,
                    boxShadow: "0 0 8px var(--accent)",
                }}
            />
        </div>
    )
}
