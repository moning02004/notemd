"use client"

import {usePathname, useRouter} from "next/navigation"
import {menuItems} from "@/constants/menus"
import {FaSearch} from "react-icons/fa"
import {FiX, FiChevronLeft} from "react-icons/fi"
import {SearchModal} from "@/components/search_modal"
import {useEffect, useState} from "react"
import {useNoteSelectStore} from "@/store/noteSelect"
import TopbarMenu from "@/components/topbar_menu";
import {apiRequest} from "@/lib/api";
import {WorkspaceSelector} from "@/components/workspace_selector";

export function Topbar() {
    const pathname = usePathname()
    const router = useRouter();

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

    // 페이지 이동 시 선택 모드 초기화
    useEffect(() => {
        exitSelectMode()
    }, [pathname])

    const isSettingsPage = pathname.startsWith("/settings")
    const isTrashPage = pathname.startsWith("/deleted")
    const topTitle = isSettingsPage ? "설정" : isTrashPage ? "휴지통" : menuItems.find(item => item.path === pathname)?.name ?? ""
    const isAccountPage = isSettingsPage || pathname.startsWith("/my-info")

    const handleSelectMode = () => {
        setMenuOpen(false);
        enterSelectMode()
    }
    const handleGotoTrash = () => {
        router.push("/deleted")
    }
    const handleGotoSettings = () => {
        router.push("/settings")
    }
    const handleBack = () => {
        try {
            router.back()
        } catch (e) {
            window.location.href = "/"
        }
    }

    function handleFileUpload() {
        setMenuOpen(false)

        const input = document.createElement("input")
        input.type = "file"
        input.accept = ".txt,.md"
        input.multiple = true

        input.addEventListener("change", async () => {
            const files = Array.from(input.files ?? [])
            if (files.length === 0) return

            const formData = new FormData()
            files.forEach((file) => formData.append("files", file))

            try {
                const res = await apiRequest.post("/notes/files",
                    {body: formData},
                    {isMime: true}
                )
                window.location.reload()
            } catch (err) {
                console.error(err)
            }
        })

        input.click()
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
                    {(isSettingsPage || isTrashPage) && (
                        <button
                            onClick={handleBack}
                            className="p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
                            aria-label="뒤로 가기"
                        >
                            <FiChevronLeft size={20}/>
                        </button>
                    )}
                    <h3 className="m-0!">{topTitle}</h3>

                    {pathname === "/workspace" && <WorkspaceSelector/>}

                    <div className="ml-auto flex items-center gap-1">

                        {!isAccountPage && (
                            <button
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
                                onClick={() => setIsSearchModalOpen(true)}
                                aria-label="검색"
                            >
                                <FaSearch size={16}/>
                            </button>
                        )}

                        {!isSettingsPage && (
                            <TopbarMenu {...(pathname === "/" && {onFileUpload: handleFileUpload})}
                                        {...(!isAccountPage && {onSelectMode: handleSelectMode})}
                                        {...(pathname === "/" && {gotoTrash: handleGotoTrash})}
                                        {...(isAccountPage && {gotoSettings: handleGotoSettings})}
                                        open={menuOpen}
                                        onToggle={toggleMenu}
                                        onClose={() => setMenuOpen(false)}/>
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