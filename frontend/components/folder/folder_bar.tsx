"use client"

import {useState} from "react"
import {useRouter, useSearchParams} from "next/navigation"
import {FiChevronDown, FiChevronRight, FiFolder} from "react-icons/fi"
import {useFolders} from "@/hooks/useFolders"
import {useFolderUiStore} from "@/store/folderUi"
import {findFolder, folderPathLabel, FolderNode} from "@/types/folder"
import {FolderBrowser} from "@/components/folder/folder_browser"

function useFolderNavigation() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const goTo = (folderHash: string | null, unfiled = false) => {
        const next = new URLSearchParams(searchParams.toString())
        next.delete("folder")
        next.delete("unfiled")
        if (unfiled) next.set("unfiled", "1")
        else if (folderHash) next.set("folder", folderHash)
        router.push(next.toString() ? `/?${next.toString()}` : "/")
    }

    return {
        goTo,
        folderHash: searchParams.get("folder"),
        unfiled: searchParams.get("unfiled") === "1",
    }
}

/**
 * 현재 위치를 보여주는 줄.
 *
 * 폴더가 생기면 노트가 어딘가에 "묻히기" 때문에, 지금 어디를 보고 있고 어떻게
 * 위로 올라가는지가 항상 보여야 한다. 모바일은 화면이 좁아 경로 전체 대신
 * 상위 폴더로 가는 뒤로 버튼 하나와 현재 폴더 이름만 남겼다.
 */
export function FolderBar() {
    const {data} = useFolders()
    const {goTo, folderHash, unfiled} = useFolderNavigation()
    const {includeSub, setIncludeSub} = useFolderUiStore()

    const [browserOpen, setBrowserOpen] = useState(false)

    const folders = data?.folders ?? []
    const current = findFolder(folders, folderHash)
    // 데스크톱은 사이드바에 트리가 있으므로 폴더 안에서만 경로를 띄운다.
    // 모바일은 트리가 없어 이 줄이 유일한 진입점이라 언제나 보여야 한다.
    const showOnDesktop = Boolean(current || unfiled)

    const trail: FolderNode[] = []
    let cursor = current
    while (cursor) {
        trail.unshift(cursor)
        cursor = findFolder(folders, cursor.parent_hash)
    }

    const parent = trail.length > 1 ? trail[trail.length - 2] : null
    const count = unfiled ? (data?.unfiled_count ?? 0) : (current?.total_count ?? 0)

    const mobileLabel = unfiled
        ? "/미분류"
        : current
            ? folderPathLabel(folders, current.hash_id)
            : "개인 노트 전체"

    return (
        <div className={`flex items-center gap-1 px-2 md:px-4 h-12 md:h-10 border-b border-border bg-surface
                         ${showOnDesktop ? "" : "md:hidden"}`}>
            {/* 데스크톱: 경로 전체 */}
            <nav className="hidden md:flex items-center gap-1 min-w-0 text-[12.5px]" aria-label="폴더 경로">
                <button onClick={() => goTo(null)} className="text-muted hover:text-accent cursor-pointer shrink-0">
                    개인 노트
                </button>
                {unfiled && <><Separator/><span className="font-semibold text-foreground">미분류</span></>}
                {trail.map((node, index) => (
                    <span key={node.hash_id} className="flex items-center gap-1 min-w-0">
                        <Separator/>
                        {index === trail.length - 1
                            ? <span className="font-semibold text-foreground truncate">{node.name}</span>
                            : <button onClick={() => goTo(node.hash_id)}
                                      className="text-muted hover:text-accent cursor-pointer truncate">
                                {node.name}
                            </button>}
                    </span>
                ))}
            </nav>

            {/* 모바일: 이 줄이 폴더를 고르는 진입점이다. 누르면 전체 화면으로 폴더가 뜬다. */}
            <button
                onClick={() => setBrowserOpen(true)}
                aria-haspopup="dialog"
                className="md:hidden flex items-center gap-1.5 flex-1 min-w-0 h-11 -ml-1 px-2 rounded-lg
                           text-[13px] text-muted tracking-wider cursor-pointer active:bg-background"
            >
                <FiFolder size={14} className="shrink-0 text-accent"/>
                <span className="flex-1 min-w-0 truncate text-left">{mobileLabel}</span>
                <FiChevronDown size={14} className="shrink-0 text-subtle"/>
            </button>

            <span className="hidden md:inline text-[11.5px] text-subtle tabular-nums ml-2">{count}개</span>

            {current && (
                <button
                    onClick={() => setIncludeSub(!includeSub)}
                    aria-pressed={includeSub}
                    className={`shrink-0 md:ml-auto h-8 md:h-7 px-2.5 rounded-full border text-[11.5px] font-medium
                                cursor-pointer transition-colors duration-150
                        ${includeSub
                        ? "bg-accent text-white border-accent"
                        : "border-border text-muted hover:border-subtle hover:text-foreground"}`}
                >
                    하위 포함
                </button>
            )}

            <FolderBrowser
                isOpen={browserOpen}
                onClose={() => setBrowserOpen(false)}
                currentFolder={folderHash}
                unfiled={unfiled}
                onSelect={target => goTo(target.folder, target.unfiled)}
            />
        </div>
    )
}

function Separator() {
    return <FiChevronRight size={11} className="text-subtle shrink-0"/>
}

/**
 * 모바일 전용 드릴다운.
 *
 * 좁은 화면에 트리를 욱여넣으면 들여쓰기 때문에 이름이 남지 않는다. 한 번에 한 층만
 * 보여주고, 하위 폴더를 노트 위에 두어 "폴더 먼저, 그다음 노트" 순서로 읽히게 했다.
 */
