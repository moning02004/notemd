"use client";

import {Sidebar} from "@/components/sidebar";
import {Topbar} from "@/components/topbar";
import {useAuthStore} from "@/store/auth";
import {Bottombar} from "@/components/bottombar";
import {Toaster} from "react-hot-toast";

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
        <div className="flex flex-col h-screen">
            <Topbar/>
            <div className="flex-1  bg-gradient-to-br from-white to-emerald-50 flex-wrap overflow-y-auto">
                {children}
            </div>
            <div className="border-t border-[#dedede] bg-white">
                <div className="w-[80%] mx-auto">
                    <Bottombar/>
                </div>
            </div>
        </div>
    );
}
