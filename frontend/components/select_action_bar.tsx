"use client"

import {FiDownload, FiTrash2, FiShare2} from "react-icons/fi"

interface SelectActionBarProps {
    selectedCount: number
    onDownload: () => void
    onDelete: () => void
    onShare: () => void
}

export default function SelectActionBar({
    selectedCount,
    onDownload,
    onDelete,
    onShare,
}: SelectActionBarProps) {
    const disabled = selectedCount === 0

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 flex items-center gap-2 z-40 safe-area-inset-bottom">
            <ActionBtn
                icon={<FiDownload size={16}/>}
                label="다운로드"
                onClick={onDownload}
                disabled={disabled}
            />
            <ActionBtn
                icon={<FiShare2 size={16}/>}
                label="공유"
                onClick={onShare}
                disabled={disabled}
            />
            <ActionBtn
                icon={<FiTrash2 size={16}/>}
                label="삭제"
                onClick={onDelete}
                disabled={disabled}
                danger
            />
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
                    ? "opacity-35 cursor-not-allowed border-gray-200 text-gray-400"
                    : danger
                        ? "border-red-200 text-red-600 hover:bg-red-50 active:scale-[0.97]"
                        : "border-gray-200 text-gray-700 hover:bg-gray-50 active:scale-[0.97]"
                }
            `}
        >
            {icon}
            {label}
        </button>
    )
}