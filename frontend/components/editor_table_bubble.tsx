"use client";

import React, {useEffect, useState} from "react";
import {Editor, useEditorState} from "@tiptap/react";
import {BubbleMenu} from "@tiptap/react/menus";
import {EditorState} from "@tiptap/pm/state";
import {EditorView} from "@tiptap/pm/view";
import {CellSelection, columnIsHeader, isInTable, rowIsHeader, selectedRect} from "@tiptap/pm/tables";
import {
    AlignCenter,
    AlignLeft,
    AlignRight,
    AlignVerticalJustifyCenter,
    AlignVerticalJustifyEnd,
    AlignVerticalJustifyStart,
    ArrowDownToLine,
    ArrowUpToLine,
    Ban,
    BetweenHorizontalEnd,
    BetweenHorizontalStart,
    BetweenVerticalEnd,
    BetweenVerticalStart,
    Check,
    ChevronDown,
    Columns3,
    Ellipsis,
    Heading,
    Minus,
    MoveHorizontal,
    PaintBucket,
    Plus,
    Rows3,
    SquareDashed,
    TableCellsMerge,
    TableCellsSplit,
    Trash2,
} from "lucide-react";

import {useClickOutside} from "@/hooks/useClickOutside";
import {
    autoFitColumns,
    autoFitTable,
    currentCellAttrs,
    selectLine,
    TABLE_CELL_COLORS,
    TABLE_WIDTH_STEP,
    TableCellAlign,
    TableCellVerticalAlign,
    tableBubbleAnchor,
    widenColumns,
    writeAroundTable,
} from "@/lib/table";

interface Props {
    editor: Editor;
    /** 에디터가 스크롤되는 요소. 말풍선이 이 스크롤을 따라 자리를 다시 잡는다. */
    scrollTarget?: HTMLElement | null;
}

type Menu = "row" | "column" | "align" | "color" | "more";

const NO_CELL = {
    align: null, verticalAlign: null, background: null, fixedWidth: false, headerRow: false, headerColumn: false,
    multiple: false, canMerge: false, canSplit: false,
}

/** 말풍선과 표 윗변(또는 툴바) 사이 */
const BUBBLE_GAP = 8

/*
 * 커서가 표 안에 있을 때만 뜬다. 글자를 골랐을 때는 서식 말풍선에 자리를 내준다.
 * 칸을 여러 개 골랐을 때(CellSelection)는 굵게·기울임보다 합치기·색칠이 쓸모 있어 이쪽이 뜬다.
 */
const shouldShow = ({editor, view, state, element}: {
    editor: Editor, view: EditorView, state: EditorState, element: HTMLElement
}) => {
    const {selection} = state
    const hasFocus = view.hasFocus() || element.contains(document.activeElement)
    return editor.isEditable && hasFocus && isInTable(state)
        && (selection.empty || selection instanceof CellSelection)
}

/**
 * 표 말풍선. 행·열 넣고 빼기, 정렬, 칸 배경, 열 폭, 합치기·나누기를 한곳에 모았다.
 *
 * 누르는 동안 에디터가 포커스를 잃지 않게 mousedown 을 막는다. 포커스가 빠지면 모바일은 키보드가
 * 내려갔다 올라오며 화면이 출렁이고, 고른 칸들(CellSelection)도 풀린다.
 */
export default function EditorTableBubble({editor, scrollTarget}: Props) {
    const [menu, setMenu] = useState<Menu | null>(null)
    const bubbleRef = useClickOutside<HTMLDivElement>(() => setMenu(null), menu !== null)

    // shouldRerenderOnTransaction 이 꺼져 있어 필요한 값만 구독한다.
    const current = useEditorState({
        editor,
        selector: ({editor}) => {
            const attrs = currentCellAttrs(editor)
            if (!attrs) return null
            const {map, table, top, left} = selectedRect(editor.state)
            return {
                align: (attrs.align as TableCellAlign | null) ?? null,
                verticalAlign: (attrs.verticalAlign as TableCellVerticalAlign | null) ?? null,
                background: (attrs.backgroundColor as string | null) ?? null,
                fixedWidth: Array.isArray(attrs.colwidth) && attrs.colwidth.some(Boolean),
                headerRow: rowIsHeader(map, table, top),
                headerColumn: columnIsHeader(map, table, left),
                multiple: editor.state.selection instanceof CellSelection,
                canMerge: editor.can().mergeCells(),
                canSplit: editor.can().splitCell(),
            }
        },
        equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b),
    })

    // 말풍선이 올라갈 수 있는 한계. 편집 화면 위에 붙은 툴바(sticky)에 가리지 않게 그 아래까지만 간다.
    const minTop = () => {
        const toolbar = scrollTarget?.querySelector<HTMLElement>(":scope > .sticky")
        const ceiling = toolbar?.getBoundingClientRect().bottom ?? scrollTarget?.getBoundingClientRect().top ?? 0
        return ceiling + (bubbleRef.current?.offsetHeight ?? 36) + BUBBLE_GAP * 2
    }

    /*
     * 표 밖에서도 내용을 늘 그려 둔다. 말풍선은 뜨는 순간 제 크기로 자리를 잡는데,
     * 그때 내용이 비어 있으면 높이·폭이 0 으로 잡혀 표 윗줄을 덮고 가운데에서도 비껴난다.
     */
    const cell = current ?? NO_CELL

    // 표를 벗어났다 돌아오면 열어 두었던 메뉴가 그대로 뜨지 않게, 표를 벗어나는 순간 닫는다.
    useEffect(() => {
        const closeOutsideTable = () => {
            if (!isInTable(editor.state)) setMenu(null)
        }
        editor.on("selectionUpdate", closeOutsideTable)
        return () => {
            editor.off("selectionUpdate", closeOutsideTable)
        }
    }, [editor])

    // 누르는 동안에도 포커스는 에디터에 남아 있으므로 Esc 는 문서에서 듣는다.
    useEffect(() => {
        if (!menu) return
        const close = (event: KeyboardEvent) => {
            if (event.key === "Escape") setMenu(null)
        }
        document.addEventListener("keydown", close)
        return () => document.removeEventListener("keydown", close)
    }, [menu])

    const run = (command: () => unknown, keepOpen = false) => {
        command()
        if (!keepOpen) setMenu(null)
    }
    const chain = () => editor.chain().focus()

    const toggleMenu = (next: Menu) => setMenu(value => (value === next ? null : next))

    const barButton = (on: boolean) =>
        `flex items-center gap-0.5 px-2 py-1 pointer-coarse:px-2.5 pointer-coarse:py-2 rounded text-xs
         cursor-pointer transition-colors duration-150 ${on ? "bg-surface text-foreground" : "text-white hover:bg-surface/10"}
         focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white`

    const menuItem = (danger = false) =>
        `w-full flex items-center gap-2 px-3 py-2 pointer-coarse:py-2.5 text-left text-sm cursor-pointer transition-colors
         ${danger ? "text-danger hover:bg-danger-soft" : "text-foreground hover:bg-background"}
         disabled:opacity-40 disabled:cursor-default disabled:hover:bg-transparent`

    const divider = <div className="w-px h-4 bg-white/20 mx-0.5" aria-hidden/>
    const menuDivider = <div className="h-px bg-border my-1" role="separator"/>

    const menuButton = (value: Menu, label: string, content: React.ReactNode, extraClass = "") => (
        <button type="button" className={`${barButton(menu === value)} ${extraClass}`}
                aria-label={label} title={label} aria-haspopup="menu" aria-expanded={menu === value}
                onClick={() => toggleMenu(value)}>
            {content}
        </button>
    )

    const popover = (align: "left" | "right", label: string, children: React.ReactNode) => (
        <div role="menu" aria-label={label}
             className={`absolute top-full mt-1.5 ${align === "left" ? "left-0" : "right-0"} min-w-48 py-1
                         bg-surface border border-border rounded-lg shadow-xl overflow-hidden`}>
            {children}
        </div>
    )

    return (
        <BubbleMenu
            editor={editor}
            pluginKey="tableBubbleMenu"
            shouldShow={shouldShow}
            getReferencedVirtualElement={() => tableBubbleAnchor(editor, minTop)}
            // 화면에 붙여 둔다(fixed). 아래로 뒤집히면 긴 표에서 말풍선이 표 한가운데로 뛰어든다.
            options={{
                placement: "top", offset: BUBBLE_GAP, strategy: "fixed", flip: false,
                scrollTarget: scrollTarget ?? undefined,
            }}
            style={{zIndex: 9999}}
        >
            <div ref={bubbleRef} role="toolbar" aria-label="표 편집"
                 className="relative flex items-center gap-0.5 bg-foreground rounded-lg px-1.5 py-1 shadow-lg"
                 onMouseDown={event => event.preventDefault()}>

                {/* ── 행 ── */}
                <div className="relative">
                    {menuButton("row", "행", <><Rows3 size={14}/><span>행</span><ChevronDown size={11}/></>)}
                    {menu === "row" && popover("left", "행", <>
                        <button type="button" role="menuitem" className={menuItem()}
                                onClick={() => run(() => chain().addRowBefore().run())}>
                            <BetweenHorizontalStart size={15}/> 위에 행 넣기
                        </button>
                        <button type="button" role="menuitem" className={menuItem()}
                                onClick={() => run(() => chain().addRowAfter().run())}>
                            <BetweenHorizontalEnd size={15}/> 아래에 행 넣기
                        </button>
                        {menuDivider}
                        <button type="button" role="menuitem" className={menuItem()}
                                onClick={() => run(() => selectLine(editor, "row"))}>
                            <SquareDashed size={15}/> 행 전체 고르기
                        </button>
                        <button type="button" role="menuitemcheckbox" aria-checked={cell.headerRow}
                                className={menuItem()}
                                onClick={() => run(() => chain().toggleHeaderRow().run())}>
                            <Heading size={15}/> 머리글 행
                            {cell.headerRow && <Check size={15} className="ml-auto text-accent"/>}
                        </button>
                        {menuDivider}
                        <button type="button" role="menuitem" className={menuItem(true)}
                                onClick={() => run(() => chain().deleteRow().run())}>
                            <Trash2 size={15}/> 행 지우기
                        </button>
                    </>)}
                </div>

                {/* ── 열 ── */}
                <div className="relative">
                    {menuButton("column", "열", <><Columns3 size={14}/><span>열</span><ChevronDown size={11}/></>)}
                    {menu === "column" && popover("left", "열", <>
                        <button type="button" role="menuitem" className={menuItem()}
                                onClick={() => run(() => chain().addColumnBefore().run())}>
                            <BetweenVerticalStart size={15}/> 왼쪽에 열 넣기
                        </button>
                        <button type="button" role="menuitem" className={menuItem()}
                                onClick={() => run(() => chain().addColumnAfter().run())}>
                            <BetweenVerticalEnd size={15}/> 오른쪽에 열 넣기
                        </button>
                        {menuDivider}
                        {/* 좁은 화면은 열 폭을 늘 자동으로 보여 주므로(globals.css) 맞춰도 보이지 않는다. */}
                        <p className="md:hidden px-3 py-1.5 text-xs text-subtle leading-relaxed">
                            좁은 화면에서는 열 너비를 내용에 맞춰 자동으로 보여 줘요.
                        </p>
                        {/* 폭은 여러 번 눌러 맞추므로 누른 뒤에도 메뉴를 닫지 않는다. */}
                        <div className="max-md:hidden flex items-center gap-2 px-3 py-1.5 text-sm text-foreground"
                             title="마우스로는 열 경계를 끌어서도 맞출 수 있습니다">
                            <MoveHorizontal size={15} aria-hidden/>
                            <span className="mr-auto whitespace-nowrap">열 너비</span>
                            <div className="flex items-center border border-border rounded-md overflow-hidden">
                                <button type="button" aria-label="열 좁게"
                                        className="px-2 py-1 pointer-coarse:px-3 pointer-coarse:py-2 hover:bg-background cursor-pointer"
                                        onClick={() => run(() => widenColumns(editor, -TABLE_WIDTH_STEP), true)}>
                                    <Minus size={13}/>
                                </button>
                                <button type="button" aria-pressed={!cell.fixedWidth}
                                        aria-label="열 너비 자동"
                                        className={`px-2 py-1 pointer-coarse:py-2 text-xs border-x border-border cursor-pointer
                                                    ${cell.fixedWidth ? "hover:bg-background" : "bg-accent-soft text-accent font-medium"}`}
                                        onClick={() => run(() => autoFitColumns(editor), true)}>
                                    자동
                                </button>
                                <button type="button" aria-label="열 넓게"
                                        className="px-2 py-1 pointer-coarse:px-3 pointer-coarse:py-2 hover:bg-background cursor-pointer"
                                        onClick={() => run(() => widenColumns(editor, TABLE_WIDTH_STEP), true)}>
                                    <Plus size={13}/>
                                </button>
                            </div>
                        </div>
                        {menuDivider}
                        <button type="button" role="menuitem" className={menuItem()}
                                onClick={() => run(() => selectLine(editor, "column"))}>
                            <SquareDashed size={15}/> 열 전체 고르기
                        </button>
                        <button type="button" role="menuitemcheckbox" aria-checked={cell.headerColumn}
                                className={menuItem()}
                                onClick={() => run(() => chain().toggleHeaderColumn().run())}>
                            <Heading size={15}/> 머리글 열
                            {cell.headerColumn && <Check size={15} className="ml-auto text-accent"/>}
                        </button>
                        {menuDivider}
                        <button type="button" role="menuitem" className={menuItem(true)}
                                onClick={() => run(() => chain().deleteColumn().run())}>
                            <Trash2 size={15}/> 열 지우기
                        </button>
                    </>)}
                </div>

                {divider}

                {/* ── 정렬: 고른 칸(들)에 건다. 열 전체를 맞추려면 '열 전체 고르기' 뒤에 누른다.
                     가로·세로 여섯 개를 늘어놓으면 모바일 폭을 넘어 한 버튼 아래 모은다. 버튼 아이콘이 지금 가로 정렬이다. ── */}
                <div className="relative">
                    {menuButton("align", "정렬", <>
                        {cell.align === "center" ? <AlignCenter size={14}/>
                            : cell.align === "right" ? <AlignRight size={14}/> : <AlignLeft size={14}/>}
                        <ChevronDown size={11}/>
                    </>)}
                    {menu === "align" && (
                        <div role="menu" aria-label="정렬"
                             className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 p-2 grid gap-1.5
                                        bg-surface border border-border rounded-lg shadow-xl">
                            {([
                                ["가로", "align", cell.align ?? "left", "left", [
                                    ["left", "왼쪽 정렬", <AlignLeft key="l" size={15}/>],
                                    ["center", "가운데 정렬", <AlignCenter key="c" size={15}/>],
                                    ["right", "오른쪽 정렬", <AlignRight key="r" size={15}/>],
                                ]],
                                ["세로", "verticalAlign", cell.verticalAlign ?? "top", "top", [
                                    ["top", "위로 정렬", <AlignVerticalJustifyStart key="t" size={15}/>],
                                    ["middle", "세로 가운데 정렬", <AlignVerticalJustifyCenter key="m" size={15}/>],
                                    ["bottom", "아래로 정렬", <AlignVerticalJustifyEnd key="b" size={15}/>],
                                ]],
                            ] as const).map(([axis, attribute, currentValue, fallback, options]) => (
                                <div key={axis} role="group" aria-label={`${axis} 정렬`} className="flex items-center gap-1">
                                    <span className="w-7 text-[11px] text-subtle">{axis}</span>
                                    {options.map(([value, label, icon]) => {
                                        const on = currentValue === value
                                        return (
                                            <button key={value} type="button" role="menuitemradio" aria-checked={on}
                                                    aria-label={label} title={label}
                                                    className={`w-8 h-8 pointer-coarse:w-10 pointer-coarse:h-10 rounded-md
                                                                flex items-center justify-center cursor-pointer transition-colors
                                                                ${on ? "bg-accent-soft text-accent" : "text-foreground hover:bg-background"}`}
                                                    // 기본값(왼쪽·위)은 속성을 비워 저장해 둔다.
                                                    onClick={() => run(() => chain()
                                                        .setCellAttribute(attribute, value === fallback ? null : value).run(), true)}>
                                                {icon}
                                            </button>
                                        )
                                    })}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {divider}

                {/* ── 배경 ── */}
                <div className="relative">
                    {menuButton("color", "칸 배경색", <>
                        <PaintBucket size={14}/>
                        <span aria-hidden className="w-2.5 h-2.5 rounded-full border border-white/40"
                              style={{background: cell.background ?? "transparent"}}/>
                    </>)}
                    {menu === "color" && (
                        <div role="menu" aria-label="칸 배경색"
                             className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 p-2
                                        bg-surface border border-border rounded-lg shadow-xl">
                            <div className="grid grid-cols-3 gap-1.5 w-max">
                                <button type="button" role="menuitemradio" aria-checked={!cell.background}
                                        aria-label="배경 없음" title="배경 없음"
                                        className={`w-8 h-8 pointer-coarse:w-10 pointer-coarse:h-10 rounded-md border cursor-pointer
                                                    flex items-center justify-center bg-surface text-subtle
                                                    ${!cell.background ? "ring-2 ring-accent ring-offset-1 border-transparent" : "border-border-strong"}`}
                                        onClick={() => run(() => chain().setCellAttribute("backgroundColor", null).run())}>
                                    <Ban size={14}/>
                                </button>
                                {TABLE_CELL_COLORS.map(({name, value}) => {
                                    const on = cell.background?.toUpperCase() === value
                                    return (
                                        <button key={value} type="button" role="menuitemradio" aria-checked={on}
                                                aria-label={name} title={name}
                                                className={`w-8 h-8 pointer-coarse:w-10 pointer-coarse:h-10 rounded-md border cursor-pointer
                                                            flex items-center justify-center text-foreground
                                                            ${on ? "ring-2 ring-accent ring-offset-1 border-transparent" : "border-black/10"}`}
                                                style={{background: value}}
                                                onClick={() => run(() => chain().setCellAttribute("backgroundColor", value).run())}>
                                            {on && <Check size={14}/>}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {divider}

                {/* ── 합치기·표 전체 ── */}
                <div className="relative">
                    {menuButton("more", "표 더 보기", <Ellipsis size={14}/>)}
                    {menu === "more" && popover("right", "표", <>
                        <button type="button" role="menuitem" className={menuItem()} disabled={!cell.canMerge}
                                title={cell.canMerge ? undefined : "칸을 두 개 이상 끌어서 고르면 합칠 수 있습니다"}
                                onClick={() => run(() => chain().mergeCells().run())}>
                            <TableCellsMerge size={15}/> 칸 합치기
                        </button>
                        <button type="button" role="menuitem" className={menuItem()} disabled={!cell.canSplit}
                                onClick={() => run(() => chain().splitCell().run())}>
                            <TableCellsSplit size={15}/> 칸 나누기
                        </button>
                        {menuDivider}
                        {/* 표가 문서 맨 앞·맨 끝이거나 다른 표에 붙어 있으면 그 사이에 쓸 길이 이것뿐일 수 있다. */}
                        <button type="button" role="menuitem" className={menuItem()}
                                onClick={() => run(() => writeAroundTable(editor, "above"))}>
                            <ArrowUpToLine size={15}/> 표 위에 글 쓰기
                        </button>
                        <button type="button" role="menuitem" className={menuItem()}
                                onClick={() => run(() => writeAroundTable(editor, "below"))}>
                            <ArrowDownToLine size={15}/> 표 아래에 글 쓰기
                        </button>
                        {menuDivider}
                        <button type="button" role="menuitem" className={menuItem()}
                                onClick={() => run(() => autoFitTable(editor))}>
                            <MoveHorizontal size={15}/> 모든 열 너비 자동
                        </button>
                        {menuDivider}
                        <button type="button" role="menuitem" className={menuItem(true)}
                                onClick={() => run(() => chain().deleteTable().run())}>
                            <Trash2 size={15}/> 표 지우기
                        </button>
                    </>)}
                </div>
            </div>
        </BubbleMenu>
    );
}
