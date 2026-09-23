"use client"

import {useState} from "react"
import {FiDownload, FiFolder, FiTrash2} from "react-icons/fi"
import {Spinner} from "@/components/icons"

type Action = () => void | Promise<void>

interface SelectActionBarProps {
    selectedCount: number
    onMove?: Action
    onDownload?: Action
    onRestore?: Action
    onDelete?: Action
}

export default function SelectActionBar({
                                            selectedCount,
                                            onMove,
                                            onDownload,
                                            onRestore,
                                            onDelete,
                                        }: SelectActionBarProps) {
    const disabled = selectedCount === 0

    return (
        <div
            className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border px-4 py-4 flex items-center gap-2 z-40 safe-area-inset-bottom">
            {onMove && <ActionBtn
                icon={<FiFolder size={16}/>}
                label="이동"
                onClick={onMove}
                disabled={disabled}
            />}
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
    onClick: Action
    disabled: boolean
    danger?: boolean
}) {
    // 다운로드나 삭제는 서버를 한 번 다녀온다. 그동안 버튼이 그대로면 눌리지 않은 줄 안다.
    const [busy, setBusy] = useState(false)

    const run = async () => {
        if (busy) return
        setBusy(true)
        try {
            await onClick()
        } finally {
            setBusy(false)
        }
    }

    return (
        <button
            onClick={run}
            disabled={disabled || busy}
            className={`
                flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg
                text-sm font-medium border transition-all duration-150
                ${disabled || busy
                ? "opacity-35 cursor-not-allowed border-border text-subtle"
                : danger
                    ? "border-danger text-danger hover:bg-danger-soft active:scale-[0.97]"
                    : "border-border text-muted hover:bg-background active:scale-[0.97]"
            }
            `}
        >
            {busy ? <Spinner size={16}/> : icon}
            {label}
        </button>
    )
}