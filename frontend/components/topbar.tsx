"use client"

import {usePathname} from "next/navigation"
import {menuItems} from "@/constants/menus"
import {FaSearch} from "react-icons/fa"
import {FiUpload, FiDownload, FiCheckSquare, FiX} from "react-icons/fi"
import {BsThreeDotsVertical} from "react-icons/bs"
import {SearchModal} from "@/components/search_modal"
import {useEffect, useRef, useState} from "react"
import {useNoteSelectStore} from "@/store/noteSelect"

export function Topbar() {
    const pathname = usePathname()
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)

    const {
        selectMode,
        selectedIds,
        menuOpen,
        enterSelectMode,
        exitSelectMode,
        selectAll,
        toggleMenu,
        setMenuOpen,
    } = useNoteSelectStore()

    const menuRef = useRef<HTMLDivElement>(null)

    // 외부 클릭 시 메뉴 닫기
    useEffect(() => {
        if (!menuOpen) return
        function handler(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false)
            }
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [menuOpen])

    // 페이지 이동 시 선택 모드 초기화
    useEffect(() => {
        exitSelectMode()
    }, [pathname])

    const topTitle = menuItems.find(item => item.path === pathname)?.name ?? ""
    const isNotePage = pathname === "/"

    function handleFileUpload() {
        setMenuOpen(false)
        // TODO: 파일 선택 → 노트 변환
    }

    function handleDownloadAll() {
        setMenuOpen(false)
        // TODO: 전체 노트 다운로드
    }

    return (
        <div className="flex flex-row p-3 px-5 border-b border-[#dedede] gap-3 bg-white min-w-full items-center">

            {/* 선택 모드: 타이틀 대신 카운트 표시 */}
            {selectMode ? (
                <>
                    <button
                        onClick={exitSelectMode}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                        aria-label="선택 모드 종료"
                    >
                        <FiX size={18}/>
                    </button>
                    <span className="text-sm text-gray-500 font-medium">
                        {selectedIds.size}개 선택됨
                    </span>
                    <button
                        onClick={() => {
                            // page.tsx에서 notes 목록을 store에 넣어두고 selectAll 호출
                            // 여기선 store의 selectAll 시그니처만 맞춰둠
                            // → page.tsx의 allNoteIds를 store에서 읽어 처리
                            console.log(Array.from(document.querySelectorAll("[data-note-id]"))
                                    .map(el => el.getAttribute("data-note-id")!))
                            useNoteSelectStore.getState().selectAll(
                                Array.from(document.querySelectorAll("[data-note-id]"))
                                    .map(el => el.getAttribute("data-note-id")!)
                            )
                        }}
                        className="ml-auto text-sm text-emerald-600 font-medium px-3 py-1 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                    >
                        전체 선택
                    </button>
                </>
            ) : (
                <>
                    <h3 className="m-0!">{topTitle}</h3>

                    <div className="ml-auto flex items-center gap-1">
                        {/* 검색 버튼 (노트 페이지만) */}
                        {isNotePage && (
                            <button
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
                                onClick={() => setIsSearchModalOpen(true)}
                                aria-label="검색"
                            >
                                <FaSearch size={16}/>
                            </button>
                        )}

                        {/* ⋮ 메뉴 (노트 페이지만) */}
                        {isNotePage && (
                            <div ref={menuRef} className="relative">
                                <button
                                    onClick={toggleMenu}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
                                    aria-label="더보기 메뉴"
                                >
                                    <BsThreeDotsVertical size={18}/>
                                </button>

                                {menuOpen && (
                                    <div className="absolute right-0 top-9 z-50 min-w-[190px] bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                                        <MenuItem
                                            icon={<FiUpload size={15}/>}
                                            label="파일로 노트 만들기"
                                            sub="PDF, 이미지 등"
                                            onClick={handleFileUpload}
                                        />
                                        <div className="h-px bg-gray-100 mx-3"/>
                                        <MenuItem
                                            icon={<FiDownload size={15}/>}
                                            label="전체 다운로드"
                                            onClick={handleDownloadAll}
                                        />
                                        <div className="h-px bg-gray-100 mx-3"/>
                                        <MenuItem
                                            icon={<FiCheckSquare size={15}/>}
                                            label="선택 모드"
                                            onClick={() => { setMenuOpen(false); enterSelectMode() }}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}

            {isSearchModalOpen && (
                <SearchModal
                    isOpen={isSearchModalOpen}
                    onClose={() => setIsSearchModalOpen(false)}
                />
            )}
        </div>
    )
}

function MenuItem({icon, label, sub, onClick}: {
    icon: React.ReactNode
    label: string
    sub?: string
    onClick: () => void
}) {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors duration-100"
        >
            <span className="text-gray-500 shrink-0">{icon}</span>
            <span className="flex flex-col">
                <span className="text-gray-800 font-medium leading-snug">{label}</span>
                {sub && <span className="text-xs text-gray-400 leading-snug">{sub}</span>}
            </span>
        </button>
    )
}