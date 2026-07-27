"use client"

import {FiDownload, FiTrash2} from "react-icons/fi"

interface SelectActionBarProps {
    selectedCount: number
    onDownload?: () => void
    onRestore?: () => void
    onDelete?: () => void
}

export default function SelectActionBar({
                                            selectedCount,
                                            onDownload,
                                            onRestore,
                                            onDelete,
                                        }: SelectActionBarProps) {
    const disabled = selectedCount === 0

    return (
        <div
            className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border px-4 py-4 flex items-center gap-2 z-40 safe-area-inset-bottom">
            {onDownload && <ActionBtn
                icon={<FiDownload size={16}/>}
                label="다운로드"
                onClick={onDownload}
                disabled={disabled}
            />}
            {onRestore && <ActionBtn
                icon={<FiTrash2 size={16}/>}
                label="복구"
                onClick={onRestore}
                disabled={disabled}
                danger
            />}
            {onDelete && <ActionBtn
                icon={<FiTrash2 size={16}/>}
                label="삭제"
                onClick={onDelete}
                disabled={disabled}
                danger
            />}
        </div>
    )
}

function ActionBtn({
                       icon,
                       label,
                       onClick,
                       disabled,
                       danger,
                   }: {
    icon: React.ReactNode
    label: string
    onClick: () => void
    disabled: boolean
    danger?: boolean
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
                flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg
                text-sm font-medium border transition-all duration-150
                ${disabled
                ? "opacity-35 cursor-not-allowed border-border text-subtle"
                : danger
                    ? "border-danger text-danger hover:bg-danger-soft active:scale-[0.97]"
                    : "border-border text-muted hover:bg-background active:scale-[0.97]"
            }
            `}
        >
            {icon}
            {label}
        </button>
    )
}