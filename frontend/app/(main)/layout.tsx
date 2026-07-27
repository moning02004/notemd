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

export default function MainLayout({children}: {
    children: React.ReactNode;
}) {

    const [mounted, setMounted] = useState(false)
    const token = useAuthStore(state => state.token)
    const pathname = usePathname()
    const {isOpen: isSearchOpen, close: closeSearch} = useSearchModalStore()

    useEffect(() => {
        setMounted(true)
    }, [])

    // sessionStorage 기반 토큰은 클라이언트에서만 읽을 수 있어, 하이드레이션이
    // 끝나기 전까지는 서버와 동일하게 "미로그인" 트리를 렌더링해 mismatch를 피한다.
    if (!mounted || !token) return (
        <div className="bg-surface h-screen">
            <Providers>
                {children}
            </Providers>
        </div>
    )

    const isSettingsPage = pathname.startsWith("/settings")
    const isTrashPage = pathname.startsWith("/deleted")

    return (
        <div className="flex h-screen bg-background">
            <Sidebar/>

            <div className="flex flex-col flex-1 min-w-0">
                <Topbar/>
                <div className="flex-1 overflow-y-auto">
                    <Providers>
                        {children}
                    </Providers>
                </div>

                {(!isSettingsPage && !isTrashPage) && (
                    <div className="md:hidden border-t border-border bg-surface">
                        <Bottombar/>
                    </div>
                )}
            </div>

            {isSearchOpen && <SearchModal isOpen={isSearchOpen} onClose={closeSearch}/>}
        </div>
    );
}
