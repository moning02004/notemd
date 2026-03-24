"use client"

import {usePathname} from "next/navigation";
import {menuItems} from "@/constants/menus";

export function Topbar() {
    const pathname = usePathname();

    const topTitle = menuItems.find(item => item.path === pathname)?.name ?? ""
    return (
        <div className="flex flex-row p-3 px-5 border-b border-[#dedede] gap-3 bg-white min-w-full">
            <h3 className="m-0!">{topTitle}</h3>
        </div>
    );
}
  