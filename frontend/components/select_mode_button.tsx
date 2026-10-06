"use client"

import {FiCheckSquare} from "react-icons/fi"
import {useNoteSelectStore} from "@/store/noteSelect"

/**
 * 목록 도구 줄 맨 왼쪽의 '선택'. 누르면 노트를 여러 개 골라 옮기고·받고·묶고·지우는 선택 모드로 들어간다.
 *
 * 오른쪽 위 ⋮ 메뉴 안에 있을 때는 두 번 눌러야 했고, 있는 줄 모르는 사람이 많았다.
 * 목록을 다루는 도구(정렬·보기 방식)와 같은 줄에 둔다. 한 번 더 누르면 나온다.
 */
export default function SelectModeButton() {
    const selectMode = useNoteSelectStore(state => state.selectMode)
    const enterSelectMode = useNoteSelectStore(state => state.enterSelectMode)
    const exitSelectMode = useNoteSelectStore(state => state.exitSelectMode)

    return (
        <button
            onClick={() => (selectMode ? exitSelectMode() : enterSelectMode())}
            aria-pressed={selectMode}
            title={selectMode ? "선택 끝내기" : "여러 노트 고르기"}
            className={`shrink-0 inline-flex items-center gap-1 h-7 px-2 rounded-md text-[12.5px] font-medium
                        cursor-pointer transition-colors duration-150
                        ${selectMode
                ? "text-accent bg-accent-soft"
                : "text-muted hover:text-foreground hover:bg-background"}`}
        >
            <FiCheckSquare size={14}/>
            {selectMode ? "취소" : "선택"}
        </button>
    )
}
