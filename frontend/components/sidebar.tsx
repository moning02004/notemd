"use client"

import {usePathname, useRouter} from "next/navigation"
import {FiPlus} from "react-icons/fi"
import {LuUser} from "react-icons/lu"
import {MdOutlineSettings, MdWorkspacesFilled} from "react-icons/md"
import {GrTrash} from "react-icons/gr"
import {gotoNote} from "@/lib/note"
import React, {useState} from "react";
import {LoadingPage} from "@/components/loading";
import {FolderTree} from "@/components/folder/folder_tree";

// '개인 노트' 는 여기 없다. 폴더 트리의 뿌리 행이 그 역할을 겸한다.
const navItems = [
    {name: "워크스페이스", icon: MdWorkspacesFilled, path: "/workspace"},
    {name: "휴지통", icon: GrTrash, path: "/deleted"},
    {name: "설정", icon: MdOutlineSettings, path: "/settings"},
]

export function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const [newNote, setNewNote] = useState(false)

    return (
        <>
            <div className="hidden md:flex md:flex-col md:w-52 md:shrink-0 bg-sidebar border-r border-border p-3">
                <div className="flex items-center gap-2 px-1.5 py-2 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-surface/15 flex items-center justify-center">
                        <img src="/icon.png" alt=""/>
                    </div>
                    <span className="text-[13px] font-extrabold text-foreground tracking-tight">note.md</span>
                </div>

                <button
                    onClick={() => {
                        setNewNote(true)
                        gotoNote({id: null, router})
                    }}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-accent text-white text-[13px] font-semibold cursor-pointer hover:bg-accent-hover transition-colors duration-150 mb-4"
                >
                    <FiPlus size={15}/>
                    새 노트
                </button>

                {/* 폴더만 스크롤한다. 아래 고정 메뉴는 폴더가 몇 개든 제자리에 남는다. */}
                <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
                    <FolderTree/>
                </div>

                <nav className="flex flex-col gap-0.5 shrink-0 pt-2 mt-2 border-t border-border">
                    {navItems.map(item => {
                        const active = pathname === item.path
                        return (
                            <button
                                key={item.path}
                                onClick={() => router.push(item.path)}
                                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer transition-colors duration-150 text-left
                                ${active ? "bg-accent-soft text-accent" : "text-muted hover:text-foreground hover:bg-background"}`}
                            >
                                <item.icon size={15}/>
                                {item.name}
                            </button>
                        )
                    })}
                </nav>

                <button
                    onClick={() => router.push("/my-info")}
                    className={`mt-1 shrink-0 flex items-center gap-2.5 px-2 py-2 rounded-lg cursor-pointer transition-colors duration-150 text-left
                    ${pathname === "/my-info" ? "bg-accent-soft text-accent" : "hover:bg-background"}`}
                >
                <span
                    className="w-7 h-7 rounded-full bg-border-strong flex items-center justify-center shrink-0 text-muted">
                    <LuUser size={13}/>
                </span>
                    <span className="text-[12.5px] font-semibold text-foreground">내 정보</span>
                </button>
            </div>

            {newNote &&
                <div className="relative top-0 left-0 w-full h-screen z-50 flex items-center justify-center">
                    <LoadingPage />
                </div>
            }
        </>
    )
}
