"use client"

import {useEffect, useRef} from "react"
import {BsThreeDotsVertical} from "react-icons/bs"
import {FiUpload, FiDownload, FiCheckSquare} from "react-icons/fi"

interface TopbarMenuProps {
    onFileUpload: () => void
    onDownloadAll: () => void
    onSelectMode: () => void
    open: boolean
    onToggle: () => void
    onClose: () => void
}

export default function TopbarMenu({
    onFileUpload,
    onDownloadAll,
    onSelectMode,
    open,
    onToggle,
    onClose,
}: TopbarMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose()
            }
        }
        if (open) document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [open, onClose])

    const items = [
        {
            icon: <FiUpload size={15}/>,
            label: "파일 업로드",
            sub: "txt, PDF, 이미지 등",
            onClick: () => { onClose(); onFileUpload() },
        },
        {
            icon: <FiDownload size={15}/>,
            label: "전체 다운로드",
            onClick: () => { onClose(); onDownloadAll() },
        },
        {
            icon: <FiCheckSquare size={15}/>,
            label: "선택 모드",
            onClick: () => { onClose(); onSelectMode() },
        },
    ]

    return (
        <div ref={menuRef} className="relative">
            <button
                onClick={onToggle}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-150 text-gray-600 cursor-pointer"
                aria-label="메뉴 열기"
            >
                <BsThreeDotsVertical size={18}/>
            </button>

            {open && (
                <div className="absolute right-0 top-9 z-50 min-w-[180px] bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {items.map((item, i) => (
                        <div key={i}>
                            {i > 0 && <div className="h-px bg-gray-100 mx-3"/>}
                            <button
                                onClick={item.onClick}
                                className="w-full flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors duration-100"
                            >
                                <span className="text-gray-500 shrink-0">{item.icon}</span>
                                <span className="flex flex-col">
                                    <span className="text-gray-800 font-medium leading-snug">{item.label}</span>
                                    {item.sub && (
                                        <span className="text-xs text-gray-400 leading-snug">{item.sub}</span>
                                    )}
                                </span>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}