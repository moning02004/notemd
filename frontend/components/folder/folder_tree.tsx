"use client"

import {useRouter, useSearchParams} from "next/navigation"
import {useState} from "react"
import {FiChevronRight, FiFolder, FiFolderPlus, FiInbox, FiMoreHorizontal} from "react-icons/fi"
import {useCreateFolder, useDeleteFolder, useFolders, useMoveFolder, useMoveNotes, useRenameFolder} from "@/hooks/useFolders"
import {useFolderUiStore} from "@/store/folderUi"
import {FolderNode} from "@/types/folder"
import {useClickOutside} from "@/hooks/useClickOutside"

/** 드래그 중인 대상. 노트 카드와 폴더 행 양쪽에서 같은 형식을 쓴다. */
type DragPayload = { kind: "note" | "folder", id: string }

export const FOLDER_DRAG_TYPE = "application/x-notemd"

export function readDragPayload(event: React.DragEvent): DragPayload | null {
    try {
        return JSON.parse(event.dataTransfer.getData(FOLDER_DRAG_TYPE)) as DragPayload
    } catch {
        return null
    }
}

export function FolderTree() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const {data} = useFolders()
    const {expanded, toggleExpanded} = useFolderUiStore()

    const createFolder = useCreateFolder()
    const [creating, setCreating] = useState(false)
    const [draftName, setDraftName] = useState("")

    const selected = searchParams.get("folder")
    const unfiledSelected = searchParams.get("unfiled") === "1"

    const goTo = (params: Record<string, string | null>) => {
        const next = new URLSearchParams(searchParams.toString())
        // 폴더를 고르면 태그·검색어는 유지하되 페이지 위치만 초기화한다.
        Object.entries(params).forEach(([key, value]) => {
            if (value === null) next.delete(key)
            else next.set(key, value)
        })
        router.push(next.toString() ? `/?${next.toString()}` : "/")
    }

    const submitDraft = async () => {
        const name = draftName.trim()
        setCreating(false)
        setDraftName("")
        if (name) await createFolder.mutateAsync({name})
    }

    return (
        <div className="flex flex-col gap-0.5 mt-3">
            <div className="flex items-center justify-between px-2 pb-1">
                <span className="text-[10px] font-semibold tracking-wider uppercase text-subtle">폴더</span>
                <button
                    onClick={() => setCreating(true)}
                    aria-label="폴더 추가"
                    className="p-1 rounded text-subtle hover:text-accent hover:bg-accent-soft cursor-pointer
                               transition-colors duration-150"
                >
                    <FiFolderPlus size={13}/>
                </button>
            </div>

            <button
                onClick={() => goTo({folder: null, unfiled: "1"})}
                className={rowClass(unfiledSelected)}
                style={{paddingLeft: 8}}
            >
                <span className="w-3.5 shrink-0"/>
                <FiInbox size={13} className="shrink-0"/>
                <span className="flex-1 truncate text-left">미분류</span>
                <span className="text-[10px] tabular-nums shrink-0">{data?.unfiled_count ?? 0}</span>
            </button>

            {(data?.folders ?? []).map(folder => (
                <FolderRow
                    key={folder.hash_id}
                    folder={folder}
                    selected={selected}
                    expanded={expanded}
                    onToggle={toggleExpanded}
                    onSelect={hashId => goTo({folder: hashId, unfiled: null})}
                />
            ))}

            {creating && (
                <div className="px-2 py-1">
                    <input
                        id="new-folder-name"
                        autoFocus
                        value={draftName}
                        onChange={event => setDraftName(event.target.value)}
                        onBlur={submitDraft}
                        onKeyDown={event => {
                            if (event.key === "Enter") submitDraft()
                            if (event.key === "Escape") {
                                setCreating(false)
                                setDraftName("")
                            }
                        }}
                        placeholder="폴더 이름"
                        className="w-full bg-surface border border-accent rounded-md px-2 py-1 text-[12.5px]
                                   text-foreground outline-none"
                    />
                </div>
            )}

            {!creating && (data?.folders ?? []).length === 0 && (
                <p className="px-2 py-2 text-[11.5px] leading-relaxed text-subtle">
                    아직 폴더가 없습니다. 위 <span className="text-muted">＋</span> 로 만들거나,
                    노트를 여기로 끌어다 놓으세요.
                </p>
            )}
        </div>
    )
}

function rowClass(active: boolean) {
    return `group flex items-center gap-1.5 pr-2 py-1.5 rounded-lg text-[12.5px] font-medium cursor-pointer
            transition-colors duration-150 border border-transparent w-full
            ${active ? "bg-accent-soft text-accent" : "text-muted hover:text-foreground hover:bg-background"}`
}

function FolderRow({folder, selected, expanded, onToggle, onSelect}: {
    folder: FolderNode
    selected: string | null
    expanded: string[]
    onToggle: (hashId: string) => void
    onSelect: (hashId: string) => void
}) {
    const isOpen = expanded.includes(folder.hash_id)
    const hasChildren = folder.children.length > 0
    const isActive = selected === folder.hash_id

    const [dropping, setDropping] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)
    const [renaming, setRenaming] = useState(false)
    const [draftName, setDraftName] = useState(folder.name)

    const menuRef = useClickOutside<HTMLDivElement>(() => setMenuOpen(false))
    const renameFolder = useRenameFolder()
    const moveFolder = useMoveFolder()
    const deleteFolder = useDeleteFolder()
    const moveNotes = useMoveNotes()
    const createFolder = useCreateFolder()
    const {expand} = useFolderUiStore()

    // 접혀 있으면 하위 포함 합계, 펼치면 직속 수. 펼쳤을 때 숫자가 두 번 세어져 보이지 않게 한다.
    const count = hasChildren && isOpen ? folder.note_count : folder.total_count

    const onDrop = async (event: React.DragEvent) => {
        event.preventDefault()
        event.stopPropagation()
        setDropping(false)

        const payload = readDragPayload(event)
        if (!payload) return

        if (payload.kind === "note") {
            await moveNotes.mutateAsync({noteHashes: [payload.id], folder: folder.hash_id})
        } else if (payload.id !== folder.hash_id) {
            await moveFolder.mutateAsync({hashId: payload.id, parent: folder.hash_id})
        }
        expand([folder.hash_id])
    }

    const submitRename = async () => {
        const name = draftName.trim()
        setRenaming(false)
        if (name && name !== folder.name) await renameFolder.mutateAsync({hashId: folder.hash_id, name})
        else setDraftName(folder.name)
    }

    return (
        <>
            <div
                className={`${rowClass(isActive)} ${dropping ? "border-accent bg-accent-soft" : ""}`}
                style={{paddingLeft: 8 + folder.depth * 12}}
                draggable={!renaming}
                onDragStart={event => {
                    event.dataTransfer.setData(FOLDER_DRAG_TYPE,
                        JSON.stringify({kind: "folder", id: folder.hash_id}))
                    event.dataTransfer.effectAllowed = "move"
                }}
                onDragOver={event => {
                    event.preventDefault()
                    event.dataTransfer.dropEffect = "move"
                    setDropping(true)
                }}
                onDragLeave={() => setDropping(false)}
                onDrop={onDrop}
            >
                <button
                    onClick={() => hasChildren && onToggle(folder.hash_id)}
                    aria-label={hasChildren ? (isOpen ? "접기" : "펼치기") : undefined}
                    tabIndex={hasChildren ? 0 : -1}
                    className={`w-3.5 shrink-0 flex items-center justify-center ${hasChildren ? "cursor-pointer" : "invisible"}`}
                >
                    <FiChevronRight
                        size={11}
                        className={`transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`}
                    />
                </button>

                <FiFolder size={13} className="shrink-0"/>

                {renaming ? (
                    <input
                        id={`rename-folder-${folder.hash_id}`}
                        autoFocus
                        value={draftName}
                        onChange={event => setDraftName(event.target.value)}
                        onBlur={submitRename}
                        onKeyDown={event => {
                            if (event.key === "Enter") submitRename()
                            if (event.key === "Escape") {
                                setDraftName(folder.name)
                                setRenaming(false)
                            }
                        }}
                        className="flex-1 min-w-0 bg-surface border border-accent rounded px-1 py-0.5 text-[12.5px]
                                   text-foreground outline-none"
                    />
                ) : (
                    <button onClick={() => onSelect(folder.hash_id)} className="flex-1 min-w-0 text-left truncate cursor-pointer">
                        {folder.name}
                    </button>
                )}

                <span className="relative flex items-center shrink-0" ref={menuRef}>
                    <span className="text-[10px] tabular-nums group-hover:hidden">{count}</span>
                    <button
                        onClick={() => setMenuOpen(open => !open)}
                        aria-label={`${folder.name} 폴더 메뉴`}
                        className="hidden group-hover:flex p-0.5 rounded hover:bg-border cursor-pointer"
                    >
                        <FiMoreHorizontal size={13}/>
                    </button>

                    {menuOpen && (
                        <div className="absolute right-0 top-5 z-30 w-36 bg-surface border border-border rounded-lg
                                        shadow-lg py-1 text-[12.5px]">
                            <MenuItem label="이름 바꾸기" onClick={() => {
                                setMenuOpen(false)
                                setRenaming(true)
                            }}/>
                            <MenuItem label="하위 폴더 추가" disabled={folder.depth >= 2} onClick={async () => {
                                setMenuOpen(false)
                                await createFolder.mutateAsync({name: "새 폴더", parent: folder.hash_id})
                                expand([folder.hash_id])
                            }}/>
                            <MenuItem label="삭제" danger onClick={() => {
                                setMenuOpen(false)
                                if (confirm(`'${folder.name}' 폴더를 지웁니다. 안에 있는 노트는 휴지통으로 갑니다.`)) {
                                    deleteFolder.mutate(folder.hash_id)
                                }
                            }}/>
                        </div>
                    )}
                </span>
            </div>

            {isOpen && folder.children.map(child => (
                <FolderRow
                    key={child.hash_id}
                    folder={child}
                    selected={selected}
                    expanded={expanded}
                    onToggle={onToggle}
                    onSelect={onSelect}
                />
            ))}
        </>
    )
}

function MenuItem({label, onClick, danger, disabled}: {
    label: string
    onClick: () => void
    danger?: boolean
    disabled?: boolean
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`w-full text-left px-3 py-1.5 transition-colors duration-100
                ${disabled ? "text-subtle cursor-not-allowed"
                : danger ? "text-danger hover:bg-danger-soft cursor-pointer"
                    : "text-muted hover:bg-background hover:text-foreground cursor-pointer"}`}
        >
            {label}
        </button>
    )
}
