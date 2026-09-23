"use client";

import {useEffect, useState} from "react";
import {Topbar} from "@/components/topbar";
import {useAuthStore} from "@/store/auth";
import {Sidebar} from "@/components/sidebar";
import {Bottombar} from "@/components/bottombar";
import {Providers} from "@/app/(main)/providers";
import {usePathname} from "next/navigation";
import {useSearchModalStore} from "@/store/searchModal";
import {SearchModal} from "@/components/search_modal";
import {MoveNotesSheet} from "@/components/folder/move_notes_sheet";
import {useMoveSheetStore} from "@/store/moveSheet";
import {AppShellSkeleton} from "@/components/skeleton";

export default function MainLayout({children}: {
    children: React.ReactNode;
}) {

    const [mounted, setMounted] = useState(false)
    const token = useAuthStore(state => state.token)
    const pathname = usePathname()
    const {isOpen: isSearchOpen, close: closeSearch} = useSearchModalStore()
    const moveSheet = useMoveSheetStore()

    useEffect(() => {
        setMounted(true)
    }, [])

    // sessionStorage 기반 토큰은 클라이언트에서만 읽을 수 있다. 하이드레이션 전에 화면을
    // 그리면 서버('미로그인')와 어긋나 트리를 통째로 다시 그리느라 한 번 번쩍인다.
    // 양쪽이 똑같이 그릴 수 있는 뼈대를 먼저 보여준다.
    if (!mounted) return <AppShellSkeleton/>

    if (!token) return (
        <div className="bg-surface h-screen">
            <Providers>
                {children}
            </Providers>
        </div>
    )

    const isSettingsPage = pathname.startsWith("/settings")
    const isTrashPage = pathname.startsWith("/deleted")

    return (
        <Providers>
            <div className="flex h-screen bg-background">
                <Sidebar/>

                <div className="flex flex-col flex-1 min-w-0">
                    <Topbar/>
                    <div className="flex-1 overflow-y-auto">
                        {children}
                    </div>

                    {(!isSettingsPage && !isTrashPage) && (
                        <div className="md:hidden border-t border-border bg-surface">
                            <Bottombar/>
                        </div>
                    )}
                </div>

                    <SearchModal isOpen={isSearchOpen} onClose={closeSearch}/>

                <MoveNotesSheet
                    open={moveSheet.open}
                    onClose={moveSheet.closeSheet}
                    noteHashes={moveSheet.noteHashes}
                    currentFolder={moveSheet.currentFolder}
                    onMoved={moveSheet.onMoved}
                />
            </div>
        </Providers>
    );
}
