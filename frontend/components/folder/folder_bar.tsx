"use client"

import {useState} from "react"
import {useRouter, useSearchParams} from "next/navigation"
import {FiChevronDown, FiChevronLeft, FiChevronRight, FiFolder, FiInbox} from "react-icons/fi"
import {useFolders} from "@/hooks/useFolders"
import {useFolderUiStore} from "@/store/folderUi"
import {findFolder, FolderNode} from "@/types/folder"

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

    const folders = data?.folders ?? []
    const current = findFolder(folders, folderHash)

    if (!current && !unfiled) return null

    const trail: FolderNode[] = []
    let cursor = current
    while (cursor) {
        trail.unshift(cursor)
        cursor = findFolder(folders, cursor.parent_hash)
    }

    const parent = trail.length > 1 ? trail[trail.length - 2] : null
    const count = unfiled ? (data?.unfiled_count ?? 0) : (current?.total_count ?? 0)

    return (
        <div className="flex items-center gap-1 px-2 md:px-4 h-12 md:h-10 border-b border-border bg-surface">
            {/* 모바일: 한 단계 위로. 손가락이 닿는 크기를 확보한다. */}
            <button
                onClick={() => goTo(parent?.hash_id ?? null)}
                aria-label={parent ? `${parent.name}(으)로` : "개인 노트로"}
                className="md:hidden flex items-center gap-0.5 h-11 pl-1 pr-2 -ml-1 rounded-lg text-accent
                           text-[13px] font-medium cursor-pointer active:bg-accent-soft"
            >
                <FiChevronLeft size={19}/>
                <span className="max-w-[7rem] truncate">{parent?.name ?? "개인 노트"}</span>
            </button>

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

            <span className="md:hidden flex-1 min-w-0 text-center text-[13.5px] font-semibold text-foreground truncate">
                {unfiled ? "미분류" : current?.name}
            </span>

            <span className="hidden md:inline text-[11.5px] text-subtle tabular-nums ml-2">{count}개</span>

            {!unfiled && (
                <button
                    onClick={() => setIncludeSub(!includeSub)}
                    aria-pressed={includeSub}
                    className={`ml-auto shrink-0 h-8 md:h-7 px-2.5 rounded-full border text-[11.5px] font-medium
                                cursor-pointer transition-colors duration-150
                        ${includeSub
                        ? "bg-accent text-white border-accent"
                        : "border-border text-muted hover:border-subtle hover:text-foreground"}`}
                >
                    하위 포함
                </button>
            )}
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
/** 이 개수를 넘으면 접은 채로 시작한다. 노트를 보러 온 사람이 폴더를 헤치고 가지 않도록. */
const COLLAPSE_THRESHOLD = 4

export function FolderDrilldown() {
    const {data} = useFolders()
    const {goTo, folderHash, unfiled} = useFolderNavigation()
    const {includeSub} = useFolderUiStore()

    const folders = data?.folders ?? []
    const current = findFolder(folders, folderHash)
    const children = current ? current.children : folders
    const unfiledCount = data?.unfiled_count ?? 0
    const rowCount = children.length + (!current && unfiledCount > 0 ? 1 : 0)

    const [open, setOpen] = useState(false)
    const collapsible = rowCount > COLLAPSE_THRESHOLD

    // 하위 포함을 켜면 그 노트들이 이미 아래 목록에 있으므로 폴더 줄을 또 보여주지 않는다.
    if (unfiled || (includeSub && current)) return null
    if (rowCount === 0) return null

    if (collapsible && !open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className="md:hidden flex items-center gap-2 w-full px-4 h-12 border-b border-border
                           bg-surface cursor-pointer active:bg-background text-left"
            >
                <FiFolder size={15} className="text-accent shrink-0"/>
                <span className="text-[13px] font-medium text-foreground">폴더 {rowCount}개</span>
                <FiChevronDown size={15} className="text-subtle shrink-0 ml-auto"/>
            </button>
        )
    }

    return (
        <div className="md:hidden flex flex-col border-b border-border bg-surface">
            {children.map(folder => (
                <button
                    key={folder.hash_id}
                    onClick={() => goTo(folder.hash_id)}
                    className="flex items-center gap-3 px-4 h-14 border-b border-border last:border-b-0
                               cursor-pointer active:bg-background text-left"
                >
                    <FiFolder size={17} className="text-accent shrink-0"/>
                    <span className="flex-1 min-w-0 truncate text-[14px] font-medium text-foreground">
                        {folder.name}
                    </span>
                    <span className="text-[12px] text-subtle tabular-nums shrink-0">{folder.total_count}</span>
                    <FiChevronRight size={15} className="text-subtle shrink-0"/>
                </button>
            ))}

            {!current && unfiledCount > 0 && (
                <button
                    onClick={() => goTo(null, true)}
                    className="flex items-center gap-3 px-4 h-14 border-b border-border last:border-b-0
                               cursor-pointer active:bg-background text-left"
                >
                    <FiInbox size={17} className="text-subtle shrink-0"/>
                    <span className="flex-1 min-w-0 truncate text-[14px] font-medium text-foreground">미분류</span>
                    <span className="text-[12px] text-subtle tabular-nums shrink-0">{unfiledCount}</span>
                    <FiChevronRight size={15} className="text-subtle shrink-0"/>
                </button>
            )}

            {collapsible && (
                <button
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-center gap-1 h-10 text-[12px] text-muted
                               cursor-pointer active:bg-background"
                >
                    폴더 접기
                    <FiChevronDown size={13} className="rotate-180"/>
                </button>
            )}
        </div>
    )
}
