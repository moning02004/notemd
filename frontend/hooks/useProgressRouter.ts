"use client"

import {useEffect, useMemo, useTransition} from "react"
import {useRouter} from "next/navigation"
import {useProgressStore} from "@/store/progress"

/**
 * 진행 표시가 붙은 router.
 *
 * App Router 의 push 는 곧바로 반환되고 새 화면은 그 뒤에 그려져서, 그대로 쓰면
 * 누른 다음 한동안 아무 일도 없는 것처럼 보인다. startTransition 으로 감싸면 전환이
 * 끝날 때까지 isPending 이 유지되므로 그동안 상단 막대를 띄우고, 목적지를 스토어에
 * 적어 두어 메뉴 강조가 먼저 옮겨가게 한다.
 */
export function useProgressRouter() {
    const router = useRouter()
    const [pending, startTransition] = useTransition()

    useEffect(() => {
        const {start, done, setNavHref} = useProgressStore.getState()
        if (!pending) {
            setNavHref(null)
            return
        }
        start()
        return done
    }, [pending])

    return useMemo(() => {
        const go = (href: string, run: () => void) => {
            useProgressStore.getState().setNavHref(href)
            startTransition(run)
        }

        return {
            push: (href: string) => go(href, () => router.push(href)),
            replace: (href: string) => go(href, () => router.replace(href)),
            back: () => startTransition(() => router.back()),
            refresh: () => startTransition(() => router.refresh()),
            /** 메뉴로 갈 화면을 미리 받아둔다(운영 빌드에서만 동작). */
            prefetch: (href: string) => router.prefetch(href),
        }
    }, [router])
}
