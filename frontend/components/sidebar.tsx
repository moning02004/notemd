"use client"

import {usePathname, useSearchParams} from "next/navigation"
import {FiPlus} from "react-icons/fi"
import {LuBookText, LuUser} from "react-icons/lu"
import {MdOutlineSettings, MdWorkspacesFilled} from "react-icons/md"
import {GrTrash} from "react-icons/gr"
import {gotoNote} from "@/lib/note"
import React, {useEffect, useState} from "react";
import {FolderTree} from "@/components/folder/folder_tree";
import {Spinner} from "@/components/icons";
import {useProgressRouter} from "@/hooks/useProgressRouter";
import {useNavigatingPath} from "@/store/progress";

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
    const router = useProgressRouter()
    const searchParams = useSearchParams()
    // 화면이 바뀌기 전에도 누른 메뉴가 먼저 반응하게 한다.
    const navigatingPath = useNavigatingPath()
    // 새 노트는 서버에 만들고 나서야 열린다. 그동안 버튼 안에서 진행 중임을 보여준다.
    const [creatingNote, setCreatingNote] = useState(false)

    const onNoteList = pathname === "/"
    // 이동 중이면 목적지를 기준으로 강조한다. 화면보다 메뉴가 먼저 반응한다.
    const activePath = navigatingPath ?? pathname
    const [foldersOpen, setFoldersOpen] = useState(onNoteList)
    // '새 폴더' 입력 상태. ＋ 가 개인 노트 줄에 있어 여기서 들고 트리로 내려준다.
    const [creatingFolder, setCreatingFolder] = useState(false)

    // 다른 메뉴로 가면 폴더는 접는다. 사이드바에 한 번에 한 덩어리만 펼쳐져 있게.
    // pathname 이 아니라 activePath 를 보는 이유: 화면이 바뀐 뒤에 접으면 한 박자 늦어
    // 폴더가 열린 채로 멈칫한다. 누른 순간(목적지가 정해진 순간) 바로 접기 시작한다.
    useEffect(() => {
        if (activePath !== "/") setFoldersOpen(false)
    }, [activePath])

    // 메뉴는 몇 개 안 되고 어차피 누를 화면이다. 미리 받아두면 눌렀을 때 기다림이 없다.
    useEffect(() => {
        ["/", "/my-info", ...navItems.map(item => item.path)]
            .forEach(path => router.prefetch(path))
    }, [router])

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
                    onClick={async () => {
                        if (creatingNote) return
                        setCreatingNote(true)
                        try {
                            // 보고 있던 폴더에서 시작한다. 개인 노트 상위면 미분류.
                            await gotoNote({id: null, router, folder: onNoteList ? searchParams.get("folder") : null})
                        } finally {
                            setCreatingNote(false)
                        }
                    }}
                    disabled={creatingNote}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-accent text-white text-[13px] font-semibold cursor-pointer hover:bg-accent-hover transition-colors duration-150 mb-4 disabled:cursor-wait disabled:bg-accent-hover"
                >
                    {creatingNote ? <Spinner size={15}/> : <FiPlus size={15}/>}
                    {creatingNote ? "만드는 중" : "새 노트"}
                </button>

                <nav className="flex flex-col gap-0.5">
                    {/*
                      줄 전체가 버튼이어야 아이콘이나 좌우 여백을 눌러도 넘어간다.
                      (hover 로 밝아지는 영역과 눌리는 영역이 같아야 한다.)
                      ＋ 는 버튼 안에 넣을 수 없으니 오른쪽에 겹쳐 둔다.
                    */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                // 폴더나 미분류를 보고 있으면 '개인 노트'는 그 위로 나가는 메뉴다.
                                // 이미 맨 위에 있을 때만 폴더를 접었다 편다.
                                const atRoot = onNoteList && !searchParams.get("folder") && !searchParams.get("unfiled")
                                if (atRoot) setFoldersOpen(open => !open)
                                else {
                                    setFoldersOpen(true)
                                    router.push("/")
                                }
                            }}
                            aria-expanded={foldersOpen}
                            className={`${navItemClass(activePath === "/")} pr-7`}
                        >
                            <LuBookText size={15} className="shrink-0"/>
                            <span className="flex-1 min-w-0 truncate text-left">개인 노트</span>
                        </button>
                        <button
                            onClick={() => {
                                setFoldersOpen(true)
                                setCreatingFolder(true)
                            }}
                            aria-label="새 폴더"
                            title="새 폴더"
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-subtle
                                       hover:text-accent hover:bg-accent-soft cursor-pointer transition-colors duration-150"
                        >
                            <FiPlus size={14}/>
                        </button>
                    </div>

                    {/*
                      펼치고 접히는 높이를 grid-template-rows 0fr -> 1fr 로 준다.
                      height:auto 는 전환되지 않고, max-height 로 하면 내용이 짧을 때
                      빈 높이를 지나느라 굼떠 보인다. 접힌 동안에는 inert 로 탭 이동에서 뺀다.
                    */}
                    <div
                        inert={!foldersOpen}
                        className={`grid transition-[grid-template-rows]
                                    motion-reduce:transition-none
                                    ${foldersOpen
                            ? "grid-rows-[1fr] duration-200 ease-out"
                            /* 접을 때는 더 짧고 빠르게. 자리를 비켜주는 동작이라 끌면 답답하다. */
                            : "grid-rows-[0fr] duration-[150ms] ease-in"}`}
                    >
                        {/* 폴더가 늘어나도 이 영역만 스크롤한다. 아래 메뉴는 제자리에 남는다. */}
                        <div className="overflow-hidden">
                            <div className="max-h-[38vh] overflow-y-auto overscroll-contain -mx-1 px-1 pb-1">
                                <FolderTree creating={creatingFolder} onCreatingChange={setCreatingFolder}/>
                            </div>
                        </div>
                    </div>

                    {navItems.map(item => {
                        const active = activePath === item.path
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
                    ${activePath === "/my-info" ? "bg-accent-soft text-accent" : "hover:bg-background"}`}
                >
                <span
                    className="w-7 h-7 rounded-full bg-border-strong flex items-center justify-center shrink-0 text-muted">
                    <LuUser size={13}/>
                </span>
                    <span className="text-[12.5px] font-semibold text-foreground">내 정보</span>
                </button>
            </div>
        </>
    )
}
