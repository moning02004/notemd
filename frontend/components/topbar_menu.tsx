"use client"

import {useRouter} from "next/navigation"
import {BsThreeDotsVertical} from "react-icons/bs"
import {FiCheckSquare, FiUpload} from "react-icons/fi"
import {MdOutlineSettings} from "react-icons/md"
import {GrTrash} from "react-icons/gr";
import {useClickOutside} from "@/hooks/useClickOutside"

interface TopbarMenuProps {
    onFileUpload?: () => void
    onSelectMode: () => void
    gotoSettings: () => void
    gotoTrash: () => void
    open: boolean
    isAccountPage: boolean
    onToggle: () => void
    onClose: () => void
}

export default function TopbarMenu({
                                       onFileUpload,
                                       onSelectMode,
                                       gotoSettings,
                                       gotoTrash,
                                       open,
                                       isAccountPage,
                                       onToggle,
                                       onClose,
                                   }: TopbarMenuProps) {
    const router = useRouter()
    const menuRef = useClickOutside<HTMLDivElement>(onClose, open)

    return (
        <div ref={menuRef} className={`relative ${isAccountPage && "sm:hidden block"}`}>
            <button
                onClick={onToggle}
                className="p-1.5 rounded-lg hover:bg-background transition-colors duration-150 text-muted cursor-pointer"
                aria-label="메뉴 열기"
            >
                <BsThreeDotsVertical size={18}/>
            </button>

            {open && (
                <div
                    className="absolute right-0 top-9 z-50 min-w-[15rem] bg-surface border border-border rounded-xl shadow-lg overflow-hidden">

                    {onFileUpload && <div>
                        <button
                            onClick={() => {
                                onClose();
                                onFileUpload();
                            }}
                            className="w-full flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-background transition-colors duration-100"
                        >
                            <span className="text-muted shrink-0"><FiCheckSquare size={15}/></span>
                            <span className="flex flex-col">
                                <span className="text-foreground font-medium leading-snug">파일 업로드</span>
                                <span
                                    className="text-xs text-subtle leading-snug">업로드 후 자동으로 노트로 변환되며 확인이 필요합니다.</span>
                                </span>
                        </button>
                    </div>}

                    {gotoTrash &&
                        <div>
                            <button
                                onClick={() => {
                                    onClose();
                                    gotoTrash();
                                }}
                                className="w-full flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-background transition-colors duration-100"
                            >
                                <span className="text-muted shrink-0"><GrTrash size={15}/></span>
                                <span className="text-foreground font-medium leading-snug">휴지통</span>
                            </button>
                        </div>
                    }
                    {onSelectMode &&
                        <div>
                            <button
                                onClick={() => {
                                    onClose();
                                    onSelectMode();
                                }}
                                className="w-full flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-background transition-colors duration-100"
                            >
                                <span className="text-muted shrink-0"><FiUpload size={15}/></span>
                                <span className="text-foreground font-medium leading-snug">선택 모드</span>
                            </button>
                        </div>
                    }

                    <div className="h-px bg-border"/>

                    {gotoSettings &&<div>
                        <button
                            onClick={() => {
                                onClose();
                                gotoSettings();
                            }}
                            className="w-full flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-background transition-colors duration-100"
                        >
                            <span className="text-muted shrink-0"><MdOutlineSettings size={15}/></span>
                            <span className="text-foreground font-medium leading-snug">설정</span>
                        </button>
                    </div>}
                </div>
            )}
        </div>
    )
}