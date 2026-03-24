"use client"

import {usePathname, useRouter} from "next/navigation";
import {menuItems} from "@/constants/menus";


export function Bottombar() {
    const router = useRouter();
    const pathname = usePathname()

    return (
        <div className={`flex gap-3 p-1`}>
            {
                menuItems.map((item) => (
                    <div key={item.name}
                         className={`flex-1 p-3 my-2 cursor-pointer hover:bg-[#dedede] pr-3
                                ${pathname === item.path ? "bg-[#d4d4d4]" : "bg-white"}
                             `}
                         onClick={() => router.push(item.path)}>
                        <item.icon className="m-auto" size={24}/>
                    </div>
                ))
            }
        </div>
    );
}
