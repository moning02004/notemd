"use client"

import {usePathname} from "next/navigation";
import {menuItems} from "@/constants/menus";
import {FaSearch} from "react-icons/fa";
import {SearchModal} from "@/components/search_modal";
import {useState} from "react";

export function Topbar() {
    const pathname = usePathname();

    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

    const topTitle = menuItems.find(item => item.path === pathname)?.name ?? ""
    return (
        <div className="flex flex-row p-3 px-5 border-b border-[#dedede] gap-3 bg-white min-w-full">
            <h3 className="m-0!">{topTitle}</h3>
            {
                pathname === "/" &&
                <button className="ml-auto cursor-pointer" onClick={() => setIsSearchModalOpen(true)}><FaSearch/></button>
            }

            {isSearchModalOpen && <SearchModal isOpen={isSearchModalOpen} 
                                               onClose={() => setIsSearchModalOpen(false)}/>}
        </div>
    );
}
  