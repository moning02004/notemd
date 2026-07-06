"use client"

import {useEffect, useRef} from "react"
import {BsThreeDotsVertical} from "react-icons/bs"
import {FiCheckSquare, FiUpload} from "react-icons/fi"

interface TopbarMenuProps {
    onFileUpload?: () => void
    onSelectMode: () => void
    open: boolean
    onToggle: () => void
    onClose: () => void
}

export default function TopbarMenu({
                                       onFileUpload,
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
                <div
                    className="absolute right-0 top-9 z-50 min-w-[15rem] bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">

                    {onFileUpload && <div>
                        <button
                            onClick={() => {
                                onClose();
                                onFileUpload();
                            }}
                            className="w-full flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors duration-100"
                        >
                            <span className="text-gray-500 shrink-0"><FiCheckSquare size={15}/></span>
                            <span className="flex flex-col">
                                <span className="text-gray-800 font-medium leading-snug">파일 업로드</span>
                                <span
                                    className="text-xs text-gray-400 leading-snug">업로드 후 자동으로 노트로 변환되며 확인이 필요합니다.</span>
                                </span>
                        </button>
                    </div>}

                    <div>
                        <button
                            onClick={() => {
                                onClose();
                                onSelectMode();
                            }}
                            className="w-full flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors duration-100"
                        >
                            <span className="text-gray-500 shrink-0"><FiUpload size={15}/></span>
                            <span className="text-gray-800 font-medium leading-snug">선택 모드</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}