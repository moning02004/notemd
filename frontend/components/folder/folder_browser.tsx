"use client"

import {useEffect, useRef, useState} from "react"
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
    onSelect: (target: { folder: string | null, unfiled: boolean }) => void
}

/**
 * 모바일에서 폴더를 고르는 전체 화면.
 *
 * 목록 위에 폴더 줄을 펼쳐두면 노트를 보러 온 사람이 폴더를 헤치고 지나가야 한다.
 * 검색과 같은 방식으로 따로 띄운다.
 *
 * 행을 누르면 '그 폴더로 간다' 하나만 한다. 뒤의 노트 목록이 곧바로 그 폴더로 바뀌고,
 * 하위 폴더가 있으면 화면에 남아 더 들어갈 수 있게, 없으면 닫는다.
 * 한 행에 두 가지 일(선택/드릴다운)을 담으면 무엇이 눌렸는지 알 수 없고,
 * 무엇보다 › 가 붙은 행은 '누르면 안으로 들어간다'는 뜻으로 읽히기 때문이다.
 */
export function FolderBrowser({isOpen, onClose, currentFolder, unfiled, onSelect}: Props) {
    const {data} = useFolders(isOpen)
    const [level, setLevel] = useState<string | null>(null)

    // 열 때 '한 번만' 지금 보고 있는 폴더의 부모에서 시작한다. 형제 폴더로 옮기기 쉽다.
    // 매번 맞추면 폴더를 골라 currentFolder 가 바뀔 때마다 보고 있던 단계가 초기화돼
    // 하위로 내려갈 수가 없다. 폴더 목록이 도착한 뒤에 한 번 잡는다.
    const positioned = useRef(false)
    useEffect(() => {
        if (!isOpen) {
            positioned.current = false
            return
        }
        if (positioned.current || !data) return
        positioned.current = true
        setLevel(findFolder(data.folders, currentFolder)?.parent_hash ?? null)
    }, [isOpen, data, currentFolder])

    const folders = data?.folders ?? []
    const parentNode = findFolder(folders, level)
    const rows: FolderNode[] = parentNode ? parentNode.children : folders

    const goBack = () => {
        if (!parentNode) onClose()
        else setLevel(parentNode.parent_hash)
    }

    const enter = (folder: FolderNode) => {
        onSelect({folder: folder.hash_id, unfiled: false})
        // 더 내려갈 곳이 없으면 화면에 남을 이유가 없다.
        if (folder.children.length) setLevel(folder.hash_id)
        else onClose()
    }

    const pick = (target: { folder: string | null, unfiled: boolean }) => {
        onSelect(target)
        onClose()
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} slide className="md:hidden w-full h-full">
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
                {/* 하위 폴더까지 들어와 있을 때, 그 폴더를 보면서 화면만 닫는 길 */}
                {parentNode && (
                    <button
                        onClick={onClose}
                        className="h-11 px-3 rounded-lg text-[14px] font-semibold text-accent
                                   cursor-pointer active:bg-accent-soft"
                    >
                        완료
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain">
                {!parentNode && (
                    <>
                        <Row
                            icon={<FiLayers size={18} className="text-muted"/>}
                            label="개인 노트 전체"
                            active={!currentFolder && !unfiled}
                            onClick={() => pick({folder: null, unfiled: false})}
                        />
                        <Row
                            icon={<FiInbox size={18} className="text-muted"/>}
                            label="미분류"
                            count={data?.unfiled_count ?? 0}
                            active={unfiled}
                            onClick={() => pick({folder: null, unfiled: true})}
                        />
                    </>
                )}

                {rows.map(folder => (
                    <Row
                        key={folder.hash_id}
                        icon={<FiFolder size={18} className="text-accent"/>}
                        label={folder.name}
                        count={folder.total_count}
                        active={currentFolder === folder.hash_id}
                        hasChildren={folder.children.length > 0}
                        onClick={() => enter(folder)}
                    />
                ))}

                {rows.length === 0 && parentNode && (
                    <p className="px-4 py-6 text-[13px] text-subtle">하위 폴더가 없습니다.</p>
                )}
            </div>
        </Modal>
    )
}

function Row({icon, label, count, active, hasChildren, onClick}: {
    icon: React.ReactNode
    label: string
    count?: number
    active?: boolean
    hasChildren?: boolean
    onClick: () => void
}) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-3 w-full h-14 px-4 text-left border-b border-border
                        cursor-pointer active:bg-background ${active ? "bg-accent-soft" : ""}`}
        >
            <span className="shrink-0">{icon}</span>
            <span className={`flex-1 min-w-0 truncate text-[14px] ${active ? "text-accent font-semibold" : "text-foreground"}`}>
                {label}
            </span>
            {count !== undefined && (
                <span className="shrink-0 text-[12px] text-subtle tabular-nums">{count}</span>
            )}
            {/* 관습대로 '더 들어갈 곳이 있다'는 표시로만 쓴다. */}
            <span className="w-4 shrink-0 flex justify-end">
                {hasChildren && <FiChevronRight size={16} className="text-subtle"/>}
            </span>
        </button>
    )
}
