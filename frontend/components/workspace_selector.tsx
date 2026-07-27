"use client"

import {useEffect, useState} from "react"
import {ChevronDown} from "lucide-react"
import {useWorkspaceStore} from "@/store/workspace"
import {useAuthStore} from "@/store/auth"
import {useClickOutside} from "@/hooks/useClickOutside"

export function WorkspaceSelector() {
    const {workspaces, selectedWorkspaceId, fetchWorkspaces, setSelectedWorkspaceId} = useWorkspaceStore()
    const {userHash} = useAuthStore.getState();
    const [open, setOpen] = useState(false)
    const ref = useClickOutside<HTMLDivElement>(() => setOpen(false))

    useEffect(() => {
        if (userHash) fetchWorkspaces(userHash)
    }, [userHash])

    if (workspaces.length === 0) return null

    const selected = workspaces.find(w => w.hashId === selectedWorkspaceId)

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(prev => !prev)}
                className="flex items-center gap-1 px-2 py-1 -ml-2 rounded-lg text-sm font-medium text-foreground hover:bg-background transition-colors cursor-pointer"
            >
                <span className="max-w-[8rem] truncate">{selected?.name ?? "워크스페이스 선택"}</span>
                <ChevronDown size={14} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}/>
            </button>

            {open && (
                <div className="absolute left-0 top-full mt-1 w-56 bg-surface border border-border rounded-lg shadow-md z-50 py-1 max-h-72 overflow-y-auto">
                    {workspaces.map(w => (
                        <button
                            key={w.hashId}
                            onClick={() => {
                                setSelectedWorkspaceId(w.hashId)
                                setOpen(false)
                            }}
                            className="w-full flex flex-col items-start px-3 py-2 hover:bg-background transition-colors text-left"
                        >
                            <span className={`text-sm font-medium ${w.hashId === selectedWorkspaceId ? "text-accent" : "text-muted"}`}>
                                {w.name}
                            </span>
                            <span className="text-xs text-subtle">구성원 {w.userCount}명</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}