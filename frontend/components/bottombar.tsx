"use client"

import {usePathname, useRouter} from "next/navigation";
import {menuItems} from "@/constants/menus";


export function Bottombar() {
    const router = useRouter();
    const pathname = usePathname()

    return (
        <div className={`flex justify-center gap-3 bg-white p-1 border-r border-[#dedede]`}>
                {
                    menuItems.map((item) => (
                        <div key={item.name}
                             className={`p-3 my-2 cursor-pointer hover:bg-[#dedede]
                                ${pathname === item.path ? "bg-[#d4d4d4]" : "bg-white"}
                             `}
                             onClick={() => router.push(item.path)}>
                            <item.icon className="my-auto" size={24}/>
                        </div>
                    ))
                }
        </div>
    );
}
