"use client"

import {Card} from "@/components/card";
import {useMenuStore} from "@/store/menu";


export default function Page() {
    const isOpen = useMenuStore((state) => state.isOpen)

    return (
        <>
            <main className="bg-white flex-1 overflow-auto">
                <div className={`h-[100%] mx-auto grid 
                        ${isOpen ? "grid-cols-1" : "grid-cols-2"} pt-5
                        md:grid-cols-3 lg:grid-cols-4 
                        content-start`}>
                    <div className="relative">
                    </div>
                </div>
            </main>
        </>
    )
}