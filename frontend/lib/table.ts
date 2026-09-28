import {Editor} from "@tiptap/core";
import {TableCell, TableHeader} from "@tiptap/extension-table";
import {CellSelection, isInTable, selectedRect} from "@tiptap/pm/tables";
import {openLineAt} from "@/lib/open_line";

/*
 * 표.
 *
 * 폭은 손대지 않으면 내용에 맞춰 자동으로 나뉜다(table-layout: auto). 경계를 끌거나 말풍선에서
 * 넓히고 좁힌 열만 그 폭(colwidth)을 기억하고, 나머지 열은 계속 자동으로 남은 자리를 나눠 갖는다.
 * 터치 화면에서는 경계를 끌 수 없어(열 조절 플러그인이 마우스만 듣는다) 말풍선 버튼이 그 길이다.
 */

/** 열이 이보다 좁아지지 않는다. 경계를 끌 때의 하한이고, CSS 의 칸 최소 폭(+ 안쪽 여백)과 맞춘다. */
export const TABLE_CELL_MIN_WIDTH = 64

/** 말풍선의 넓게·좁게 한 번에 움직이는 폭 */
export const TABLE_WIDTH_STEP = 32

/*
 * 칸 배경. 글자색은 그대로 두므로 모두 옅은 색이라 어느 색 위에서도 본문 글자가 또렷하다(대비 12:1 이상).
 * 저장된 노트에 값이 그대로 남으니, 바꾸면 예전 노트의 색은 목록에서 '고른 색'으로 표시되지 않는다.
 */
export const TABLE_CELL_COLORS = [
    {name: "회색", value: "#F1F1EF"},
    {name: "빨강", value: "#FBE4E4"},
    {name: "주황", value: "#FCEBDC"},
    {name: "노랑", value: "#FBF3DB"},
    {name: "초록", value: "#E4F1EA"},
    {name: "파랑", value: "#E3EEF8"},
    {name: "보라", value: "#EEE7F7"},
    {name: "분홍", value: "#F9E4EF"},
] as const

export type TableCellAlign = "left" | "center" | "right"
export type TableCellVerticalAlign = "top" | "middle" | "bottom"

/*
 * 칸 속성: 배경색과 세로 정렬.
 *
 * 배경색은 style 만 두면 다시 읽을 때 브라우저가 rgb(...) 로 바꿔 돌려주어 고른 색을 알아볼 수 없다.
 * 고른 값은 data- 속성으로도 적어 두고 그쪽을 먼저 읽는다.
 */
const cellAttributes = {
    backgroundColor: {
        default: null,
        parseHTML: (element: HTMLElement) =>
            element.getAttribute("data-background-color") || element.style.backgroundColor || null,
        renderHTML: (attributes: { backgroundColor?: string | null }) =>
            attributes.backgroundColor
                ? {
                    "data-background-color": attributes.backgroundColor,
                    style: `background-color: ${attributes.backgroundColor}`,
                }
                : {},
    },
    // 세로 정렬. 정하지 않으면 위(CSS 기본)다. 가로 정렬(align)은 표 확장이 이미 갖고 있다.
    verticalAlign: {
        default: null,
        parseHTML: (element: HTMLElement) => {
            const value = element.style.verticalAlign
            return value === "middle" || value === "bottom" ? value : null
        },
        renderHTML: (attributes: { verticalAlign?: string | null }) =>
            attributes.verticalAlign ? {style: `vertical-align: ${attributes.verticalAlign}`} : {},
    },
}

export const CustomTableCell = TableCell.extend({
    addAttributes() {
        return {...this.parent?.(), ...cellAttributes}
    },
})

export const CustomTableHeader = TableHeader.extend({
    addAttributes() {
        return {...this.parent?.(), ...cellAttributes}
    },
})

/** 커서(또는 고른 칸들)가 놓인 열 범위의 지금 폭. 정해 둔 폭이 없으면 화면에 그려진 폭을 잰다. */
function currentColumnWidths(editor: Editor, left: number, right: number): number[] {
    const {map, table, tableStart} = selectedRect(editor.state)
    const widths: number[] = []

    for (let col = left; col < right; col++) {
        let width = 0
        for (let row = 0; row < map.height && !width; row++) {
            const pos = map.map[row * map.width + col]
            const cell = table.nodeAt(pos)
            if (!cell) continue
            const stored = cell.attrs.colwidth?.[col - map.colCount(pos)]
            if (stored) {
                width = stored
            } else if (cell.attrs.colspan === 1) {
                const dom = editor.view.nodeDOM(tableStart + pos) as HTMLElement | null
                width = dom?.getBoundingClientRect().width ?? 0
            }
        }
        widths.push(Math.round(width) || TABLE_CELL_MIN_WIDTH)
    }
    return widths
}

/**
 * 고른 열들의 폭을 바꾼다. next 가 null 을 돌려주면 그 열은 다시 자동 폭이 된다.
 * 여러 열에 걸친(병합된) 칸은 colwidth 가 열마다 한 칸씩인 배열이라, 해당 자리만 고친다.
 */
function updateColumnWidths(editor: Editor, columns: "selected" | "all",
                            next: (current: number) => number | null) {
    const {state} = editor
    if (!isInTable(state)) return false

    const rect = selectedRect(state)
    const {map, table, tableStart} = rect
    const [left, right] = columns === "all" ? [0, map.width] : [rect.left, rect.right]
    const current = currentColumnWidths(editor, left, right)

    const pending = new Map<number, number[]>()
    for (let row = 0; row < map.height; row++) {
        for (let col = left; col < right; col++) {
            const pos = map.map[row * map.width + col]
            const cell = table.nodeAt(pos)
            if (!cell) continue
            const widths = pending.get(pos)
                ?? (cell.attrs.colwidth ? [...cell.attrs.colwidth] : Array(cell.attrs.colspan).fill(0))
            const width = next(current[col - left])
            widths[col - map.colCount(pos)] = width === null ? 0 : Math.max(TABLE_CELL_MIN_WIDTH, width)
            pending.set(pos, widths)
        }
    }

    const tr = state.tr
    pending.forEach((widths, pos) => {
        const cell = table.nodeAt(pos)!
        tr.setNodeMarkup(tableStart + pos, null, {
            ...cell.attrs,
            colwidth: widths.some(Boolean) ? widths : null,
        })
    })
    editor.view.dispatch(tr)
    editor.commands.focus()
    return true
}

export const widenColumns = (editor: Editor, delta: number) =>
    updateColumnWidths(editor, "selected", width => width + delta)

export const autoFitColumns = (editor: Editor) =>
    updateColumnWidths(editor, "selected", () => null)

export const autoFitTable = (editor: Editor) =>
    updateColumnWidths(editor, "all", () => null)

/** 지금 칸이 들어 있는 행(또는 열) 전체를 고른다. 모바일은 칸을 끌어 여러 개 고르기가 어렵다. */
export function selectLine(editor: Editor, line: "row" | "column") {
    const {state} = editor
    if (!isInTable(state)) return false

    const {map, table, tableStart, left, top} = selectedRect(state)
    const [first, last] = line === "row"
        ? [map.positionAt(top, 0, table), map.positionAt(top, map.width - 1, table)]
        : [map.positionAt(0, left, table), map.positionAt(map.height - 1, left, table)]
    const $first = state.doc.resolve(tableStart + first)
    const $last = state.doc.resolve(tableStart + last)
    const selection = line === "row"
        ? CellSelection.rowSelection($first, $last)
        : CellSelection.colSelection($first, $last)

    editor.view.dispatch(state.tr.setSelection(selection))
    editor.commands.focus()
    return true
}

/** 표 바로 위나 아래에 글 쓸 줄을 연다. 이미 빈 줄이 붙어 있으면 그리로 간다. */
export function writeAroundTable(editor: Editor, side: "above" | "below") {
    if (!isInTable(editor.state)) return false
    const {table, tableStart} = selectedRect(editor.state)
    const tablePos = tableStart - 1
    return openLineAt(editor.view, side === "above" ? tablePos : tablePos + table.nodeSize)
}

/** 커서가 놓인 칸(여러 칸을 골랐으면 그 첫 칸)의 속성 */
export function currentCellAttrs(editor: Editor): Record<string, unknown> | null {
    const {state} = editor
    if (!isInTable(state)) return null
    const {map, table, top, left} = selectedRect(state)
    return table.nodeAt(map.positionAt(top, left, table))?.attrs ?? null
}

/**
 * 말풍선을 붙일 자리. 어느 칸을 눌러도 표 윗변 가운데(가로는 화면에 보이는 만큼)에 뜬다.
 * 긴 표를 내려 윗변이 가려지면 minTop(툴바 아래 + 말풍선 높이)에 붙어 따라오고,
 * 표가 다 지나가면 표 아랫변과 함께 올라간다.
 */
export function tableBubbleAnchor(editor: Editor, minTop: () => number) {
    const {state, view} = editor
    if (!isInTable(state)) return null

    const {map, table, tableStart} = selectedRect(state)
    const cell = view.nodeDOM(tableStart + map.positionAt(0, 0, table)) as HTMLElement | null
    const tableElement = cell?.closest("table")
    if (!tableElement) return null
    const scroller = tableElement.closest(".tableWrapper") ?? tableElement

    const rect = () => {
        const tableRect = tableElement.getBoundingClientRect()
        const visible = scroller.getBoundingClientRect()
        const x = Math.max(tableRect.left, visible.left)
        const right = Math.min(tableRect.right, visible.right)
        const top = Math.min(Math.max(tableRect.top, minTop()), tableRect.bottom)
        return new DOMRect(x, top, Math.max(0, right - x), 0)
    }
    return {getBoundingClientRect: rect, getClientRects: () => [rect()]}
}
