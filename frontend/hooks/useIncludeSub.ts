"use client"

import {useCallback} from "react"
import {usePathname, useSearchParams} from "next/navigation"
import {useProgressRouter} from "@/hooks/useProgressRouter"
import {useFolderUiStore} from "@/store/folderUi"

/**
 * 목록에 하위 폴더 노트까지 보여줄지.
 *
 * 주소에 include_sub 가 있으면 그게 이긴다. 받은 링크를 열었을 때 보낸 사람이 보던 그대로 보여야 하고,
 * 저장된 값(이 브라우저에서 마지막으로 고른 것)은 주소에 아무 말이 없을 때만 쓴다.
 * 링크로 연 값은 저장하지 않는다. 남의 링크 하나로 내 기본값이 바뀌면 안 된다.
 * 토글하면 둘 다 바꿔, 지금 주소를 복사해 보내도 같은 화면이 열린다.
 */
export function useIncludeSub(): [boolean, (value: boolean) => void] {
    const router = useProgressRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const stored = useFolderUiStore(state => state.includeSub)
    const setStored = useFolderUiStore(state => state.setIncludeSub)

    const param = searchParams.get("include_sub")
    const includeSub = param === null ? stored : param === "1"

    const setIncludeSub = useCallback((value: boolean) => {
        setStored(value)
        const next = new URLSearchParams(searchParams.toString())
        next.set("include_sub", value ? "1" : "0")
        router.replace(`${pathname}?${next.toString()}`)
    }, [pathname, router, searchParams, setStored])

    return [includeSub, setIncludeSub]
}
