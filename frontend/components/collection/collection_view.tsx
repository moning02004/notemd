"use client"

import {MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from "react"
import {NodeViewProps, NodeViewWrapper} from "@tiptap/react"
import {ArrowDown, ArrowUp, GripVertical, Plus, Trash2} from "lucide-react"
import {
    CALC_LABEL, calcsFor, calcText, CellValue, clampProgress, COLLECTION_LABEL, CollectionData, Column, COLUMN_TYPES,
    formatNumber, formulaText, formulaValue, MAX_COLUMN_WIDTH, MIN_COLUMN_WIDTH, newColumn, newRow, optionOf,
    parseCollection, Row, SelectOption, serializeCollection, sortedRows,
} from "@/lib/collection_core"
import {Popover} from "@/components/collection/popover"
import {OptionPicker, TagBubble} from "@/components/collection/option_picker"
import {ColumnMenu} from "@/components/collection/column_menu"
import {DropLine, moveItem, startReorder} from "@/components/collection/reorder"

type Update = (change: (data: CollectionData) => CollectionData) => void

/** 열 머리를 누르기 시작했을 때(끌어 옮기기) */
type ReorderStart = (event: ReactPointerEvent<HTMLElement>, index: number) => void

/** 줄 끝(행 옮기기·지우기, 열 더하기) 자리의 폭 */
const TAIL_WIDTH = 60

/** 에디터가 읽기 전용으로 바뀌는 것(공유 화면, 잠금)을 따라간다. setEditable 은 노드를 바꾸지 않아 다시 그려지지 않는다. */
function useEditable(editor: NodeViewProps["editor"]) {
    const [editable, setEditable] = useState(editor.isEditable)
    useEffect(() => {
        const sync = () => setEditable(editor.isEditable)
        editor.on("update", sync)
        editor.on("transaction", sync)
        sync()
        return () => {
            editor.off("update", sync)
            editor.off("transaction", sync)
        }
    }, [editor])
    return editable
}

/**
 * 모음표의 노드 뷰. 내용은 노드의 data 속성(JSON) 하나에 있고, 고칠 때마다 속성을 통째로 바꾼다
 * (되돌리기·공동 편집이 그대로 따라온다). 글을 치는 칸은 치는 동안 화면에만 두었다가 칸을 나갈 때 적는다.
 */
export function CollectionView({node, updateAttributes, editor}: NodeViewProps) {
    const raw = node.attrs.data as string
    const data = useMemo(() => parseCollection(raw), [raw])
    const editable = useEditable(editor)

    // 떠 있는 창에서 늦게 부르는 고침도 지금 내용에 얹는다.
    const latest = useRef({data, raw, updateAttributes})
    useLayoutEffect(() => {
        latest.current = {data, raw, updateAttributes}
    })

    const update: Update = useCallback(change => {
        const {data: current, raw: currentRaw, updateAttributes: write} = latest.current
        const next = serializeCollection(change(current))
        if (next === currentRaw || editor.isDestroyed) return
        try {
            write({data: next})
        } catch {
            // 표가 이미 지워졌다(창이 닫히며 늦게 저장하는 경우).
        }
    }, [editor])

    const rows = useMemo(() => sortedRows(data), [data])
    const gridTemplateColumns = `${data.columns.map(column => `${column.width}px`).join(" ")} minmax(${TAIL_WIDTH}px, 1fr)`
    const showCalcRow = editable || data.columns.some(column => column.calc !== "none")

    const setCell = useCallback((rowId: string, columnId: string, value: CellValue) => update(current => ({
        ...current,
        rows: current.rows.map(row => {
            if (row.id !== rowId) return row
            const cells = {...row.cells}
            if (value === null || value === "" || (Array.isArray(value) && value.length === 0)) delete cells[columnId]
            else cells[columnId] = value
            return {...row, cells}
        }),
    })), [update])

    // 열·행 끌어 옮기기. 표시선과 끄는 것은 화면에만, 놓을 때 한 번 적는다.
    const grid = useRef<HTMLDivElement>(null)
    const [dropLine, setDropLine] = useState<DropLine | null>(null)
    const [draggingColumn, setDraggingColumn] = useState<string | null>(null)
    const [draggingRow, setDraggingRow] = useState<string | null>(null)

    const startColumnDrag: ReorderStart = (event, index) => {
        // 손가락으로는 표를 가로로 밀어 보는 일이 더 잦다. 열 옮기기는 마우스로만(메뉴의 왼쪽·오른쪽으로도 된다).
        if (event.pointerType !== "mouse" || !grid.current) return
        const id = data.columns[index].id
        startReorder({
            event, axis: "x", from: index, grid: grid.current,
            targets: () => [...grid.current?.querySelectorAll<HTMLElement>("[role=columnheader]") ?? []],
            onDragging: dragging => setDraggingColumn(dragging ? id : null),
            onLine: setDropLine,
            onDrop: (from, to) => update(current => ({...current, columns: moveItem(current.columns, from, to)})),
        })
    }

    const startRowDrag = (event: ReactPointerEvent<HTMLElement>, index: number) => {
        if (!grid.current) return
        event.preventDefault()
        const id = rows[index].id
        startReorder({
            event, axis: "y", from: index, grid: grid.current,
            targets: () => [...grid.current?.querySelectorAll<HTMLElement>("[data-row-first]") ?? []],
            onDragging: dragging => setDraggingRow(dragging ? id : null),
            onLine: setDropLine,
            // 정렬 중에는 손잡이가 없으므로 화면 순서가 곧 저장 순서다.
            onDrop: (from, to) => update(current => ({...current, rows: moveItem(current.rows, from, to)})),
        })
    }

    const addRow = () => update(current => ({...current, rows: [...current.rows, newRow()]}))
    const removeRow = (rowId: string) => update(current => ({...current, rows: current.rows.filter(row => row.id !== rowId)}))
    const addColumn = () => update(current => ({
        ...current,
        columns: [...current.columns, newColumn("text", `열 ${current.columns.length + 1}`)],
    }))

    return (
        <NodeViewWrapper className="collection-view" data-type="collection">
            <div contentEditable={false} className="select-none">
                <TitleInput value={data.title} editable={editable}
                            onCommit={title => update(current => ({...current, title: title.slice(0, 200)}))}/>
                <div className="collection-scroll">
                    <div ref={grid} className="collection-grid" style={{gridTemplateColumns}} role="table">
                        {dropLine && <div className="collection-drop-line" style={dropLine}/>}
                        {/* 머리 */}
                        <div className="contents" role="row">
                            {data.columns.map((column, index) => (
                                <HeaderCell key={column.id} data={data} column={column} editable={editable} update={update}
                                            dragging={draggingColumn === column.id}
                                            onReorderStart={event => startColumnDrag(event, index)}/>
                            ))}
                            <div className="collection-head collection-tail">
                                {editable && (
                                    <button type="button" aria-label="열 더하기" title="열 더하기"
                                            className="collection-icon-button" onClick={addColumn}>
                                        <Plus size={14}/>
                                    </button>
                                )}
                            </div>
                        </div>

                        {rows.map((row, rowIndex) => (
                            <div key={row.id} className="contents group/row" role="row"
                                 data-dragging={draggingRow === row.id || undefined}>
                                {data.columns.map((column, columnIndex) => (
                                    <div key={column.id} className="collection-cell" role="cell"
                                         data-row-first={columnIndex === 0 || undefined}
                                         data-pointer={editable ? POINTER[column.type] : undefined}
                                         onMouseDown={editable ? focusCell : undefined}>
                                        <Cell data={data} column={column} row={row} editable={editable}
                                              setCell={setCell} update={update}/>
                                    </div>
                                ))}
                                <div className="collection-cell collection-tail">
                                    {editable && (
                                        <button type="button" aria-label="행 옮기기"
                                                title={data.sort ? "정렬 중에는 옮길 수 없습니다" : "끌어서 옮기기"}
                                                disabled={Boolean(data.sort)}
                                                className="collection-icon-button collection-row-grip opacity-0
                                                           group-hover/row:opacity-100 max-md:opacity-60 disabled:!opacity-0"
                                                onPointerDown={event => startRowDrag(event, rowIndex)}>
                                            <GripVertical size={13}/>
                                        </button>
                                    )}
                                    {editable && (
                                        <button type="button" aria-label="행 지우기" title="행 지우기"
                                                className="collection-icon-button opacity-0 group-hover/row:opacity-100
                                                           focus:opacity-100 max-md:opacity-60"
                                                onClick={() => removeRow(row.id)}>
                                            <Trash2 size={13}/>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {showCalcRow && (
                            <div className="contents" role="row">
                                {data.columns.map(column => (
                                    <CalcCell key={column.id} data={data} column={column} editable={editable} update={update}/>
                                ))}
                                <div className="collection-calc collection-tail"/>
                            </div>
                        )}
                    </div>
                </div>
                {editable && (
                    <button type="button" className="collection-add-row" onClick={addRow}>
                        <Plus size={14}/> 새 행
                    </button>
                )}
            </div>
        </NodeViewWrapper>
    )
}

/**
 * 칸 위에서의 마우스 모양. 글을 치는 칸은 글자 커서(I), 고르는 칸은 손가락, 계산만 하는 수식 칸은 그대로.
 * 칸 전체에 걸어 입력칸 밖의 빈 곳에서도 같은 모양이다(누르면 focusCell 이 입력칸으로 옮겨 준다).
 */
const POINTER: Record<Column["type"], "text" | "pointer" | undefined> = {
    text: "text", number: "text", url: "text", date: "text",
    select: "pointer", multiSelect: "pointer", checkbox: "pointer", progress: "pointer",
    formula: undefined,
}

/**
 * 칸의 빈 곳을 눌러도 그 칸을 고치게 한다. 한 행에서 긴 글이 든 칸이 높아지면 나머지 칸은 입력칸 아래로
 * 빈 곳이 생기는데, 거기를 누르면 아무 일도 없어 위쪽만 골라 눌러야 했다.
 * 글 칸은 끝에 커서를 두고, 선택·태그 칸은 고르는 창을 연다.
 */
function focusCell(event: ReactMouseEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return
    const field = event.currentTarget.querySelector<HTMLElement>(
        "textarea, input:not([type=checkbox]), input[type=checkbox], .collection-tags")
    if (!field) return
    event.preventDefault()
    if (field instanceof HTMLInputElement && field.type === "checkbox") {
        field.click()
        return
    }
    field.focus()
    if (field instanceof HTMLTextAreaElement || (field instanceof HTMLInputElement && field.type !== "date")) {
        const end = field.value.length
        field.setSelectionRange(end, end)
    } else if (field.classList.contains("collection-tags")) {
        field.click()
    }
}

function TitleInput({value, editable, onCommit}: { value: string, editable: boolean, onCommit: (value: string) => void }) {
    const {draft, setDraft, onBlur} = useDraft(value, onCommit)
    if (!editable) return value ? <div className="collection-title">{value}</div> : null
    return (
        <input value={draft} placeholder={`${COLLECTION_LABEL} 제목`} className="collection-title"
               onChange={event => setDraft(event.target.value)}
               onBlur={onBlur}
               onKeyDown={event => {
                   if (event.nativeEvent.isComposing) return
                   if (event.key === "Enter") (event.target as HTMLInputElement).blur()
               }}/>
    )
}

// ---------------------------------------------------------------- 머리

function HeaderCell({data, column, editable, update, dragging, onReorderStart}: {
    data: CollectionData, column: Column, editable: boolean, update: Update
    dragging: boolean
    onReorderStart: (event: ReactPointerEvent<HTMLElement>) => void
}) {
    const [anchor, setAnchor] = useState<HTMLElement | null>(null)
    const close = useCallback(() => setAnchor(null), [])
    const glyph = COLUMN_TYPES.find(item => item.type === column.type)?.glyph
    const sort = data.sort?.columnId === column.id ? data.sort.direction : null

    // 오른쪽 끝을 끌어 폭을 맞춘다. 끄는 동안은 화면에만 적고 놓을 때 저장한다(되돌리기가 한 번에 되돌린다).
    const cell = useRef<HTMLDivElement>(null)
    const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.stopPropagation()
        const grid = cell.current?.closest<HTMLElement>(".collection-grid")
        if (!grid) return
        const startX = event.clientX
        const index = data.columns.findIndex(item => item.id === column.id)
        let width = column.width
        const onMove = (move: PointerEvent) => {
            width = Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, Math.round(column.width + move.clientX - startX)))
            const widths = data.columns.map((item, i) => (i === index ? width : item.width))
            grid.style.gridTemplateColumns = `${widths.map(value => `${value}px`).join(" ")} minmax(${TAIL_WIDTH}px, 1fr)`
        }
        const onUp = () => {
            window.removeEventListener("pointermove", onMove)
            window.removeEventListener("pointerup", onUp)
            update(current => ({
                ...current,
                columns: current.columns.map(item => (item.id === column.id ? {...item, width} : item)),
            }))
        }
        window.addEventListener("pointermove", onMove)
        window.addEventListener("pointerup", onUp)
    }

    return (
        <div ref={cell} className="collection-head" role="columnheader" data-dragging={dragging || undefined}>
            <button type="button" disabled={!editable}
                    className="collection-head-button"
                    title={editable ? "눌러서 설정, 끌어서 옮기기" : undefined}
                    onPointerDown={editable ? onReorderStart : undefined}
                    onClick={event => setAnchor(anchor ? null : event.currentTarget)}>
                <span className="collection-head-glyph">{glyph}</span>
                <span className="truncate">{column.name || "이름 없음"}</span>
                {sort === "asc" && <ArrowUp size={12} className="shrink-0 text-muted"/>}
                {sort === "desc" && <ArrowDown size={12} className="shrink-0 text-muted"/>}
            </button>
            {editable && <div className="collection-resize" onPointerDown={startResize}/>}
            {anchor && (
                <Popover anchor={anchor} onClose={close} width={280}>
                    <ColumnMenu data={data} column={column} update={update} onClose={close}/>
                </Popover>
            )}
        </div>
    )
}

function CalcCell({data, column, editable, update}: {
    data: CollectionData, column: Column, editable: boolean, update: Update
}) {
    const [anchor, setAnchor] = useState<HTMLElement | null>(null)
    const close = useCallback(() => setAnchor(null), [])
    const result = calcText(data, column)
    return (
        <div className="collection-calc">
            {(editable || column.calc !== "none") && (
                <button type="button" disabled={!editable}
                        className={`collection-calc-button ${column.calc === "none" ? "opacity-0 hover:opacity-100" : ""}`}
                        onClick={event => setAnchor(anchor ? null : event.currentTarget)}>
                    {column.calc === "none"
                        ? "계산"
                        : <><span className="text-subtle">{CALC_LABEL[column.calc]}</span> <b>{result || "–"}</b></>}
                </button>
            )}
            {anchor && (
                <Popover anchor={anchor} onClose={close} width={180}>
                    {calcsFor(column).map(calc => (
                        <button key={calc} type="button"
                                className={`flex w-full items-center rounded-md px-2 py-1 text-left hover:bg-accent-menu/50
                                            ${calc === column.calc ? "font-semibold" : ""}`}
                                onClick={() => {
                                    update(current => ({
                                        ...current,
                                        columns: current.columns.map(item => (item.id === column.id ? {...item, calc} : item)),
                                    }))
                                    close()
                                }}>
                            {CALC_LABEL[calc]}
                        </button>
                    ))}
                </Popover>
            )}
        </div>
    )
}

// ---------------------------------------------------------------- 칸

type CellProps = {
    data: CollectionData
    column: Column
    row: Row
    editable: boolean
    setCell: (rowId: string, columnId: string, value: CellValue) => void
    update: Update
}

function Cell(props: CellProps) {
    const {column, row} = props
    const value = row.cells[column.id] ?? null
    switch (column.type) {
        case "text":
            return <TextCell {...props} value={typeof value === "string" ? value : ""}/>
        case "url":
            return <UrlCell {...props} value={typeof value === "string" ? value : ""}/>
        case "number":
            return column.asProgress
                ? <ProgressCell {...props} value={typeof value === "number" ? value : null}/>
                : <NumberCell {...props} value={typeof value === "number" ? value : null}/>
        case "progress":
            return <ProgressCell {...props} value={typeof value === "number" ? value : null}/>
        case "checkbox":
            return (
                <label className="collection-check">
                    <input type="checkbox" checked={value === true} disabled={!props.editable}
                           onChange={event => props.setCell(row.id, column.id, event.target.checked || null)}/>
                </label>
            )
        case "date":
            return props.editable
                ? <input type="date" className="collection-input" value={typeof value === "string" ? value : ""}
                         onChange={event => props.setCell(row.id, column.id, event.target.value || null)}/>
                : <span className="collection-text">{typeof value === "string" ? value : ""}</span>
        case "select":
        case "multiSelect":
            return <SelectCell {...props} value={value}/>
        case "formula":
            return <FormulaCell {...props}/>
    }
}

/**
 * 치는 동안은 화면에만 두고, 칸을 나가거나 Enter 를 치면 적는다.
 * 치고 있지 않을 때(draft 가 null)는 저장된 값을 그대로 보여 주어, 다른 사람이 바꾼 값이 바로 따라온다.
 */
function useDraft(value: string, commit: (draft: string) => void) {
    const [draft, setDraft] = useState<string | null>(null)
    return {
        draft: draft ?? value,
        setDraft: (next: string) => setDraft(next),
        onBlur: () => {
            if (draft !== null && draft !== value) commit(draft)
            setDraft(null)
        },
    }
}

function TextCell({column, row, editable, setCell, value}: CellProps & { value: string }) {
    const {draft, setDraft, onBlur} = useDraft(value, next => setCell(row.id, column.id, next || null))
    const ref = useRef<HTMLTextAreaElement>(null)

    // 내용만큼 높이를 늘린다(field-sizing 을 못 쓰는 브라우저도 있다).
    useLayoutEffect(() => {
        const element = ref.current
        if (!element) return
        element.style.height = "auto"
        element.style.height = `${element.scrollHeight}px`
    }, [draft, column.width])

    if (!editable) return <span className="collection-text">{value}</span>
    return (
        <textarea ref={ref} rows={1} value={draft} className="collection-input collection-textarea"
                  onChange={event => setDraft(event.target.value)} onBlur={onBlur}
                  onKeyDown={event => {
                      if (event.nativeEvent.isComposing) return
                      // 줄바꿈은 Shift+Enter, Enter 는 적고 나간다.
                      if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault()
                          event.currentTarget.blur()
                      }
                  }}/>
    )
}

const SAFE_URL = /^https?:\/\//i

function UrlCell({column, row, editable, setCell, value}: CellProps & { value: string }) {
    const {draft, setDraft, onBlur} = useDraft(value, next => setCell(row.id, column.id, next.trim() || null))
    const href = SAFE_URL.test(value) ? value : /^[\w-]+(\.[\w-]+)+/.test(value) ? `https://${value}` : null
    if (!editable) {
        return href
            ? <a className="collection-text collection-link" href={href} target="_blank" rel="noopener noreferrer nofollow">{value}</a>
            : <span className="collection-text">{value}</span>
    }
    return (
        <div className="flex items-center">
            <input value={draft} className="collection-input min-w-0 flex-1" placeholder=""
                   onChange={event => setDraft(event.target.value)} onBlur={onBlur}
                   onKeyDown={event => {
                       if (!event.nativeEvent.isComposing && event.key === "Enter") event.currentTarget.blur()
                   }}/>
            {href && (
                <a href={href} target="_blank" rel="noopener noreferrer nofollow" title="열기"
                   className="collection-icon-button shrink-0">↗</a>
            )}
        </div>
    )
}

function NumberCell({column, row, editable, setCell, value}: CellProps & { value: number | null }) {
    const shown = value === null ? "" : String(value)
    const {draft, setDraft, onBlur} = useDraft(shown, next => {
        const number = parseFloat(next.replace(/,/g, ""))
        setCell(row.id, column.id, Number.isFinite(number) ? number : null)
    })
    if (!editable) return <span className="collection-text text-right block">{value === null ? "" : formatNumber(value)}</span>
    return (
        <input inputMode="decimal" value={draft} className="collection-input text-right"
               onChange={event => setDraft(event.target.value)} onBlur={onBlur}
               onKeyDown={event => {
                   if (!event.nativeEvent.isComposing && event.key === "Enter") event.currentTarget.blur()
               }}/>
    )
}

/** 진행도 막대. 막대를 누르거나 끌어서 맞춘다(5 단위). */
function ProgressBar({value, onChange}: { value: number | null, onChange?: (value: number) => void }) {
    const percent = value === null ? 0 : clampProgress(value)
    const pick = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!onChange) return
        const bar = event.currentTarget
        const set = (clientX: number) => {
            const rect = bar.getBoundingClientRect()
            onChange(Math.round(Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * 20) * 5)
        }
        set(event.clientX)
        const move = (move: PointerEvent) => set(move.clientX)
        const up = () => {
            window.removeEventListener("pointermove", move)
            window.removeEventListener("pointerup", up)
        }
        window.addEventListener("pointermove", move)
        window.addEventListener("pointerup", up)
    }
    return (
        <div className="collection-progress">
            <div className={`collection-progress-track ${onChange ? "cursor-pointer" : ""}`} onPointerDown={pick}
                 role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                <div className="collection-progress-fill" data-done={percent >= 100 || undefined}
                     style={{width: `${percent}%`}}/>
            </div>
            <span className="collection-progress-label">{value === null ? "" : `${percent}%`}</span>
        </div>
    )
}

function ProgressCell({column, row, editable, setCell, value}: CellProps & { value: number | null }) {
    // 끄는 동안은 화면에만 그리고 놓을 때 한 번 적는다(되돌리기가 한 칸씩 되돌리지 않게).
    const [dragging, setDragging] = useState<number | null>(null)
    const committed = useRef<number | null>(null)
    useEffect(() => {
        if (dragging === null) return
        const up = () => {
            if (committed.current !== null) setCell(row.id, column.id, committed.current)
            committed.current = null
            setDragging(null)
        }
        window.addEventListener("pointerup", up)
        return () => window.removeEventListener("pointerup", up)
    }, [dragging, setCell, row.id, column.id])

    return (
        <div className="px-2 py-1.5">
            <ProgressBar value={dragging ?? value}
                         onChange={editable ? next => {
                             committed.current = next
                             setDragging(next)
                         } : undefined}/>
        </div>
    )
}

function SelectCell({column, row, editable, update, value}: CellProps & { value: CellValue }) {
    const [anchor, setAnchor] = useState<HTMLElement | null>(null)
    const close = useCallback(() => setAnchor(null), [])
    const ids: string[] = Array.isArray(value) ? value : typeof value === "string" ? [value] : []
    const options = ids.map(id => optionOf(column, id)).filter((option): option is SelectOption => Boolean(option))

    const apply = useCallback(({options, value}: { options: SelectOption[], value: CellValue }) => update(current => ({
        ...current,
        columns: current.columns.map(item => (item.id === column.id ? {...item, options} : item)),
        rows: current.rows.map(item => {
            if (item.id !== row.id) return item
            const cells = {...item.cells}
            if (value === null) delete cells[column.id]
            else cells[column.id] = value
            return {...item, cells}
        }),
        // 지운 선택지를 고르고 있던 다른 행은 다음에 읽을 때 걸러진다(normalizeCollection).
    })), [update, column.id, row.id])

    return (
        <>
            <div className={`collection-tags ${editable ? "cursor-pointer hover:bg-accent-menu/20" : ""}`}
                 data-open={anchor ? "" : undefined}
                 tabIndex={editable ? 0 : -1}
                 onClick={event => editable && setAnchor(anchor ? null : event.currentTarget)}
                 onKeyDown={event => {
                     if (editable && (event.key === "Enter" || event.key === " ")) {
                         event.preventDefault()
                         setAnchor(event.currentTarget)
                     }
                 }}>
                {options.map(option => <TagBubble key={option.id} option={option}/>)}
            </div>
            {anchor && (
                <Popover anchor={anchor} onClose={close} width={260}>
                    <OptionPicker column={column} value={value} apply={next => {
                        apply(next)
                        if (column.type === "select" && next.value !== null) close()
                    }}/>
                </Popover>
            )}
        </>
    )
}

function FormulaCell({data, column, row}: CellProps) {
    const {value, error} = formulaValue(data, column, row)
    if (error) return <span className="collection-text collection-formula-error" title={error}>⚠ {error}</span>
    if (column.asProgress && (typeof value === "number" || value === null)) {
        return <div className="px-2 py-1.5"><ProgressBar value={typeof value === "number" ? value : null}/></div>
    }
    return <span className={`collection-text ${typeof value === "number" ? "text-right block" : ""}`}>{formulaText(value)}</span>
}
