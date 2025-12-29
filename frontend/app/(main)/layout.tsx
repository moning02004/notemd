"use client";

import {Sidebar} from "@/components/sidebar";
import {Topbar} from "@/components/topbar";
import {useAuthStore} from "@/store/auth";
import {Bottombar} from "@/components/bottombar";

export default function MainLayout({children}: {
    children: React.ReactNode;
}) {

    const {token} = useAuthStore.getState();

    if (!token) return (
        <div className="bg-white h-screen">
            {children}
        </div>
    )

    return (
        <>
            <div className="flex flex-row">
                <div className="w-0 md:w-auto">
                    <Sidebar/>
                </div>
                <div className="flex flex-col flex-1">
                    <Topbar/>
                    {children}
                    <div className="border-t md:h-0 ">
                        <Bottombar/>
                    </div>

                </div>
            </div>
        </>
    );
}
