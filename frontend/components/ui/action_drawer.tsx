"use client"

import {LuEllipsisVertical} from "react-icons/lu"
import {Drawer} from "vaul"

interface ActionDrawerItem {
    label: string
    onClick?: () => void
    danger?: boolean
}

interface ActionDrawerProps {
    /** 기본값: 케밥(⋮) 아이콘 트리거 */
    trigger?: React.ReactNode
    items: ActionDrawerItem[]
    closeLabel?: string
}

export function ActionDrawer({trigger, items, closeLabel = "취소"}: ActionDrawerProps) {
    return (
        <Drawer.Root>
            <Drawer.Trigger asChild>
                {trigger ?? (
                    <div className="drawer-button">
                        <button className="drawer-menu">
                            <LuEllipsisVertical size={22}/>
                        </button>
                    </div>
                )}
            </Drawer.Trigger>

            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40"/>

                <Drawer.Content className="drawer-content">
                    <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-border-strong"/>

                    <div className="flex flex-col p-4">
                        {items.map((item, i) => (
                            <button
                                key={i}
                                onClick={item.onClick}
                                className={`w-full p-3 text-left hover:bg-background cursor-pointer rounded border-b border-border ${
                                    item.danger ? "text-danger" : ""
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                        <Drawer.Close className="w-full p-3 hover:bg-background rounded cursor-pointer text-left">
                            {closeLabel}
                        </Drawer.Close>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    )
}
