"use client"

import {useRouter} from "next/navigation";
import {FiLogOut, FiMenu, FiUser, FiX} from "react-icons/fi";
import {useState} from "react";
import {useAuthStore} from "@/store/auth";

export function Topbar() {
    const router = useRouter();
    const {logout} = useAuthStore.getState();

    return (
        <div className="flex flex-row p-3 px-5 border-b border-[#dedede] gap-3 bg-white min-w-full">
            <h3>노트</h3>
            <div className="flex flex-row ml-auto my-auto">
                <div className="ml-3 my-auto cursor-pointer" onClick={() => {
                    logout();
                    router.replace("/login")
                }
                }>
                    <FiLogOut size={24}/>
                </div>
            </div>
        </div>
    );
}
  