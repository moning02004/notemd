"use client";

import {Sidebar} from "@/components/sidebar";
import {Topbar} from "@/components/topbar";
import {useAuthStore} from "@/store/auth";

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
                <Sidebar/>
                <div className="flex flex-col flex-1">
                    <Topbar/>
                    {children}
                </div>
            </div>
        </>
    );
}
