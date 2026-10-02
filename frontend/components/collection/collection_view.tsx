"use client"

import {
    CSSProperties, FocusEvent as ReactFocusEvent, FormEvent, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent,
    ReactNode, RefObject, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState,
} from "react"
import {NodeViewProps, NodeViewWrapper} from "@tiptap/react"
import {
    AlignCenter, AlignLeft, AlignRight, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd, AlignVerticalJustifyStart,
    ArrowDown, ArrowUp, Eraser, GripVertical, Plus, Trash2,
} from "lucide-react"
import {
    CALC_LABEL, calcsFor, calcText, CellAlign, CellFormat, CellValue, CellVerticalAlign, clampProgress, COLLECTION_LABEL, CollectionData, Column, COLUMN_TYPES,
    displayText, formatNumber, formulaText, formulaValue, MAX_COLUMN_WIDTH, MIN_COLUMN_WIDTH, newColumn, newRow, numberRows,
    optionOf,
    parseCollection, Row, SelectOption, serializeCollection, sortedRows, withFormat,
} from "@/lib/collection_core"
import {Popover} from "@/components/collection/popover"
import {OptionPicker, TagBubble} from "@/components/collection/option_picker"
import {ColumnMenu} from "@/components/collection/column_menu"
import {moveItem, startReorder} from "@/components/collection/reorder"
import {
    actionFor, cellAt, CellRange, editCell, focusCellAt, inputOf, inRange, isSelecting, markSelecting, pointOf, rangeOf,
    selectCell, startCellSelect, swallowNextClick,
} from "@/components/collection/cell_navigation"

type Update = (change: (data: CollectionData) => CollectionData) => void

/** 열 머리를 누르기 시작했을 때(끌어 옮기기) */
type ReorderStart = (event: ReactPointerEvent<HTMLElement>, index: number) => void

/** 줄 끝(행 지우기·열 더하기) 자리의 폭 */
const TAIL_WIDTH = 36
/** 줄 앞(행 손잡이) 자리의 폭 */
const GUTTER_WIDTH = 16

/** 그리드의 열 폭들. 왼쪽 끝은 행 손잡이 자리(고칠 수 있을 때만), 오른쪽 끝은 남는 폭을 다 차지한다. */
const gridTemplate = (widths: number[], editable: boolean) => [
    ...(editable ? [`${GUTTER_WIDTH}px`] : []),
    ...widths.map(width => `${width}px`),
    `minmax(${TAIL_WIDTH}px, 1fr)`,
].join(" ")

/** 고를 수 없는(저절로 채워지는) 칸. 여러 칸을 골라 지울 때 건너뛴다. */
const COMPUTED: Column["type"][] = ["formula", "id"]

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
 * 콜렉션의 노드 뷰. 내용은 노드의 data 속성(JSON) 하나에 있고, 고칠 때마다 속성을 통째로 바꾼다
 * (되돌리기·공동 편집이 그대로 따라온다). 글을 치는 칸은 치는 동안 화면에만 두었다가 칸을 나갈 때 적는다.
 */
export function CollectionView({node, updateAttributes, editor, getPos}: NodeViewProps) {
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
        // 새 행·ID 열에 번호를 바로 매겨 적는다(읽을 때도 매기지만, 적어 두어야 모두에게 같은 번호가 간다).
        const next = serializeCollection(numberRows(change(current)))
        if (next === currentRaw || editor.isDestroyed) return
        try {
            write({data: next})
        } catch {
            // 표가 이미 지워졌다(창이 닫히며 늦게 저장하는 경우).
        }
    }, [editor])

    // 열·행 끌어 옮기기. 끄는 동안은 화면에서만 그 자리로 옮겨 보이고, 놓을 때 한 번 적는다.
    const grid = useRef<HTMLDivElement>(null)
    const [preview, setPreview] = useState<{ kind: "column" | "row", id: string, from: number, to: number } | null>(null)

    const sorted = useMemo(() => sortedRows(data), [data])
    const columns = preview?.kind === "column" ? moveItem(data.columns, preview.from, preview.to) : data.columns
    const rows = preview?.kind === "row" ? moveItem(sorted, preview.from, preview.to) : sorted

    const gridTemplateColumns = gridTemplate(columns.map(column => column.width), editable)
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

    const startColumnDrag: ReorderStart = (event, index) => {
        // 손가락으로는 표를 가로로 밀어 보는 일이 더 잦다. 열 옮기기는 마우스로만(메뉴의 왼쪽·오른쪽으로도 된다).
        if (event.pointerType !== "mouse" || !grid.current) return
        const id = data.columns[index].id
        startReorder({
            event, axis: "x", from: index, grid: grid.current,
            targets: [...grid.current.querySelectorAll<HTMLElement>("[role=columnheader]")],
            onPreview: to => setPreview(to === null ? null : {kind: "column", id, from: index, to}),
            onDrop: (from, to) => update(current => ({...current, columns: moveItem(current.columns, from, to)})),
        })
    }

    const startRowDrag = (event: ReactPointerEvent<HTMLElement>, index: number) => {
        if (!grid.current) return
        event.preventDefault()
        const id = sorted[index].id
        startReorder({
            event, axis: "y", from: index, grid: grid.current,
            targets: [...grid.current.querySelectorAll<HTMLElement>("[data-row-first]")],
            onPreview: to => setPreview(to === null ? null : {kind: "row", id, from: index, to}),
            // 정렬 중에는 손잡이를 감추므로 화면 순서가 곧 저장 순서다.
            onDrop: (from, to) => update(current => ({...current, rows: moveItem(current.rows, from, to)})),
        })
    }

    // 새 행을 넣으면 그 행 첫 칸에서 바로 쓰기 시작한다.
    const focusRow = useRef<string | null>(null)
    const addRow = () => {
        const row = newRow()
        focusRow.current = row.id
        update(current => {
            // 바로 위(마지막) 행의 칸 정렬을 이어받는다. 내용은 비운다.
            const above = current.rows[current.rows.length - 1]
            const format = above?.format && structuredClone(above.format)
            return {...current, rows: [...current.rows, format ? {...row, format} : row]}
        })
    }
    useEffect(() => {
        const id = focusRow.current
        if (!id || !grid.current) return
        const field = grid.current.querySelector<HTMLElement>(
            `[data-row-id="${id}"] [data-row-first] :is(textarea, input:not([type=checkbox]))`)
        if (!field) return
        focusRow.current = null
        field.focus()
    }, [rows])
    // ---- 여러 칸 고르기
    const [selection, setSelection] = useState<CellRange | null>(null)
    const [selectionAnchor, setSelectionAnchor] = useState<HTMLElement | null>(null)
    const clearSelection = useCallback(() => setSelection(null), [])
    // 고른 칸 중 왼쪽 위 칸에 정렬 막대를 붙인다(위로 띄운다).
    useLayoutEffect(() => {
        setSelectionAnchor(selection && grid.current
            ? cellAt(grid.current, {r: selection.top, c: selection.left})
            : null)
    }, [selection, rows, columns])

    /** 고른 칸들(화면 순서의 행·열)마다 행을 고친다. */
    const updateSelected = (change: (row: Row, column: Column) => Row) => {
        if (!selection) return
        const rowIds = rows.slice(selection.top, selection.bottom + 1).map(row => row.id)
        const picked = columns.slice(selection.left, selection.right + 1)
        update(current => ({
            ...current,
            rows: current.rows.map(row => (rowIds.includes(row.id)
                ? picked.reduce((next, column) => change(next, column), row)
                : row)),
        }))
    }
    const formatSelected = (patch: CellFormat) => updateSelected((row, column) => withFormat(row, column.id, patch))
    const clearSelected = () => updateSelected((row, column) => {
        if (COMPUTED.includes(column.type) || !(column.id in row.cells)) return row
        const cells = {...row.cells}
        delete cells[column.id]
        return {...row, cells}
    })

    const onGridPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!editable || !grid.current) return
        const point = pointOf(event.target as Element)
        if (!point) return
        // 고른 글 칸의 입력칸을 누르면 입력 상태로
        const pressed = (event.target as HTMLElement).closest<HTMLElement>("[data-cell]")
        if (pressed && event.target !== pressed && !event.shiftKey) markSelecting(pressed, false)
        // Shift 를 누르고 누르면 지금 칸부터 누른 칸까지 고른다.
        const active = pointOf(document.activeElement)
        if (event.shiftKey && (active || selection)) {
            event.preventDefault()
            const from = selection ? {r: selection.top, c: selection.left} : active!
            setSelection(rangeOf(from, point))
            swallowNextClick()
            ;(document.activeElement as HTMLElement | null)?.blur()
            grid.current.focus({preventScroll: true})
            return
        }
        setSelection(null)
        startCellSelect({
            event, grid: grid.current,
            onRange: setSelection,
            // 고른 다음 Delete·Esc·화살표를 받도록 그리드에 포커스를 둔다.
            onEnd: () => grid.current?.focus({preventScroll: true}),
        })
    }

    // ---- 키보드로 칸 옮겨 다니기

    /** 콜렉션 밖으로 나가 위·아래 글에 커서를 둔다. 붙어 있는 글 줄이 없으면 빈 줄을 만든다. */
    const leave = (side: "before" | "after") => {
        // 쓰던 칸을 먼저 적는다. 에디터로 포커스를 옮기는 도중에 적으면 서로 다른 문서 상태로 고치게 된다.
        ;(document.activeElement as HTMLElement | null)?.blur()
        const pos = getPos()
        if (typeof pos !== "number" || editor.isDestroyed) return
        const self = editor.state.doc.nodeAt(pos)
        if (!self) return
        if (side === "after") {
            const end = pos + self.nodeSize
            if (editor.state.doc.resolve(end).nodeAfter?.isTextblock) editor.commands.setTextSelection(end + 1)
            else editor.chain().insertContentAt(end, {type: "paragraph"}).setTextSelection(end + 1).run()
        } else if (editor.state.doc.resolve(pos).nodeBefore?.isTextblock) {
            editor.commands.setTextSelection(pos - 1)
        } else {
            editor.chain().insertContentAt(pos, {type: "paragraph"}).setTextSelection(pos + 1).run()
        }
        // 명령의 focus() 는 다음 프레임에 포커스를 옮겨, 그사이 브라우저가 포커스를 body 에 두고 끝난다. 바로 옮긴다.
        editor.view.focus()
    }

    const title = useRef<HTMLInputElement>(null)

    const onGridKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
        if (!editable || !grid.current || event.defaultPrevented || event.nativeEvent.isComposing) return
        if (event.altKey || event.metaKey || event.ctrlKey) return

        if (selection) {
            if (event.key === "Delete" || event.key === "Backspace") {
                event.preventDefault()
                clearSelected()
            } else if (event.key === "Escape") {
                setSelection(null)
            } else if (event.key.startsWith("Arrow") || event.key === "Enter") {
                event.preventDefault()
                setSelection(null)
                focusCellAt(grid.current, {r: selection.top, c: selection.left}, "select")
            }
            return
        }

        const target = event.target as HTMLElement
        const cell = target.closest<HTMLElement>("[data-cell]")
        const point = pointOf(target)
        if (!cell || !point) return
        const selected = target === cell || isSelecting(cell)

        // 고른 칸에서 Delete·Backspace 는 칸을 비운다(수식·ID 는 그대로).
        if (selected && (event.key === "Delete" || event.key === "Backspace")) {
            event.preventDefault()
            const row = rows[point.r], column = columns[point.c]
            if (row && column && !COMPUTED.includes(column.type)) setCell(row.id, column.id, null)
            return
        }
        // 고른 글 칸에서 글자를 치면 입력칸에 그대로 들어가고 입력 상태가 된다(onGridInput).

        const action = actionFor(event, cell, point, rows.length, columns.length)
        if (!action) return
        event.preventDefault()

        if (action.kind === "stay") {
            // 입력을 마치고(한 번 빠져 적고) 그 칸을 고른 상태로
            if (target !== cell) target.blur()
            selectCell(cell)
        } else if (action.kind === "edit") {
            // 고른 칸에서 Enter: 글·날짜 칸은 입력, 선택·태그는 고르는 창, 체크박스는 체크
            if (inputOf(cell)) editCell(cell)
            else cell.querySelector<HTMLElement>(".collection-tags, input[type=checkbox]")?.click()
        } else if (action.to === "after") {
            leave("after")
        } else if (action.to === "title") {
            if (title.current) {
                title.current.focus()
                title.current.setSelectionRange(title.current.value.length, title.current.value.length)
            } else {
                leave("before")
            }
        } else if (!focusCellAt(grid.current, action.to, action.mode, action.caret)) {
            cell.focus()
        }
    }

    // 고른 글 칸에 글자가 들어오면(한글 조합 포함) 입력 상태로, 입력칸에서 빠지면 고른 표시를 걷는다.
    const onGridInput = (event: FormEvent<HTMLDivElement>) => {
        const cell = (event.target as HTMLElement).closest<HTMLElement>("[data-cell]")
        if (cell) markSelecting(cell, false)
    }
    const onGridBlur = (event: ReactFocusEvent<HTMLDivElement>) => {
        const cell = (event.target as HTMLElement).closest<HTMLElement>("[data-cell]")
        if (cell && event.target !== cell) markSelecting(cell, false)
    }

    const removeRow = (rowId: string) => update(current => ({...current, rows: current.rows.filter(row => row.id !== rowId)}))
    const addColumn = () => update(current => ({
        ...current,
        columns: [...current.columns, newColumn("text", `열 ${current.columns.length + 1}`)],
    }))

    return (
        <NodeViewWrapper className="collection-view" data-type="collection">
            <div contentEditable={false} className="select-none">
                <TitleInput ref={title} value={data.title} editable={editable}
                            onCommit={value => update(current => ({...current, title: value.slice(0, 200)}))}
                            onUp={() => leave("before")}
                            onDown={() => {
                                if (!grid.current || !focusCellAt(grid.current, {r: 0, c: 0}, "select")) leave("after")
                            }}/>
                <div className="collection-scroll"
                     style={{"--collection-gutter": editable ? `${GUTTER_WIDTH}px` : "0px"} as CSSProperties}>
                    <div ref={grid} className="collection-grid" style={{gridTemplateColumns}} role="table"
                         tabIndex={editable ? -1 : undefined}
                         onPointerDown={onGridPointerDown} onKeyDown={onGridKeyDown}
                         onInput={onGridInput} onCompositionStart={onGridInput} onBlur={onGridBlur}>
                        {/* 머리 */}
                        <div className="contents" role="row">
                            {editable && <div className="collection-gutter"/>}
                            {columns.map(column => (
                                <HeaderCell key={column.id} data={data} column={column} editable={editable} update={update}
                                            dragging={preview?.kind === "column" && preview.id === column.id}
                                            onReorderStart={event =>
                                                startColumnDrag(event, data.columns.findIndex(item => item.id === column.id))}/>
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
                            <div key={row.id} className="contents group/row" role="row" data-row-id={row.id}
                                 data-dragging={(preview?.kind === "row" && preview.id === row.id) || undefined}>
                                {editable && (
                                    <div className="collection-gutter">
                                        <button type="button" aria-label="행 옮기기"
                                                title={data.sort ? "정렬 중에는 옮길 수 없습니다" : "끌어서 옮기기"}
                                                disabled={Boolean(data.sort)}
                                                className="collection-icon-button collection-row-grip opacity-0
                                                           group-hover/row:opacity-100 max-md:opacity-60 disabled:!opacity-0"
                                                onPointerDown={event =>
                                                    startRowDrag(event, sorted.findIndex(item => item.id === row.id))}>
                                            <GripVertical size={14}/>
                                        </button>
                                    </div>
                                )}
                                {columns.map((column, columnIndex) => (
                                    <div key={column.id} className="collection-cell" role="cell"
                                         data-cell="" data-r={rowIndex} data-c={columnIndex}
                                         tabIndex={editable ? -1 : undefined}
                                         data-selected={inRange(selection, rowIndex, columnIndex) || undefined}
                                         data-align={row.format?.[column.id]?.align}
                                         data-valign={row.format?.[column.id]?.valign}
                                         data-row-first={columnIndex === 0 || undefined}
                                         data-dragging={(preview?.kind === "column" && preview.id === column.id) || undefined}
                                         data-pointer={editable ? POINTER[column.type] : undefined}
                                         onMouseDown={editable ? focusCell : undefined}>
                                        <Cell data={data} column={column} row={row} editable={editable}
                                              setCell={setCell} update={update}/>
                                    </div>
                                ))}
                                <div className="collection-cell collection-tail">
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

                        {/* 마지막 행 바로 아래 줄을 누르면 행이 늘어난다(노션처럼). */}
                        {editable && (
                            <div className="contents" role="row">
                                <div className="collection-gutter"/>
                                <button type="button" className="collection-add-row" style={{gridColumn: "2 / -1"}}
                                        onClick={addRow}>
                                    <Plus size={14}/> 새 행
                                </button>
                            </div>
                        )}

                        {selection && selectionAnchor && (
                            <Popover anchor={selectionAnchor} onClose={clearSelection} side="top" width={286}
                                     ignore={selectionAnchor.closest<HTMLElement>(".collection-grid")}>
                                <SelectionToolbar
                                    format={rows[selection.top]?.format?.[columns[selection.left]?.id]}
                                    onFormat={formatSelected} onClear={clearSelected}/>
                            </Popover>
                        )}

                        {showCalcRow && (
                            <div className="contents" role="row">
                                {editable && <div className="collection-gutter"/>}
                                {columns.map(column => (
                                    <CalcCell key={column.id} data={data} column={column} editable={editable} update={update}/>
                                ))}
                                <div className="collection-calc collection-tail"/>
                            </div>
                        )}
                    </div>
                </div>
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
    formula: undefined, id: undefined,
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

/** 제목. ↑ 는 콜렉션 위 글로, ↓·Enter 는 첫 칸으로 간다. */
function TitleInput({ref, value, editable, onCommit, onUp, onDown}: {
    ref: RefObject<HTMLInputElement | null>
    value: string
    editable: boolean
    onCommit: (value: string) => void
    onUp: () => void
    onDown: () => void
}) {
    const {draft, setDraft, onBlur} = useDraft(value, onCommit)
    if (!editable) return value ? <div className="collection-title">{value}</div> : null
    return (
        <input ref={ref} value={draft} placeholder={`${COLLECTION_LABEL} 제목`} className="collection-title"
               onChange={event => setDraft(event.target.value)}
               onBlur={onBlur}
               onKeyDown={event => {
                   if (event.nativeEvent.isComposing) return
                   if (event.key === "ArrowUp") {
                       event.preventDefault()
                       onUp()
                   } else if (event.key === "ArrowDown" || event.key === "Enter") {
                       event.preventDefault()
                       onDown()
                   }
               }}/>
    )
}

/** 여러 칸을 골랐을 때 위에 뜨는 막대: 가로·세로 정렬, 내용 지우기. */
function SelectionToolbar({format, onFormat, onClear}: {
    /** 왼쪽 위 칸의 정렬(지금 무엇이 켜져 있는지 보인다) */
    format: CellFormat | undefined
    onFormat: (patch: CellFormat) => void
    onClear: () => void
}) {
    const button = (active: boolean, label: string, icon: ReactNode, onClick: () => void) => (
        <button key={label} type="button" aria-label={label} title={label} aria-pressed={active} onClick={onClick}
                className={`collection-toolbar-button ${active ? "is-active" : ""}`}>
            {icon}
        </button>
    )
    const aligns: [CellAlign, string, ReactNode][] = [
        ["left", "왼쪽 정렬", <AlignLeft key="l" size={15}/>],
        ["center", "가운데 정렬", <AlignCenter key="c" size={15}/>],
        ["right", "오른쪽 정렬", <AlignRight key="r" size={15}/>],
    ]
    const valigns: [CellVerticalAlign, string, ReactNode][] = [
        ["top", "위로 정렬", <AlignVerticalJustifyStart key="t" size={15}/>],
        ["middle", "세로 가운데 정렬", <AlignVerticalJustifyCenter key="m" size={15}/>],
        ["bottom", "아래로 정렬", <AlignVerticalJustifyEnd key="b" size={15}/>],
    ]
    return (
        <div className="flex items-center gap-0.5">
            {aligns.map(([align, label, icon]) => button(format?.align === align, label, icon, () => onFormat({align})))}
            <span className="mx-1 h-4 w-px bg-border"/>
            {valigns.map(([valign, label, icon]) =>
                button(format?.valign === valign, label, icon, () => onFormat({valign})))}
            <span className="mx-1 h-4 w-px bg-border"/>
            {button(false, "내용 지우기 (Delete)", <Eraser size={15}/>, onClear)}
        </div>
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
            grid.style.gridTemplateColumns = gridTemplate(
                data.columns.map((item, i) => (i === index ? width : item.width)), editable)
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
                        className="collection-calc-button" data-empty={column.calc === "none" || undefined}
                        onClick={event => setAnchor(anchor ? null : event.currentTarget)}>
                    {column.calc === "none"
                        ? "Σ 계산"
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
        case "id":
            // 저절로 매기는 번호라 고칠 수 없다.
            return <span className="collection-text collection-id">{displayText(column, value)}</span>
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
        // Enter(아래 칸으로)·화살표는 그리드가 받는다(cell_navigation). 줄바꿈은 Shift+Enter.
        <textarea ref={ref} rows={1} value={draft} className="collection-input collection-textarea"
                  onChange={event => setDraft(event.target.value)} onBlur={onBlur}/>
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
                   onChange={event => setDraft(event.target.value)} onBlur={onBlur}/>
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
               onChange={event => setDraft(event.target.value)} onBlur={onBlur}/>
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
    const tags = useRef<HTMLDivElement>(null)
    const close = useCallback(() => {
        setAnchor(null)
        // 창을 닫으면(Esc, 하나 고르기) 이 칸을 고른 상태로 돌아와 화살표로 이어 간다.
        // 바깥을 눌러 닫았으면 그쪽으로 간 포커스를 빼앗지 않는다.
        requestAnimationFrame(() => {
            if (document.activeElement === document.body) tags.current?.closest<HTMLElement>("[data-cell]")?.focus()
        })
    }, [])
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
            <div ref={tags} className={`collection-tags ${editable ? "cursor-pointer hover:bg-accent-menu/20" : ""}`}
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
