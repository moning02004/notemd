"use client"

import {KeyboardEvent, useMemo, useState} from "react"
import {Check, MoreHorizontal, Trash2, X} from "lucide-react"
import {
    CellValue, Column, newId, OPTION_COLOR_LABEL, OPTION_COLORS, OptionColor, SelectOption,
} from "@/lib/collection_core"

/** 선택지 하나를 둥근 꼬리표로. 색은 globals.css 의 .collection-tag[data-color] 가 정한다. */
export function TagBubble({option, onRemove}: { option: SelectOption, onRemove?: () => void }) {
    return (
        <span className="collection-tag" data-color={option.color}>
            <span className="truncate">{option.name}</span>
            {onRemove && (
                <button type="button" aria-label={`${option.name} 빼기`} className="collection-tag-remove"
                        onMouseDown={event => event.preventDefault()}
                        onClick={event => {
                            event.stopPropagation()
                            onRemove()
                        }}>
                    <X size={11}/>
                </button>
            )}
        </span>
    )
}

/**
 * 선택·태그 칸에서 고르는 창. 위에 고른 꼬리표, 그 아래 찾기·만들기 칸과 선택지 목록.
 * 없는 이름을 치고 Enter 를 누르면 선택지를 만들면서 바로 고른다(노션과 같다).
 */
export function OptionPicker({column, value, apply}: {
    column: Column
    value: CellValue
    /** 선택지 목록과 칸 값을 함께 바꾼다(새 선택지를 만들며 고를 때 둘이 한 번에 들어가야 한다). */
    apply: (next: { options: SelectOption[], value: CellValue }) => void
}) {
    const multiple = column.type === "multiSelect"
    const selected: string[] = Array.isArray(value) ? value : typeof value === "string" ? [value] : []
    const [query, setQuery] = useState("")
    const [editing, setEditing] = useState<string | null>(null)
    const [active, setActive] = useState(0)

    const trimmed = query.trim()
    const matches = useMemo(
        () => column.options.filter(option => option.name.toLowerCase().includes(trimmed.toLowerCase())),
        [column.options, trimmed])
    const exact = column.options.find(option => option.name === trimmed)
    const canCreate = trimmed !== "" && !exact
    const count = matches.length + (canCreate ? 1 : 0)

    const toggle = (id: string, options = column.options) => {
        if (multiple) {
            const next = selected.includes(id) ? selected.filter(item => item !== id) : [...selected, id]
            apply({options, value: next.length ? next : null})
        } else {
            apply({options, value: selected[0] === id ? null : id})
        }
    }

    // 새 선택지는 아직 안 쓴 색부터 쓴다.
    const used = new Set(column.options.map(option => option.color))
    const nextColor = OPTION_COLORS.find(item => !used.has(item))
        ?? OPTION_COLORS[column.options.length % OPTION_COLORS.length]

    const create = () => {
        const option: SelectOption = {id: newId(), name: trimmed.slice(0, 200), color: nextColor}
        const options = [...column.options, option]
        if (multiple) apply({options, value: [...selected, option.id]})
        else apply({options, value: option.id})
        setQuery("")
        setActive(0)
    }

    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.nativeEvent.isComposing) return
        if (event.key === "ArrowDown") {
            event.preventDefault()
            setActive(index => Math.min(count - 1, index + 1))
        } else if (event.key === "ArrowUp") {
            event.preventDefault()
            setActive(index => Math.max(0, index - 1))
        } else if (event.key === "Enter") {
            event.preventDefault()
            if (active < matches.length) toggle(matches[active].id)
            else if (canCreate) create()
            setQuery("")
        } else if (event.key === "Backspace" && query === "" && selected.length) {
            // 비어 있는 칸에서 지우면 마지막으로 고른 것을 뺀다.
            const next = selected.slice(0, -1)
            apply({options: column.options, value: multiple ? (next.length ? next : null) : null})
        }
    }

    const updateOption = (id: string, patch: Partial<SelectOption>) =>
        apply({options: column.options.map(option => (option.id === id ? {...option, ...patch} : option)), value})

    const removeOption = (id: string) => {
        const options = column.options.filter(option => option.id !== id)
        const rest = selected.filter(item => item !== id)
        apply({options, value: multiple ? (rest.length ? rest : null) : (rest[0] ?? null)})
        setEditing(null)
    }

    const editingOption = column.options.find(option => option.id === editing)

    if (editingOption) {
        return (
            <div className="flex flex-col gap-1">
                <input autoFocus defaultValue={editingOption.name}
                       className="w-full rounded-md border border-border bg-background px-2 py-1 outline-none focus:border-accent"
                       onKeyDown={event => {
                           if (event.nativeEvent.isComposing) return
                           if (event.key === "Enter") (event.target as HTMLInputElement).blur()
                       }}
                       onBlur={event => {
                           const name = event.target.value.trim()
                           if (name && name !== editingOption.name
                               && !column.options.some(option => option.name === name)) {
                               updateOption(editingOption.id, {name: name.slice(0, 200)})
                           }
                       }}/>
                <div className="px-1 pt-1 text-[11px] text-subtle">색</div>
                {OPTION_COLORS.map(color => (
                    <button key={color} type="button"
                            className="flex items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-accent-menu/50"
                            onClick={() => updateOption(editingOption.id, {color: color as OptionColor})}>
                        <span className="collection-swatch" data-color={color}/>
                        <span className="flex-1">{OPTION_COLOR_LABEL[color]}</span>
                        {editingOption.color === color && <Check size={13}/>}
                    </button>
                ))}
                <div className="my-1 border-t border-border"/>
                <button type="button"
                        className="flex items-center gap-2 rounded-md px-2 py-1 text-left text-danger hover:bg-danger-soft"
                        onClick={() => removeOption(editingOption.id)}>
                    <Trash2 size={13}/> 선택지 지우기
                </button>
                <button type="button" className="rounded-md px-2 py-1 text-left text-muted hover:bg-accent-menu/50"
                        onClick={() => setEditing(null)}>
                    ← 돌아가기
                </button>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-background px-1.5 py-1
                            focus-within:border-accent">
                {selected.map(id => {
                    const option = column.options.find(item => item.id === id)
                    return option && <TagBubble key={id} option={option} onRemove={() => toggle(id)}/>
                })}
                <input autoFocus value={query} placeholder={selected.length ? "" : "선택지 찾기·만들기"}
                       className="min-w-16 flex-1 bg-transparent py-0.5 outline-none placeholder:text-subtle"
                       onChange={event => {
                           setQuery(event.target.value)
                           setActive(0)
                       }}
                       onKeyDown={onKeyDown}/>
            </div>
            <div className="px-1 pt-1 text-[11px] text-subtle">
                {multiple ? "여러 개 고를 수 있어요" : "하나 고르세요"}
            </div>
            <div className="max-h-60 overflow-y-auto">
                {matches.map((option, index) => (
                    <div key={option.id}
                         className={`group flex items-center gap-1 rounded-md px-1.5 py-1 cursor-pointer
                                     ${index === active ? "bg-accent-menu/50" : "hover:bg-accent-menu/40"}`}
                         onMouseEnter={() => setActive(index)}
                         onClick={() => toggle(option.id)}>
                        <span className="min-w-0 flex-1"><TagBubble option={option}/></span>
                        {selected.includes(option.id) && <Check size={13} className="shrink-0 text-accent"/>}
                        <button type="button" aria-label="선택지 고치기"
                                className="shrink-0 rounded p-0.5 text-subtle opacity-0 hover:bg-border group-hover:opacity-100
                                           max-md:opacity-100"
                                onClick={event => {
                                    event.stopPropagation()
                                    setEditing(option.id)
                                }}>
                            <MoreHorizontal size={14}/>
                        </button>
                    </div>
                ))}
                {canCreate && (
                    <div className={`flex items-center gap-2 rounded-md px-1.5 py-1 cursor-pointer
                                     ${active === matches.length ? "bg-accent-menu/50" : "hover:bg-accent-menu/40"}`}
                         onMouseEnter={() => setActive(matches.length)}
                         onClick={create}>
                        <span className="text-muted">만들기</span>
                        <TagBubble option={{id: "", name: trimmed, color: nextColor}}/>
                    </div>
                )}
                {!canCreate && matches.length === 0 && (
                    <div className="px-2 py-1.5 text-subtle">선택지가 없습니다. 이름을 적어 만드세요.</div>
                )}
            </div>
        </div>
    )
}
