"use client";

import {Sidebar} from "@/components/sidebar";
import {Topbar} from "@/components/topbar";

export default function MainLayout({children}: {
    children: React.ReactNode;
}) {
    console.log(children)

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
