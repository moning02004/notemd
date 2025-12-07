"use client"

import {useEditStore} from "@/store/editor";
import {usePathname, useRouter} from "next/navigation";
import {FiUser} from "react-icons/fi";
import {useRef} from "react";
import {useAuthStore} from "@/store/auth";
import {useTopbarStore} from "@/store/topbar";

export function Topbar() {
    const pathname = usePathname();
    const groupSelectRef = useRef<HTMLSelectElement>(null)
    const router = useRouter();
    const {isOpenedSetting, setOpenedSetting} = useEditStore();
    const {groups, totalCount, count} = useTopbarStore.getState();
    const {logout} = useAuthStore.getState();

    const loadNotes = () => {
        if (!groupSelectRef.current) return;
        router.replace(`/groups/${groupSelectRef.current.value}`);
    }

    return (
        <div className="flex flex-row p-3 px-5 border-b border-[#dedede] gap-3 bg-white">
            <select
                className="min-w-[10%] p-2 border border-[#efefef] bg-white rounded outline-none px-3 hover:bg-[#efefef] cursor-pointer"
                onChange={loadNotes}
                ref={groupSelectRef}
            >
                {
                    groups.map((group) => (
                        <option key={group.hash_id} value={group.hash_id} selected={pathname == `/groups/${group.hash_id}`}>
                            {group.name}
                        </option>
                    ))
                }
            </select>
            <div className="my-auto">
                {count} / {totalCount}
            </div>
            <div className="ml-auto my-auto">
                <FiUser size={22} className="cursor-pointer group"/>
                <div className="border rounded-md px-2 outline-none flex flex-col absolute bg-white mt-2 right-2">
                    <div className="p-2 hover:bg-gray-100 cursor-pointer">프로필</div>
                    <div onClick={logout} className="p-2 hover:bg-gray-100 cursor-pointer">로그아웃</div>
                </div>
            </div>
        </div>
    );
}
  