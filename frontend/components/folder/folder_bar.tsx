"use client"

import {useState} from "react"
import {useSearchParams} from "next/navigation"
import {useProgressRouter} from "@/hooks/useProgressRouter"
import {FiChevronDown, FiChevronLeft, FiChevronRight, FiFolder} from "react-icons/fi"
import {LuBookText} from "react-icons/lu"
import {useFolders} from "@/hooks/useFolders"
import {useIncludeSub} from "@/hooks/useIncludeSub"
import {findFolder, folderPathLabel, FolderNode} from "@/types/folder"
import {FolderActions} from "@/components/folder/folder_actions"

function useFolderNavigation() {
    const router = useProgressRouter()
    const searchParams = useSearchParams()

    const goTo = (folderHash: string | null) => {
        const next = new URLSearchParams(searchParams.toString())
        next.delete("folder")
        // 예전 '미분류' 화면의 주소(?unfiled=1). 이제 개인 노트(루트)가 그 화면이라 남기지 않는다.
        next.delete("unfiled")
        // 하위 포함은 폴더를 옮겨 다닐 때는 들고 다니고, 루트와 폴더 사이를 오갈 때는 뗀다(둘은 따로 기억한다).
        if (!folderHash || !searchParams.get("folder")) next.delete("include_sub")
        if (folderHash) next.set("folder", folderHash)
        router.push(next.toString() ? `/?${next.toString()}` : "/")
    }

    return {
        goTo,
        folderHash: searchParams.get("folder"),
    }
}

/**
 * 현재 위치를 보여주는 줄.
 *
 * 폴더가 생기면 노트가 어딘가에 묻히므로, 지금 어디를 보고 있고 어떻게 위로
 * 올라가는지가 항상 보여야 한다. 모바일은 화면이 좁아 경로 한 줄과 뒤로만 둔다.
 */
export function FolderBar() {
    const {data} = useFolders()
    const {goTo, folderHash} = useFolderNavigation()
    const [includeSub, setIncludeSub] = useIncludeSub()

    const folders = data?.folders ?? []
    const current = findFolder(folders, folderHash)

    // 개인 노트(루트)에서도 줄을 남긴다. 폴더에 들어갈 때만 생기면 목록이 위아래로
    // 밀리고, 지금 어디를 보고 있는지도 그때만 알 수 있다.
    const atRoot = !current

    const trail: FolderNode[] = []
    let cursor = current
    while (cursor) {
        trail.unshift(cursor)
        cursor = findFolder(folders, cursor.parent_hash)
    }

    const parent = trail.length > 1 ? trail[trail.length - 2] : null
    // 루트는 폴더에 넣지 않은 노트만 보여주므로 그 수만 센다. 하위 포함이면 폴더 안 노트까지 모두.
    const unfiledCount = data?.unfiled_count ?? 0
    const count = current ? current.total_count
        : includeSub ? unfiledCount + folders.reduce((sum, folder) => sum + folder.total_count, 0)
            : unfiledCount

    return (
        <div className="flex items-center gap-1 px-2 md:px-4 h-12 md:h-10 border-b border-border bg-surface">
            {/* 모바일: 한 단계 위로. 손가락이 닿는 크기(44px)를 확보한다. */}
            {!atRoot && (
                <button
                    onClick={() => goTo(parent?.hash_id ?? null)}
                    aria-label={parent ? `${parent.name}(으)로` : "개인 노트로"}
                    className="md:hidden flex items-center justify-center w-9 h-11 -ml-1 rounded-lg text-accent
                               shrink-0 cursor-pointer active:bg-accent-soft"
                >
                    <FiChevronLeft size={19}/>
                </button>
            )}

            {/* 데스크톱: 경로 전체. 사이드바와 같은 아이콘을 붙여 어디인지 한눈에 읽히게 한다. */}
            <nav className="hidden md:flex items-center gap-1 min-w-0 text-[12.5px]" aria-label="폴더 경로">
                {atRoot
                    ? <span className="flex items-center gap-1 font-semibold text-foreground shrink-0">
                        <LuBookText size={12} className="shrink-0"/>
                        개인 노트
                    </span>
                    : <button onClick={() => goTo(null)}
                              className="flex items-center gap-1 text-muted hover:text-accent cursor-pointer shrink-0">
                        <LuBookText size={12} className="shrink-0"/>
                        개인 노트
                    </button>}

                {trail.map((node, index) => (
                    <span key={node.hash_id} className="flex items-center gap-1 min-w-0">
                        <Separator/>
                        {index === trail.length - 1
                            ? <span className="flex items-center gap-1 min-w-0 font-semibold text-foreground">
                                <FiFolder size={12} className="shrink-0"/>
                                <span className="truncate">{node.name}</span>
                            </span>
                            : <button onClick={() => goTo(node.hash_id)}
                                      className="flex items-center gap-1 min-w-0 text-muted hover:text-accent cursor-pointer">
                                <FiFolder size={12} className="shrink-0"/>
                                <span className="truncate">{node.name}</span>
                            </button>}
                    </span>
                ))}
            </nav>

            <span className="md:hidden flex items-center gap-1.5 flex-1 min-w-0 text-[13px] text-muted">
                {atRoot ? <LuBookText size={13} className="shrink-0"/>
                    : <FiFolder size={13} className="shrink-0"/>}
                <span className="truncate tracking-wider">
                    {atRoot ? "/개인 노트" : folderPathLabel(folders, current?.hash_id)}
                </span>
            </span>

            <span className="hidden md:inline text-[11.5px] text-subtle tabular-nums ml-2">{count}개</span>

            {/* 모바일: 지금 보고 있는 폴더를 고친다. 지우면 한 단계 위로 올라간다. */}
            {current && (
                <span className="md:hidden shrink-0">
                    <FolderActions folder={current} onDeleted={() => goTo(parent?.hash_id ?? null)}/>
                </span>
            )}

            {/* 루트에서도 둔다. 켜면 폴더 안 노트까지 모두 보인다. 폴더가 하나도 없으면 달라질 것이 없어 감춘다. */}
            {(current || folders.length > 0) && (
                <button
                    onClick={() => setIncludeSub(!includeSub)}
                    aria-pressed={includeSub}
                    title={atRoot ? "폴더 안의 노트까지 모두 보기" : "하위 폴더의 노트까지 보기"}
                    className={`shrink-0 md:ml-auto h-8 md:h-7 px-2.5 rounded-full border text-[11.5px] font-medium
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

/** 이 개수를 넘으면 접은 채로 시작한다. 노트를 보러 온 사람이 폴더를 헤치고 가지 않도록. */
const COLLAPSE_THRESHOLD = 4

/**
 * 모바일 전용 폴더 줄.
 *
 * 폴더도 노트와 같은 목록에 두되 맨 위에 모은다. 따로 띄운 화면으로 고르게 하면
 * 한 단계가 더 생겨 오히려 번거롭다. 폴더가 많을 때만 접어서 노트를 가리지 않게 한다.
 */
export function FolderDrilldown() {
    const {data} = useFolders()
    const {goTo, folderHash} = useFolderNavigation()
    const [includeSub] = useIncludeSub()

    const folders = data?.folders ?? []
    const current = findFolder(folders, folderHash)
    const children = current ? current.children : folders
    const rowCount = children.length

    const [open, setOpen] = useState(false)
    const collapsible = rowCount > COLLAPSE_THRESHOLD

    // 하위 포함을 켜면 그 노트들이 이미 아래 목록에 있으므로 폴더 줄을 또 보여주지 않는다.
    if (includeSub) return null
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
                <FolderRow
                    key={folder.hash_id}
                    name={folder.name}
                    count={folder.total_count}
                    onClick={() => goTo(folder.hash_id)}
                    actions={<FolderActions folder={folder}/>}
                />
            ))}

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

function FolderRow({name, count, onClick, actions}: {
    name: string
    count: number
    onClick: () => void
    /** 줄 오른쪽 끝의 ⋯ 메뉴(이름 바꾸기·삭제). */
    actions?: React.ReactNode
}) {
    // 메뉴 버튼을 들어가는 버튼 안에 넣을 수 없어(버튼 안의 버튼) 둘을 나란히 둔다.
    return (
        <div className="flex items-center border-b border-border last:border-b-0">
            <button
                onClick={onClick}
                className={`flex flex-1 min-w-0 items-center gap-3 pl-4 h-14 cursor-pointer active:bg-background text-left
                            ${actions ? "pr-1" : "pr-4"}`}
            >
                <FiFolder size={17} className="text-accent shrink-0"/>
                <span className="flex-1 min-w-0 truncate text-[14px] font-medium text-foreground">{name}</span>
                <span className="text-[12px] text-subtle tabular-nums shrink-0">{count}</span>
                <FiChevronRight size={15} className="text-subtle shrink-0"/>
            </button>
            {actions && <span className="shrink-0 pr-1">{actions}</span>}
        </div>
    )
}
