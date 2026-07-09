"use client"

import {usePathname, useRouter} from "next/navigation";
import {menuItems} from "@/constants/menus";


export function Bottombar() {
    const router = useRouter();
    const pathname = usePathname()

    return (
        <div className={`flex gap-2 p-2 bg-white border-t border-gray-200`}>
            {
                menuItems.map((item) => (
                    <div key={item.name}
                         className={`flex-1 py-3 rounded-lg cursor-pointer transition-colors duration-200
                                ${pathname === item.path ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"}
                             `}
                         onClick={() => router.push(item.path)}>
                        <item.icon className="m-auto" size={24}/>
                    </div>
                ))
            }
        </div>
    );
}