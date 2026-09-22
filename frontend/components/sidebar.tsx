"use client"

import {usePathname, useRouter, useSearchParams} from "next/navigation"
import {FiPlus} from "react-icons/fi"
import {LuBookText, LuUser} from "react-icons/lu"
import {MdOutlineSettings, MdWorkspacesFilled} from "react-icons/md"
import {GrTrash} from "react-icons/gr"
import {gotoNote} from "@/lib/note"
import React, {useEffect, useState} from "react";
import {LoadingPage} from "@/components/loading";
import {FolderTree} from "@/components/folder/folder_tree";

// '개인 노트' 는 폴더를 품고 있어 따로 그린다. 나머지는 평범한 메뉴.
const navItems = [
    {name: "워크스페이스", icon: MdWorkspacesFilled, path: "/workspace"},
    {name: "휴지통", icon: GrTrash, path: "/deleted"},
    {name: "설정", icon: MdOutlineSettings, path: "/settings"},
]

/** 메뉴 한 줄의 생김새. '개인 노트' 도 같은 클래스를 써야 줄이 어긋나지 않는다. */
const navItemClass = (active: boolean) => `
    flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-semibold
    cursor-pointer transition-colors duration-150 text-left w-full
    ${active ? "bg-accent-soft text-accent" : "text-muted hover:text-foreground hover:bg-background"}`

export function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const searchParams = useSearchParams()
    const [newNote, setNewNote] = useState(false)

    const onNoteList = pathname === "/"
    const [foldersOpen, setFoldersOpen] = useState(onNoteList)
    // '새 폴더' 입력 상태. ＋ 가 개인 노트 줄에 있어 여기서 들고 트리로 내려준다.
    const [creatingFolder, setCreatingFolder] = useState(false)

    // 다른 메뉴로 가면 폴더는 접는다. 사이드바에 한 번에 한 덩어리만 펼쳐져 있게.
    useEffect(() => {
        if (!onNoteList) setFoldersOpen(false)
    }, [onNoteList])

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
                        // 보고 있던 폴더에서 시작한다. 개인 노트 상위면 미분류.
                        gotoNote({id: null, router, folder: onNoteList ? searchParams.get("folder") : null})
                    }}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-accent text-white text-[13px] font-semibold cursor-pointer hover:bg-accent-hover transition-colors duration-150 mb-4"
                >
                    <FiPlus size={15}/>
                    새 노트
                </button>

                <nav className="flex flex-col gap-0.5">
                    <div className={navItemClass(onNoteList)}>
                        <LuBookText size={15} className="shrink-0"/>
                        <button
                            onClick={() => {
                                if (onNoteList) setFoldersOpen(open => !open)
                                else {
                                    setFoldersOpen(true)
                                    router.push("/")
                                }
                            }}
                            aria-expanded={foldersOpen}
                            className="flex-1 min-w-0 truncate text-left cursor-pointer"
                        >
                            개인 노트
                        </button>
                        <button
                            onClick={() => {
                                setFoldersOpen(true)
                                setCreatingFolder(true)
                            }}
                            aria-label="새 폴더"
                            title="새 폴더"
                            className="shrink-0 p-0.5 -mr-0.5 rounded text-subtle hover:text-accent
                                       hover:bg-accent-soft cursor-pointer transition-colors duration-150"
                        >
                            <FiPlus size={14}/>
                        </button>
                    </div>

                    {/* 폴더가 늘어나도 이 영역만 스크롤한다. 아래 메뉴는 제자리에 남는다. */}
                    {foldersOpen && (
                        <div className="max-h-[38vh] overflow-y-auto overscroll-contain -mx-1 px-1 pb-1">
                            <FolderTree creating={creatingFolder} onCreatingChange={setCreatingFolder}/>
                        </div>
                    )}

                    {navItems.map(item => {
                        const active = pathname === item.path
                        return (
                            <button
                                key={item.path}
                                onClick={() => router.push(item.path)}
                                className={navItemClass(active)}
                            >
                                <item.icon size={15} className="shrink-0"/>
                                {item.name}
                            </button>
                        )
                    })}
                </nav>

                <button
                    onClick={() => router.push("/my-info")}
                    className={`mt-auto shrink-0 flex items-center gap-2.5 px-2 py-2 rounded-lg cursor-pointer transition-colors duration-150 text-left
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
