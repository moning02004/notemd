"use client"

import {LayoutGrid, List} from "lucide-react"
import {useViewModeStore} from "@/store/viewMode"

export default function ViewModeToggle() {
    const {viewMode, setViewMode} = useViewModeStore()

    const buttonClass = (active: boolean) => `
        p-1.5 rounded-md transition-all cursor-pointer
        ${active
        ? "text-foreground bg-background"
        : "text-subtle hover:text-foreground hover:bg-background"}
    `

    return (
        <div className="flex items-center gap-0.5 shrink-0">
            <button
                onClick={() => setViewMode("card")}
                className={buttonClass(viewMode === "card")}
                aria-label="카드로 보기"
                title="카드로 보기"
            >
                <LayoutGrid size={16}/>
            </button>
            <button
                onClick={() => setViewMode("list")}
                className={buttonClass(viewMode === "list")}
                aria-label="목록으로 보기"
                title="목록으로 보기"
            >
                <List size={16}/>
            </button>
        </div>
    )
}