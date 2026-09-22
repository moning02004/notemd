"use client"

import {useEffect, useState} from "react"
import {FiArrowLeft, FiChevronRight, FiFolder, FiInbox, FiLayers} from "react-icons/fi"
import {Modal} from "@/components/ui/modal"
import {useFolders} from "@/hooks/useFolders"
import {findFolder, FolderNode} from "@/types/folder"

interface Props {
    isOpen: boolean
    onClose: () => void
    /** 지금 보고 있는 폴더. 목록에 현재 위치로 표시한다. */
    currentFolder: string | null
    unfiled: boolean
    /** 폴더를 고르면 호출된다. hashId 가 null 이면 미분류, undefined 면 개인 노트 전체. */
    onSelect: (target: { folder: string | null, unfiled: boolean }) => void
}

/**
 * 모바일에서 폴더를 고르는 전체 화면.
 *
 * 목록 위에 폴더 줄을 펼쳐두면 노트를 보러 온 사람이 폴더를 헤치고 지나가야 한다.
 * 검색과 같은 방식으로 따로 띄우고, 고르면 닫힌다.
 * 행을 누르면 그 폴더를 보고, 오른쪽 화살표를 누르면 하위로 들어간다.
 */
export function FolderBrowser({isOpen, onClose, currentFolder, unfiled, onSelect}: Props) {
    const {data} = useFolders(isOpen)
    const [level, setLevel] = useState<string | null>(null)

    // 열 때마다 지금 보고 있는 폴더의 부모에서 시작하면 한 번 덜 누른다.
    useEffect(() => {
        if (!isOpen) return
        const current = findFolder(data?.folders ?? [], currentFolder)
        setLevel(current?.parent_hash ?? null)
    }, [isOpen, currentFolder, data])

    const folders = data?.folders ?? []
    const parentNode = findFolder(folders, level)
    const rows: FolderNode[] = parentNode ? parentNode.children : folders

    const goBack = () => {
        if (!parentNode) onClose()
        else setLevel(parentNode.parent_hash)
    }

    const pick = (target: { folder: string | null, unfiled: boolean }) => {
        onSelect(target)
        onClose()
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} slide
               className="md:hidden w-full h-full">
            <div className="flex items-center gap-1 px-2 h-14 border-b border-border shrink-0">
                <button
                    onClick={goBack}
                    aria-label={parentNode ? "상위 폴더로" : "닫기"}
                    className="w-11 h-11 flex items-center justify-center rounded-lg text-foreground
                               cursor-pointer active:bg-background"
                >
                    <FiArrowLeft size={20}/>
                </button>
                <span className="flex-1 min-w-0 truncate text-[15px] font-semibold text-foreground">
                    {parentNode ? parentNode.name : "폴더"}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain">
                {/* 최상위에서만: 필터를 푸는 길과 미분류 */}
                {!parentNode && (
                    <>
                        <Row
                            icon={<FiLayers size={18} className="text-muted"/>}
                            label="개인 노트 전체"
                            active={!currentFolder && !unfiled}
                            onSelect={() => pick({folder: null, unfiled: false})}
                        />
                        <Row
                            icon={<FiInbox size={18} className="text-muted"/>}
                            label="미분류"
                            count={data?.unfiled_count ?? 0}
                            active={unfiled}
                            onSelect={() => pick({folder: null, unfiled: true})}
                        />
                    </>
                )}

                {parentNode && (
                    <Row
                        icon={<FiFolder size={18} className="text-accent"/>}
                        label={`${parentNode.name} 전체`}
                        count={parentNode.total_count}
                        active={currentFolder === parentNode.hash_id}
                        onSelect={() => pick({folder: parentNode.hash_id, unfiled: false})}
                    />
                )}

                {rows.map(folder => (
                    <Row
                        key={folder.hash_id}
                        icon={<FiFolder size={18} className="text-accent"/>}
                        label={folder.name}
                        count={folder.total_count}
                        active={currentFolder === folder.hash_id}
                        onSelect={() => pick({folder: folder.hash_id, unfiled: false})}
                        onDrillDown={folder.children.length ? () => setLevel(folder.hash_id) : undefined}
                    />
                ))}

                {rows.length === 0 && parentNode && (
                    <p className="px-4 py-6 text-[13px] text-subtle">하위 폴더가 없습니다.</p>
                )}
            </div>
        </Modal>
    )
}

function Row({icon, label, count, active, onSelect, onDrillDown}: {
    icon: React.ReactNode
    label: string
    count?: number
    active?: boolean
    onSelect: () => void
    onDrillDown?: () => void
}) {
    return (
        <div className={`flex items-center border-b border-border ${active ? "bg-accent-soft" : ""}`}>
            <button
                onClick={onSelect}
                className="flex items-center gap-3 flex-1 min-w-0 h-14 px-4 text-left cursor-pointer
                           active:bg-background"
            >
                <span className="shrink-0">{icon}</span>
                <span className={`flex-1 min-w-0 truncate text-[14px] ${active ? "text-accent font-semibold" : "text-foreground"}`}>
                    {label}
                </span>
                {count !== undefined && (
                    <span className="shrink-0 text-[12px] text-subtle tabular-nums">{count}</span>
                )}
            </button>

            {/* 하위로 들어가는 길은 따로 둔다. 행 전체를 드릴다운에 쓰면 그 폴더 자체를 볼 수 없다. */}
            {onDrillDown && (
                <button
                    onClick={onDrillDown}
                    aria-label={`${label} 하위 폴더 보기`}
                    className="w-12 h-14 flex items-center justify-center border-l border-border
                               text-subtle cursor-pointer active:bg-background"
                >
                    <FiChevronRight size={18}/>
                </button>
            )}
        </div>
    )
}
