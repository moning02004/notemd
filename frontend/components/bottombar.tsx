"use client"

import {usePathname, useRouter} from "next/navigation"
import {FiPlus, FiSearch} from "react-icons/fi"
import {menuItems} from "@/constants/menus"
import {gotoNote} from "@/lib/note"
import {useSearchModalStore} from "@/store/searchModal"

export function Bottombar() {
    const router = useRouter()
    const pathname = usePathname()
    const openSearch = useSearchModalStore(state => state.open)

    const [personal, workspace, myInfo] = menuItems

    const navButtonClass = (active: boolean) => `
        flex flex-col items-center justify-center gap-1 flex-1 py-1.5 cursor-pointer transition-colors duration-200
        ${active ? "text-accent" : "text-subtle hover:text-muted"}
    `

    return (
        <div className="flex items-center px-2 pt-1.5 pb-2">
            <button onClick={() => router.push(personal.path)} className={navButtonClass(pathname === personal.path)}>
                <personal.icon size={20}/>
                <span className="text-[10px] font-semibold">{personal.name}</span>
            </button>

            <button onClick={() => router.push(workspace.path)} className={navButtonClass(pathname === workspace.path)}>
                <workspace.icon size={20}/>
                <span className="text-[10px] font-semibold">{workspace.name}</span>
            </button>

            <div className="flex-1 flex justify-center">
                <button
                    onClick={() => gotoNote({id: null, router})}
                    aria-label="새 노트"
                    className="w-13 h-13 -mt-5 rounded-full bg-accent text-white flex items-center justify-center
                               shadow-lg border-4 border-surface cursor-pointer hover:bg-accent-hover transition-colors duration-150"
                >
                    <FiPlus size={20}/>
                </button>
            </div>

            <button onClick={openSearch} className={navButtonClass(false)} aria-label="검색">
                <FiSearch size={20}/>
                <span className="text-[10px] font-semibold">검색</span>
            </button>

            <button onClick={() => router.push(myInfo.path)} className={navButtonClass(pathname === myInfo.path)}>
                <myInfo.icon size={20}/>
                <span className="text-[10px] font-semibold">{myInfo.name}</span>
            </button>
        </div>
    )
}
