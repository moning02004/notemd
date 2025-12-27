"use client"

import {usePathname, useRouter} from "next/navigation";
import {FiMenu} from "react-icons/fi";
import {useMenuStore} from "@/store/menu";
import {menuItems} from "@/constants/menus";


export function Sidebar() {
    const router = useRouter();
    const pathname = usePathname()
    const isOpen = useMenuStore((state) => state.isOpen);
    const setIsOpen = useMenuStore((state) => state.setIsOpen);

    return (
        <div className={`flex flex-col pt-4 gap-3 bg-white p-1 h-screen border-r border-[#dedede]
          ${isOpen ? "w-[40vw]  md:w-[12vw]" : "w-[15vw] md:w-[4vw]"}`}>
            <div className="pl-3">
                <FiMenu className="cursor-pointer" size={24} onClick={() => setIsOpen(!isOpen)}/>
            </div>

            <div className="mt-4">
                {
                    menuItems.map((item) => (
                        <div key={item.name}
                             className={`flex flex-row p-3 my-2 cursor-pointer hover:bg-[#dedede]
                                ${isOpen ? "" : "justify-center"}
                                ${pathname === item.path ? "bg-[#d4d4d4]" : "bg-white"}
                             `}
                             onClick={() => router.push(item.path)}>
                            <item.icon className="my-auto" size={isOpen ? 18 : 24}/>
                            {isOpen && <div className={`
                                    pl-4 ${isOpen ? "w-[40vw]  md:w-[12vw]" : "w-[15vw] md:w-[4vw]"}
                            `}>{item.name}</div>}
                        </div>
                    ))
                }
            </div>
        </div>
    );
}
