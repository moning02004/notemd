"use client"

import {useId, useState} from "react"
import {FiCheck, FiChevronDown} from "react-icons/fi"
import {useClickOutside} from "@/hooks/useClickOutside"

export interface SelectOption<T extends string> {
    value: T
    label: string
}

interface Props<T extends string> {
    value: T
    options: SelectOption<T>[]
    onChange: (value: T) => void
    /** 화면 낭독기가 읽을 이름. 옆에 보이는 글자가 없을 때 준다. */
    ariaLabel?: string
    id?: string
    /** 누르는 칸의 생김새(테두리·크기 등). 자리마다 다르다. */
    className?: string
    /** 펼친 목록의 정렬. 오른쪽 끝에 붙은 칸은 "right" 로 화면 밖으로 나가지 않게 한다. */
    align?: "left" | "right"
}

/**
 * 고르는 칸. 브라우저의 select 대신 쓴다.
 *
 * select 는 펼친 목록의 생김새를 바꿀 수 없어, 운영체제마다 다르게 보이고 앱의 다른 메뉴와 어긋난다.
 * 목록은 앱의 메뉴와 같은 모양(올리면 accent-menu, 고른 것에 체크)으로 그린다.
 * 키보드: Enter·Space·↓ 로 펼치고, ↑↓ 로 옮기고, Enter 로 고르고, Esc 로 닫는다.
 */
export function SelectBox<T extends string>({value, options, onChange, ariaLabel, id, className = "", align = "left"}: Props<T>) {
    const [open, setOpen] = useState(false)
    const [cursor, setCursor] = useState(0)
    const listId = useId()
    const ref = useClickOutside<HTMLDivElement>(() => setOpen(false), open)

    const selectedIndex = Math.max(0, options.findIndex(option => option.value === value))
    const selected = options[selectedIndex]

    const show = () => {
        setCursor(selectedIndex)
        setOpen(true)
    }
    const pick = (option: SelectOption<T>) => {
        setOpen(false)
        if (option.value !== value) onChange(option.value)
    }

    const onKeyDown = (event: React.KeyboardEvent) => {
        if (!open) {
            if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key)) {
                event.preventDefault()
                show()
            }
            return
        }
        if (event.key === "Escape") {
            // 모달 안에서 쓰일 때 목록만 닫고 모달은 남긴다.
            event.preventDefault()
            event.stopPropagation()
            setOpen(false)
        } else if (event.key === "ArrowDown") {
            event.preventDefault()
            setCursor(current => Math.min(current + 1, options.length - 1))
        } else if (event.key === "ArrowUp") {
            event.preventDefault()
            setCursor(current => Math.max(current - 1, 0))
        } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            if (options[cursor]) pick(options[cursor])
        } else if (event.key === "Tab") {
            setOpen(false)
        }
    }

    return (
        <div ref={ref} className="relative min-w-0">
            <div
                id={id}
                role="combobox"
                tabIndex={0}
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listId}
                onClick={() => (open ? setOpen(false) : show())}
                onKeyDown={onKeyDown}
                className={`flex items-center gap-1.5 cursor-pointer select-none outline-none
                            focus-visible:border-accent ${className}`}
            >
                <span className="min-w-0 flex-1 truncate">{selected?.label ?? ""}</span>
                <FiChevronDown size={14}
                               className={`shrink-0 text-subtle transition-transform duration-150 ${open ? "rotate-180" : ""}`}/>
            </div>

            {open && (
                <div
                    id={listId}
                    role="listbox"
                    aria-label={ariaLabel}
                    className={`absolute top-full mt-1 z-50 min-w-full w-max max-w-[80vw] max-h-60 overflow-y-auto py-1
                                bg-surface border border-border rounded-lg shadow-lg
                                ${align === "right" ? "right-0" : "left-0"}`}
                >
                    {options.map((option, index) => (
                        <div
                            key={option.value}
                            role="option"
                            aria-selected={option.value === value}
                            onClick={() => pick(option)}
                            onMouseEnter={() => setCursor(index)}
                            className={`flex items-center justify-between gap-3 px-3 py-2 text-[13px] cursor-pointer
                                        ${index === cursor ? "bg-accent-menu" : ""}
                                        ${option.value === value ? "text-accent font-medium" : "text-foreground"}`}
                        >
                            <span className="truncate">{option.label}</span>
                            {option.value === value && <FiCheck size={13} className="shrink-0 text-accent"/>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
