"use client"

import {useEffect, useLayoutEffect, useRef, useState} from "react"
import {ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, ChevronDown, ChevronRight, Trash2} from "lucide-react"
import {
    changeColumnType, CollectionData, Column, COLUMN_TYPES, formulaSyntaxError, formulaText, formulaValue,
    FUNCTIONS, renameInFormulas,
} from "@/lib/collection_core"

type Update = (change: (data: CollectionData) => CollectionData) => void

const menuButton = "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-accent-menu/50"

/** 열 머리를 눌렀을 때 뜨는 메뉴: 이름, 종류, 수식, 정렬, 옮기기, 지우기. */
export function ColumnMenu({data, column, update, onClose}: {
    data: CollectionData
    column: Column
    update: Update
    onClose: () => void
}) {
    const index = data.columns.findIndex(item => item.id === column.id)
    const [showTypes, setShowTypes] = useState(false)
    const sorted = data.sort?.columnId === column.id ? data.sort.direction : null

    const patch = (fields: Partial<Column>) => update(current => ({
        ...current,
        columns: current.columns.map(item => (item.id === column.id ? {...item, ...fields} : item)),
    }))

    // 바깥을 눌러 창이 닫히면 입력칸이 blur 없이 사라지기도 한다. 닫힐 때 한 번 더 저장한다.
    const nameDraft = useRef(column.name)
    const rename = (name: string) => update(current => renameInFormulas(current, column.id, name.slice(0, 200)))
    const renameRef = useRef(rename)
    useLayoutEffect(() => {
        renameRef.current = rename
    })
    useEffect(() => () => renameRef.current(nameDraft.current), [])

    const move = (offset: number) => update(current => {
        const columns = [...current.columns]
        const from = columns.findIndex(item => item.id === column.id)
        const to = from + offset
        if (from === -1 || to < 0 || to >= columns.length) return current
        ;[columns[from], columns[to]] = [columns[to], columns[from]]
        return {...current, columns}
    })

    const sortBy = (direction: "asc" | "desc") => update(current => ({
        ...current,
        sort: current.sort?.columnId === column.id && current.sort.direction === direction
            ? null
            : {columnId: column.id, direction},
    }))

    const remove = () => {
        update(current => ({
            ...current,
            columns: current.columns.filter(item => item.id !== column.id),
            rows: current.rows.map(row => {
                const cells = {...row.cells}
                delete cells[column.id]
                return {...row, cells}
            }),
            sort: current.sort?.columnId === column.id ? null : current.sort,
        }))
        onClose()
    }

    const typeInfo = COLUMN_TYPES.find(item => item.type === column.type)!

    return (
        <div className="flex flex-col gap-0.5">
            <input autoFocus defaultValue={column.name} placeholder="열 이름"
                   className="mb-1 w-full rounded-md border border-border bg-background px-2 py-1 outline-none focus:border-accent"
                   onChange={event => {
                       nameDraft.current = event.target.value
                   }}
                   onKeyDown={event => {
                       if (event.nativeEvent.isComposing) return
                       if (event.key === "Enter") onClose()
                   }}
                   onBlur={event => rename(event.target.value)}/>

            <button type="button" className={menuButton} onClick={() => setShowTypes(open => !open)}>
                <span className="w-5 text-center text-[11px] text-muted">{typeInfo.glyph}</span>
                <span className="flex-1">종류: {typeInfo.label}</span>
                {showTypes ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
            </button>
            {showTypes && (
                <div className="ml-3 border-l border-border pl-1">
                    {COLUMN_TYPES.map(item => (
                        <button key={item.type} type="button" className={menuButton}
                                onClick={() => {
                                    update(current => changeColumnType(current, column.id, item.type))
                                    setShowTypes(false)
                                }}>
                            <span className="w-5 text-center text-[11px] text-muted">{item.glyph}</span>
                            <span className="flex-1">{item.label}</span>
                            {item.type === column.type && <Check size={13}/>}
                        </button>
                    ))}
                </div>
            )}

            {column.type === "formula" && <FormulaEditor data={data} column={column} patch={patch}/>}

            {column.type === "id" && <IdPrefixInput column={column} patch={patch}/>}

            {(column.type === "number" || column.type === "formula") && (
                <button type="button" className={menuButton} onClick={() => patch({asProgress: !column.asProgress})}>
                    <span className="w-5 text-center text-[11px] text-muted">▰</span>
                    <span className="flex-1">진행도 막대로 보기</span>
                    {column.asProgress && <Check size={13}/>}
                </button>
            )}

            <div className="my-1 border-t border-border"/>
            <button type="button" className={menuButton} onClick={() => sortBy("asc")}>
                <ArrowUp size={14} className="text-muted"/><span className="flex-1">오름차순 정렬</span>
                {sorted === "asc" && <Check size={13}/>}
            </button>
            <button type="button" className={menuButton} onClick={() => sortBy("desc")}>
                <ArrowDown size={14} className="text-muted"/><span className="flex-1">내림차순 정렬</span>
                {sorted === "desc" && <Check size={13}/>}
            </button>
            <div className="flex gap-0.5">
                <button type="button" className={`${menuButton} disabled:opacity-40`} disabled={index <= 0}
                        onClick={() => move(-1)}>
                    <ArrowLeft size={14} className="text-muted"/> 왼쪽으로
                </button>
                <button type="button" className={`${menuButton} disabled:opacity-40`}
                        disabled={index === data.columns.length - 1} onClick={() => move(1)}>
                    <ArrowRight size={14} className="text-muted"/> 오른쪽으로
                </button>
            </div>
            <div className="my-1 border-t border-border"/>
            <button type="button" className={`${menuButton} text-danger hover:!bg-danger-soft disabled:opacity-40`}
                    disabled={data.columns.length <= 1} onClick={remove}>
                <Trash2 size={14}/> 열 지우기
            </button>
        </div>
    )
}

/** ID 번호 앞에 붙일 글자. 바꾸면 모든 행의 보이는 번호가 함께 바뀐다(번호 자체는 그대로). */
function IdPrefixInput({column, patch}: { column: Column, patch: (fields: Partial<Column>) => void }) {
    const [draft, setDraft] = useState(column.prefix)
    const latest = useRef({draft, patch})
    useLayoutEffect(() => {
        latest.current = {draft, patch}
    })
    // 바깥을 눌러 창이 닫힐 때도 남긴다.
    useEffect(() => () => latest.current.patch({prefix: latest.current.draft.slice(0, 20)}), [])
    return (
        <div className="my-1 flex flex-col gap-1 rounded-lg bg-background p-1.5">
            <label className="px-1 text-[11px] text-muted" htmlFor={`prefix-${column.id}`}>번호 앞 글자</label>
            <input id={`prefix-${column.id}`} value={draft} maxLength={20} placeholder="예: TASK-"
                   className="w-full rounded-md border border-border bg-surface px-2 py-1 outline-none focus:border-accent"
                   onChange={event => setDraft(event.target.value)}
                   onBlur={() => patch({prefix: draft.slice(0, 20)})}
                   onKeyDown={event => {
                       if (!event.nativeEvent.isComposing && event.key === "Enter") event.currentTarget.blur()
                   }}/>
            <div className="px-1 text-[11px] text-subtle">
                보기: {draft}1, {draft}2 … 행마다 저절로 매기고, 지운 번호는 다시 쓰지 않습니다.
            </div>
        </div>
    )
}

/** 수식 쓰는 칸. 쓰는 동안 틀린 곳과 첫 행으로 계산한 값을 보여 주고, 칸을 나가면 저장한다. */
function FormulaEditor({data, column, patch}: {
    data: CollectionData
    column: Column
    patch: (fields: Partial<Column>) => void
}) {
    const [draft, setDraft] = useState(column.formula)
    const [showHelp, setShowHelp] = useState(false)
    const textarea = useRef<HTMLTextAreaElement>(null)

    const error = formulaSyntaxError(draft)
    const preview = (() => {
        if (error || !draft.trim() || data.rows.length === 0) return null
        const trial = {...column, formula: draft}
        const result = formulaValue({...data, columns: data.columns.map(item => (item.id === column.id ? trial : item))},
            trial, data.rows[0])
        return result.error ? {error: result.error} : {text: formulaText(result.value)}
    })()

    const commit = (value = draft) => patch({formula: value.slice(0, 2000)})
    // 바깥을 눌러 창이 닫힐 때도 쓰던 식을 남긴다.
    const latest = useRef({draft, commit})
    useLayoutEffect(() => {
        latest.current = {draft, commit}
    })
    useEffect(() => () => latest.current.commit(latest.current.draft), [])

    /** 커서 자리에 끼워 넣는다(칸 이름·함수 고르기). */
    const insert = (text: string) => {
        const element = textarea.current
        const start = element?.selectionStart ?? draft.length
        const end = element?.selectionEnd ?? draft.length
        const next = draft.slice(0, start) + text + draft.slice(end)
        setDraft(next)
        commit(next)
        requestAnimationFrame(() => {
            element?.focus()
            const caret = start + text.length - (text.endsWith("()") ? 1 : 0)
            element?.setSelectionRange(caret, caret)
        })
    }

    const others = data.columns.filter(item => item.id !== column.id && item.name.trim())

    return (
        <div className="my-1 flex flex-col gap-1 rounded-lg bg-background p-1.5">
            <textarea ref={textarea} value={draft} rows={2} spellCheck={false}
                      placeholder="{가격} * {수량}"
                      className="w-full resize-none rounded-md border border-border bg-surface px-2 py-1 font-mono text-[12px]
                                 outline-none focus:border-accent"
                      onChange={event => setDraft(event.target.value)}
                      onKeyDown={event => {
                          if (event.nativeEvent.isComposing) return
                          if (event.key === "Enter" && !event.shiftKey) {
                              event.preventDefault()
                              commit()
                          }
                      }}
                      onBlur={() => commit()}/>
            {error
                ? <div className="px-1 text-[11px] text-danger">{error}</div>
                : preview && (
                "error" in preview
                    ? <div className="px-1 text-[11px] text-danger">첫 행: {preview.error}</div>
                    : <div className="px-1 text-[11px] text-muted">첫 행 결과: <b>{preview.text || "(빈칸)"}</b></div>
            )}
            {others.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                    {others.map(item => (
                        <button key={item.id} type="button"
                                className="rounded border border-border bg-surface px-1.5 py-0.5 text-[11px] hover:border-accent"
                                onMouseDown={event => event.preventDefault()}
                                onClick={() => insert(`{${item.name.trim()}}`)}>
                            {item.name.trim()}
                        </button>
                    ))}
                </div>
            )}
            <button type="button" className="flex items-center gap-1 px-1 pt-0.5 text-left text-[11px] text-muted hover:text-foreground"
                    onClick={() => setShowHelp(open => !open)}>
                {showHelp ? <ChevronDown size={12}/> : <ChevronRight size={12}/>} 함수와 쓰는 법
            </button>
            {showHelp && (
                <div className="max-h-48 overflow-y-auto px-1 text-[11px] leading-relaxed text-muted">
                    <p className="mb-1">칸은 <code>{"{이름}"}</code> 으로 부릅니다. 연산: <code>+ - * / % ^</code>,
                        비교: <code>{"== != < <= > >="}</code>, 논리: <code>{"&& || !"}</code>. 글은 &quot;따옴표&quot; 로.</p>
                    {Object.entries(FUNCTIONS).map(([name, spec]) => (
                        <button key={name} type="button"
                                className="block w-full rounded px-1 py-0.5 text-left hover:bg-accent-menu/50"
                                onMouseDown={event => event.preventDefault()}
                                onClick={() => insert(`${spec.signature.split("(")[0]}()`)}>
                            <code className="text-foreground">{spec.signature}</code> — {spec.description}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
