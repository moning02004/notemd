"use client";

import {Topbar} from "@/components/topbar";
import {useAuthStore} from "@/store/auth";
import {Bottombar} from "@/components/bottombar";
import {Providers} from "@/app/(main)/providers";
import {usePathname} from "next/navigation";

export default function MainLayout({children}: {
    children: React.ReactNode;
}) {

    const {token} = useAuthStore.getState();
    const pathname = usePathname()

    if (!token) return (
        <div className="bg-white h-screen">
            <Providers>
                {children}
            </Providers>
        </div>
    )

    const isSettingsPage = pathname.startsWith("/settings")
    const isTrashPage = pathname.startsWith("/deleted")

    return (
        <div className="flex flex-col h-screen">
            <Topbar/>
            <div className="flex-1  bg-gradient-to-br from-white to-emerald-50 flex-wrap overflow-y-auto">
                <Providers>
                    {children}
                </Providers>
            </div>

            {(!isSettingsPage && !isTrashPage) && (<div className="border-t border-[#dedede] bg-white">
                <div className="w-[80%] mx-auto">
                    <Bottombar/>
                </div>
            </div>)}

        </div>
    );
}
