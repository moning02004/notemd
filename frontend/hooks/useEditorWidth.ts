"use client"

import {useCallback} from "react"
import {useQuery, useQueryClient} from "@tanstack/react-query"
import toast from "react-hot-toast"

import {apiRequest} from "@/lib/api"
import {useAuthStore} from "@/store/auth"

/** 노트 본문 폭. 사람마다 저장한다(설정의 editor_width). 공유 노트에서 남의 화면 폭을 바꾸지 않는다. */
export type EditorWidth = "WIDE" | "NORMAL" | "NARROW"

/*
 * 보이는 이름과 실제 폭. 퍼센트는 화면에 따라 체감이 달라 이름으로 고르게 한다.
 * 휴대폰(md 미만)에서는 늘 꽉 채운다. 좁게(50%)는 글이 한 줄에 몇 자 들어가지 않는다.
 * Tailwind 는 소스에 그대로 적힌 클래스만 만드므로 클래스 이름을 조합하지 않고 통째로 적는다.
 */
export const EDITOR_WIDTHS: Record<EditorWidth, { label: string, className: string }> = {
    WIDE: {label: "넓게", className: "w-full md:w-[95%]"},
    NORMAL: {label: "보통", className: "w-full md:w-[70%]"},
    NARROW: {label: "좁게", className: "w-full md:w-[50%]"},
}

const DEFAULT_WIDTH: EditorWidth = "WIDE"
const PREFERENCE_KEY = ["preferences"]

type PreferenceResponse = { editor_width?: EditorWidth }

/** 내 노트 폭과 바꾸는 함수. 로그인하지 않았으면 넓게. 바꾸면 화면에 먼저 반영하고 저장한다. */
export function useEditorWidth(): [EditorWidth, (width: EditorWidth) => void] {
    const token = useAuthStore(state => state.token)
    const queryClient = useQueryClient()
    const {data} = useQuery({
        queryKey: PREFERENCE_KEY,
        queryFn: () => apiRequest.get<PreferenceResponse>("/preferences", {}, {isSilent: true}),
        enabled: Boolean(token),
        staleTime: 5 * 60 * 1000,
    })
    const width = data?.editor_width && data.editor_width in EDITOR_WIDTHS ? data.editor_width : DEFAULT_WIDTH

    const setWidth = useCallback((next: EditorWidth) => {
        const previous = queryClient.getQueryData<PreferenceResponse>(PREFERENCE_KEY)
        queryClient.setQueryData<PreferenceResponse>(PREFERENCE_KEY, {...previous, editor_width: next})
        apiRequest.patch("/preferences", {body: JSON.stringify({editor_width: next})})
            .catch(() => {
                queryClient.setQueryData(PREFERENCE_KEY, previous)
                toast.error("노트 폭을 저장하지 못했습니다.")
            })
    }, [queryClient])

    return [width, setWidth]
}
