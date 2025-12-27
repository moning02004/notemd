"use client"

import {Card} from "@/components/card";
import {useMenuStore} from "@/store/menu";
import {FiEdit, FiPlus} from "react-icons/fi";

const text = `
# 내가
> 이런 템플릿

`
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
                        <Card key={1}
                              type="template"
                              title="제목 없음"
                              content={text}
                              width={isOpen ? "w-[50vw] md:w-[25vw] lg:w-[20vw]" : "w-[37vw] md:w-[29vw] lg:w-[21vw]"}
                              templateMenu={true}
                        />
                    </div>
                </div>
            </main>
        </>
    )
}