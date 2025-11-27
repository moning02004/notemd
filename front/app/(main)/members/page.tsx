"use client"

import { useRouter } from "next/navigation";
import { FiDelete, FiEdit, FiTrash, FiX } from "react-icons/fi";

const mockupMembers = [
    {name: "유정훈", role: "소유자"},
    {name: "사용자1", role: "멤버"},
    {name: "사용자1", role: "멤버"},
    {name: "사용자1", role: "멤버"},
    {name: "사용자1", role: "멤버"},
]

export default function() {
    const router = useRouter();

    const gotoNote = (teamId: string) => {
        router.push(`/team/${teamId}`);
    }

    return (
        <div className=" h-[100%]">
            <div className="flex flex-col w-[90%] mx-auto mt-3">
                {mockupMembers.map((x, index) => {
                    return (
                        <div 
                            className="group flex flex-row py-3 border-b border-[#ededed]"
                            key={index}
                        >
                            <div className="flex-7">{x.name}</div>
                            <div className="flex-2">{x.role}</div>
                            <div className="flex-1 flex flex-row gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                <button className="cursor-pointer hover:bg-[#cdcdcd] rounded"><FiX /></button>
                            </div>
                        </div>
                    )
                })}
                
            </div>
        </div>
    )
}