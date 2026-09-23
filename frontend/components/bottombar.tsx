"use client"

import {usePathname, useSearchParams} from "next/navigation"
import {useEffect, useState} from "react"
import {FiPlus, FiSearch} from "react-icons/fi"
import {menuItems} from "@/constants/menus"
import {gotoNote} from "@/lib/note"
import {useSearchModalStore} from "@/store/searchModal"
import {Spinner} from "@/components/icons"
import {useProgressRouter} from "@/hooks/useProgressRouter"
import {useNavigatingPath} from "@/store/progress"

export function Bottombar() {
    const router = useProgressRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const openSearch = useSearchModalStore(state => state.open)
    // 화면이 바뀌기 전에도 누른 탭이 먼저 반응하게 한다.
    const navigatingPath = useNavigatingPath()
    const currentPath = navigatingPath ?? pathname
    // 새 노트는 서버에 만들고 나서야 열린다. 그동안 버튼 자리에서 돌려 보여준다.
    const [creatingNote, setCreatingNote] = useState(false)

    const [personal, workspace, myInfo] = menuItems

    // 모바일은 호버가 없다. 탭 할 화면을 미리 받아둬야 눌렀을 때 바로 바뀐다.
    useEffect(() => {
        menuItems.forEach(item => router.prefetch(item.path))
    }, [router])

    const navButtonClass = (active: boolean) => `
        flex flex-col items-center justify-center gap-1 flex-1 py-1.5 cursor-pointer transition-colors duration-200
        ${active ? "text-accent" : "text-subtle hover:text-muted"}
    `

    return (
        <div className="flex items-center px-2 pt-1.5 pb-2">
            <button onClick={() => router.push(personal.path)} className={navButtonClass(currentPath === personal.path)}>
                <personal.icon size={20}/>
                <span className="text-[10px] font-semibold">{personal.name}</span>
            </button>

            <button onClick={() => router.push(workspace.path)} className={navButtonClass(currentPath === workspace.path)}>
                <workspace.icon size={20}/>
                <span className="text-[10px] font-semibold">{workspace.name}</span>
            </button>

            <div className="flex-1 flex justify-center">
                <button
                    onClick={async () => {
                        if (creatingNote) return
                        setCreatingNote(true)
                        try {
                            await gotoNote({
                                id: null,
                                router,
                                // 보고 있던 폴더에서 시작한다. 개인 노트 상위면 미분류.
                                folder: pathname === "/" ? searchParams.get("folder") : null,
                            })
                        } finally {
                            setCreatingNote(false)
                        }
                    }}
                    disabled={creatingNote}
                    aria-label="새 노트"
                    className="w-13 h-13 -mt-5 rounded-full bg-accent text-white flex items-center justify-center
                               shadow-lg border-4 border-surface cursor-pointer hover:bg-accent-hover transition-colors duration-150
                               disabled:cursor-wait"
                >
                    {creatingNote ? <Spinner size={20}/> : <FiPlus size={20}/>}
                </button>
            </div>

            <button onClick={openSearch} className={navButtonClass(false)} aria-label="검색">
                <FiSearch size={20}/>
                <span className="text-[10px] font-semibold">검색</span>
            </button>

            <button onClick={() => router.push(myInfo.path)} className={navButtonClass(currentPath === myInfo.path)}>
                <myInfo.icon size={20}/>
                <span className="text-[10px] font-semibold">{myInfo.name}</span>
            </button>
        </div>
    )
}
