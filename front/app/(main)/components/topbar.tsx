"use client"

import { useEditStore } from "@/store/editor";
import { usePathname, useRouter } from "next/navigation";
import { FiMoreHorizontal } from "react-icons/fi";

export function Topbar() {
    const pathname = usePathname();
    const router = useRouter();
    const { isOpenedSetting, setOpenedSetting } = useEditStore();

    const resetPage = () => {
        router.push(`/dashboard`);
    }

    function NoteSetting() {
        return (
            <div className="ml-auto my-auto" onClick={() => setOpenedSetting(!isOpenedSetting)}>
                <FiMoreHorizontal size={22} className="cursor-pointer"/>
            </div>
        )
    }

    return (
        <div className="h-10 flex flex-row">
            <select 
                className="min-w-[10%] border border-[#efefef] bg-white rounded outline-none px-3 hover:bg-[#efefef] cursor-pointer"
                onChange={resetPage}
            >
                <option value="">그룹 1</option>
                <option value="">그룹 2</option>
            </select>
            {
                pathname == "/notes/add" && <NoteSetting />
            }
        </div>
    );
  }
  