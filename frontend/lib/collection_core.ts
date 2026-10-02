/*
 * 콜렉션: 노트 안에 넣는, 열마다 속성(글·숫자·선택·태그·체크·날짜·진행도·링크·수식)이 정해진 표.
 *
 * 데이터 모양, 값 다루기, 수식 계산, 정렬·합계를 모은 곳이다. 화면(components/collection)과
 * 스키마(lib/editor_schema.ts 의 CollectionBase — 저장 HTML 에 보이는 그대로의 표를 함께 적는다)가 같이 쓴다.
 *
 * editor_schema.ts 와 함께 공동 편집 서버(collab)로 복사되므로 React, 브라우저 전용 모듈, 앱 경로(@/…)를
 * import 하지 않는다. 데이터는 공개 노트에서 남이 만든 것일 수 있으므로 읽을 때마다 normalizeCollection 으로 거르고,
 * 수식은 eval 하지 않고 여기서 직접 읽어 계산한다.
 */

/** 화면에 보이는 이름. 아직 고민 중이라 한 곳에 둔다(노드 이름 "collection" 은 저장 HTML 에 남으므로 바꾸지 않는다). */
export const COLLECTION_LABEL = "콜렉션"

// ---------------------------------------------------------------- 데이터 모양

export type ColumnType =
    "text" | "number" | "select" | "multiSelect" | "checkbox" | "date" | "progress" | "url" | "formula" | "id"

export const COLUMN_TYPES: { type: ColumnType, label: string, glyph: string }[] = [
    {type: "text", label: "텍스트", glyph: "Aa"},
    {type: "number", label: "숫자", glyph: "#"},
    {type: "select", label: "선택", glyph: "◉"},
    {type: "multiSelect", label: "태그", glyph: "≡"},
    {type: "checkbox", label: "체크박스", glyph: "☑"},
    {type: "date", label: "날짜", glyph: "▦"},
    {type: "progress", label: "진행도", glyph: "▰"},
    {type: "url", label: "링크", glyph: "↗"},
    {type: "formula", label: "수식", glyph: "ƒ"},
    {type: "id", label: "ID", glyph: "№"},
]

export const columnTypeLabel = (type: ColumnType) => COLUMN_TYPES.find(item => item.type === type)?.label ?? type

/** 선택지 색. 값은 이름만 저장하고 실제 색은 화면이 정한다(남이 적은 CSS 가 끼어들 틈이 없다). */
export const OPTION_COLORS = ["gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red"] as const
export type OptionColor = typeof OPTION_COLORS[number]

export const OPTION_COLOR_LABEL: Record<OptionColor, string> = {
    gray: "회색", brown: "갈색", orange: "주황", yellow: "노랑", green: "초록",
    blue: "파랑", purple: "보라", pink: "분홍", red: "빨강",
}

export type SelectOption = { id: string, name: string, color: OptionColor }

/** 열 아래에 보이는 계산. */
export type ColumnCalc = "none" | "count" | "filled" | "sum" | "avg" | "min" | "max" | "checked"

export const CALC_LABEL: Record<ColumnCalc, string> = {
    none: "없음", count: "행 수", filled: "채워진 칸", sum: "합계", avg: "평균", min: "최솟값", max: "최댓값",
    checked: "체크 비율",
}

export type Column = {
    id: string
    name: string
    type: ColumnType
    /** px. 화면에서 끌어 맞춘다. */
    width: number
    /** select·multiSelect 의 선택지 */
    options: SelectOption[]
    /** formula 의 식 */
    formula: string
    /** number·formula 값을 진행도 막대로 보인다(0~100). */
    asProgress: boolean
    calc: ColumnCalc
    /** id 번호 앞에 붙이는 글자(예: "TASK-" → TASK-3) */
    prefix: string
    /** id 다음 번호. 지운 행의 번호를 다시 쓰지 않도록 따로 센다. */
    next: number
}

/**
 * 칸 값. 종류별로 text·url·date: 문자열(날짜는 YYYY-MM-DD), number·progress·id: 숫자,
 * checkbox: 참거짓, select: 선택지 id, multiSelect: 선택지 id 목록. 비어 있으면 null(또는 칸이 없다).
 */
export type CellValue = string | number | boolean | string[] | null

export type CellAlign = "left" | "center" | "right"
export type CellVerticalAlign = "top" | "middle" | "bottom"

/** 칸 정렬. 정하지 않으면 종류의 기본(숫자는 오른쪽, 나머지는 왼쪽·위)을 따른다. */
export type CellFormat = { align?: CellAlign, valign?: CellVerticalAlign }

export type Row = {
    id: string
    cells: Record<string, CellValue>
    /** 열 id → 칸 정렬. 정한 칸만 있다. */
    format?: Record<string, CellFormat>
}

export type CollectionSort = { columnId: string, direction: "asc" | "desc" } | null

export type CollectionData = {
    title: string
    columns: Column[]
    rows: Row[]
    sort: CollectionSort
}

export const MIN_COLUMN_WIDTH = 80
export const MAX_COLUMN_WIDTH = 640
const DEFAULT_WIDTH: Partial<Record<ColumnType, number>> = {checkbox: 90, number: 110, date: 140, progress: 160, id: 100}
export const defaultWidth = (type: ColumnType) => DEFAULT_WIDTH[type] ?? 180

/*
 * 짧은 id. crypto.randomUUID 는 https(보안 컨텍스트)에서만 있어, 내부망 http 로 띄운 서버에서는 없다.
 * 한 표 안에서만 겹치지 않으면 된다.
 */
export function newId(): string {
    return Math.random().toString(36).slice(2, 10)
}

export function newColumn(type: ColumnType, name: string): Column {
    return {
        id: newId(), name, type, width: defaultWidth(type), options: [], formula: "", asProgress: false, calc: "none",
        prefix: "", next: 1,
    }
}

export function newRow(): Row {
    return {id: newId(), cells: {}}
}

/** 처음 넣을 때의 모습. 무엇을 할 수 있는지 바로 보이게 자주 쓰는 열을 몇 개 깔아 둔다. */
export function emptyCollection(): CollectionData {
    const name = newColumn("text", "이름")
    const status = {
        ...newColumn("select", "상태"),
        options: [
            {id: newId(), name: "할 일", color: "gray" as const},
            {id: newId(), name: "진행 중", color: "blue" as const},
            {id: newId(), name: "완료", color: "green" as const},
        ],
    }
    const tags = newColumn("multiSelect", "태그")
    const progress = newColumn("progress", "진행도")
    return {
        title: "",
        columns: [name, status, tags, progress],
        rows: [newRow(), newRow(), newRow()],
        sort: null,
    }
}

// ---------------------------------------------------------------- 읽기·쓰기(거르기)

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value)

const text = (value: unknown, max = 2000) => (typeof value === "string" ? value.slice(0, max) : "")

const ID = /^[A-Za-z0-9_-]{1,40}$/
const safeId = (value: unknown) => (typeof value === "string" && ID.test(value) ? value : newId())

const DATE = /^\d{4}-\d{2}-\d{2}$/

function normalizeOption(raw: unknown): SelectOption | null {
    if (!isRecord(raw)) return null
    const name = text(raw.name, 200).trim()
    if (!name) return null
    const color = OPTION_COLORS.includes(raw.color as OptionColor) ? raw.color as OptionColor : "gray"
    return {id: safeId(raw.id), name, color}
}

function normalizeColumn(raw: unknown): Column | null {
    if (!isRecord(raw)) return null
    const type = COLUMN_TYPES.some(item => item.type === raw.type) ? raw.type as ColumnType : "text"
    const width = typeof raw.width === "number" && Number.isFinite(raw.width)
        ? Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, Math.round(raw.width)))
        : defaultWidth(type)
    const options = Array.isArray(raw.options)
        ? raw.options.map(normalizeOption).filter((option): option is SelectOption => option !== null)
        : []
    const calc = typeof raw.calc === "string" && raw.calc in CALC_LABEL ? raw.calc as ColumnCalc : "none"
    return {
        id: safeId(raw.id),
        name: text(raw.name, 200),
        type,
        width,
        options: uniqueById(options),
        formula: text(raw.formula, 2000),
        asProgress: raw.asProgress === true,
        calc,
        prefix: text(raw.prefix, 20),
        next: typeof raw.next === "number" && Number.isInteger(raw.next) && raw.next > 0 ? raw.next : 1,
    }
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
    const seen = new Set<string>()
    return items.map(item => {
        if (!seen.has(item.id)) {
            seen.add(item.id)
            return item
        }
        const copy = {...item, id: newId()}
        seen.add(copy.id)
        return copy
    })
}

/** 칸 값을 열 종류에 맞는 모양으로. 맞지 않으면 null(빈칸). */
export function normalizeCell(column: Column, value: unknown): CellValue {
    switch (column.type) {
        case "text":
        case "url":
            return typeof value === "string" && value !== "" ? value.slice(0, 5000) : null
        case "number":
        case "progress":
            return typeof value === "number" && Number.isFinite(value) ? value : null
        case "checkbox":
            return value === true ? true : null
        case "date":
            return typeof value === "string" && DATE.test(value) ? value : null
        case "select":
            return typeof value === "string" && column.options.some(option => option.id === value) ? value : null
        case "multiSelect": {
            if (!Array.isArray(value)) return null
            const ids = [...new Set(value.filter((id): id is string =>
                typeof id === "string" && column.options.some(option => option.id === id)))]
            return ids.length ? ids : null
        }
        case "id":
            return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null
        case "formula":
            return null
    }
}

const ALIGNS: CellAlign[] = ["left", "center", "right"]
const VERTICAL_ALIGNS: CellVerticalAlign[] = ["top", "middle", "bottom"]

function normalizeFormat(raw: unknown): CellFormat | null {
    if (!isRecord(raw)) return null
    const format: CellFormat = {}
    if (ALIGNS.includes(raw.align as CellAlign)) format.align = raw.align as CellAlign
    if (VERTICAL_ALIGNS.includes(raw.valign as CellVerticalAlign)) format.valign = raw.valign as CellVerticalAlign
    return format.align || format.valign ? format : null
}

function normalizeRow(raw: unknown, columns: Column[]): Row | null {
    if (!isRecord(raw)) return null
    const cells: Record<string, CellValue> = {}
    const format: Record<string, CellFormat> = {}
    const source = isRecord(raw.cells) ? raw.cells : {}
    const sourceFormat = isRecord(raw.format) ? raw.format : {}
    for (const column of columns) {
        const value = normalizeCell(column, source[column.id])
        if (value !== null) cells[column.id] = value
        const cellFormat = normalizeFormat(sourceFormat[column.id])
        if (cellFormat) format[column.id] = cellFormat
    }
    return Object.keys(format).length ? {id: safeId(raw.id), cells, format} : {id: safeId(raw.id), cells}
}

/** 칸 정렬을 고친다. 값이 undefined 인 쪽은 지운다(종류의 기본으로). */
export function withFormat(row: Row, columnId: string, patch: CellFormat): Row {
    const next: CellFormat = {...row.format?.[columnId], ...patch}
    if (!next.align) delete next.align
    if (!next.valign) delete next.valign
    const format = {...row.format}
    if (next.align || next.valign) format[columnId] = next
    else delete format[columnId]
    if (Object.keys(format).length) return {...row, format}
    const rest = {...row}
    delete rest.format
    return rest
}

/** 저장 HTML 의 <td> 에 옮겨 적는 정렬. 정해진 값만 들어간다. */
export function formatStyle(format: CellFormat | undefined): string {
    const style = []
    if (format?.align) style.push(`text-align: ${format.align}`)
    if (format?.valign) style.push(`vertical-align: ${format.valign}`)
    return style.join("; ")
}

const MAX_COLUMNS = 50
const MAX_ROWS = 2000

export function normalizeCollection(raw: unknown): CollectionData {
    if (!isRecord(raw)) return {title: "", columns: [], rows: [], sort: null}
    const columns = uniqueById((Array.isArray(raw.columns) ? raw.columns : [])
        .slice(0, MAX_COLUMNS).map(normalizeColumn).filter((column): column is Column => column !== null))
    const rows = uniqueById((Array.isArray(raw.rows) ? raw.rows : [])
        .slice(0, MAX_ROWS).map(row => normalizeRow(row, columns)).filter((row): row is Row => row !== null))
    const sortRaw = isRecord(raw.sort) ? raw.sort : null
    const sort: CollectionSort = sortRaw && columns.some(column => column.id === sortRaw.columnId)
        ? {columnId: sortRaw.columnId as string, direction: sortRaw.direction === "desc" ? "desc" : "asc"}
        : null
    return numberRows({title: text(raw.title, 200), columns, rows, sort})
}

/**
 * ID 열의 번호를 채운다. 번호가 없거나 겹치는 행(새로 더한 행, ID 열로 바꾼 직후, 손으로 고친 데이터)에
 * 다음 번호를 차례로 준다. 한 번 받은 번호는 정렬·옮기기·지우기에도 바뀌지 않고, 지운 번호는 다시 쓰지 않는다.
 */
export function numberRows(data: CollectionData): CollectionData {
    const idColumns = data.columns.filter(column => column.type === "id")
    if (idColumns.length === 0) return data
    let rows = data.rows
    const columns = data.columns.map(column => {
        if (column.type !== "id") return column
        const taken = rows.map(row => row.cells[column.id]).filter((value): value is number => typeof value === "number")
        let next = Math.max(column.next, ...taken.map(value => value + 1))
        const seen = new Set<number>()
        rows = rows.map(row => {
            const value = row.cells[column.id]
            if (typeof value === "number" && !seen.has(value)) {
                seen.add(value)
                return row
            }
            const number = next++
            seen.add(number)
            return {...row, cells: {...row.cells, [column.id]: number}}
        })
        return next === column.next ? column : {...column, next}
    })
    return {...data, columns, rows}
}

export function parseCollection(json: string | null | undefined): CollectionData {
    if (!json) return normalizeCollection(null)
    try {
        return normalizeCollection(JSON.parse(json))
    } catch {
        return normalizeCollection(null)
    }
}

/*
 * < > 는 \u003c \u003e 로 적는다(JSON.parse 가 그대로 되돌린다). 저장 HTML 의 속성값에 > 가 있으면
 * 태그를 정규식(<[^>]+>)으로 걷어내는 쪽(서버의 검색 색인 등)에서 태그가 거기서 끝난 줄 알고 JSON 을 본문으로 읽는다.
 */
export const serializeCollection = (data: CollectionData) =>
    JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e")

// ---------------------------------------------------------------- 열 종류 바꾸기

/**
 * 열 종류를 바꾼다. 적어 둔 값은 될 수 있는 한 살린다(글 "3" → 숫자 3, 태그 → "가, 나" 글,
 * 글 → 같은 이름의 선택지를 만들어 고른다).
 */
export function changeColumnType(data: CollectionData, columnId: string, type: ColumnType): CollectionData {
    const before = data.columns.find(column => column.id === columnId)
    if (!before || before.type === type) return data

    let after: Column = {...before, type, calc: "none"}
    if (before.type === "checkbox" || type === "checkbox" || before.width === defaultWidth(before.type)) {
        after.width = defaultWidth(type)
    }

    // 고칠 값: 새 종류로 옮겨 적을 원래 값(표시 문자열·숫자·참거짓)
    const plain = (row: Row): string | number | boolean | null => {
        const value = row.cells[columnId] ?? null
        if (before.type === "formula") return null
        if (before.type === "select" || before.type === "multiSelect" || before.type === "id") {
            return displayText(before, value) || null
        }
        if (Array.isArray(value)) return null
        return value
    }

    const optionByName = new Map(after.options.map(option => [option.name, option]))
    const optionFor = (name: string): string => {
        const existing = optionByName.get(name)
        if (existing) return existing.id
        const option: SelectOption = {
            id: newId(), name, color: OPTION_COLORS[optionByName.size % OPTION_COLORS.length],
        }
        optionByName.set(name, option)
        after = {...after, options: [...after.options, option]}
        return option.id
    }

    const convert = (value: string | number | boolean | null): CellValue => {
        if (value === null || value === "") return null
        switch (type) {
            case "text":
            case "url":
                return typeof value === "boolean" ? (value ? "✓" : null) : String(value)
            case "number":
            case "progress": {
                const number = typeof value === "number" ? value
                    : typeof value === "boolean" ? (value ? 1 : 0)
                        : parseFloat(String(value).replace(/,/g, ""))
                if (!Number.isFinite(number)) return null
                return type === "progress" ? clampProgress(number) : number
            }
            case "checkbox":
                return value === true || value === 1 || ["true", "y", "yes", "o", "✓", "v", "완료"]
                    .includes(String(value).trim().toLowerCase()) || null
            case "date":
                return typeof value === "string" && DATE.test(value.trim()) ? value.trim() : null
            case "select": {
                const name = String(value).split(",")[0].trim()
                return name ? optionFor(name) : null
            }
            case "multiSelect": {
                const names = String(value).split(",").map(name => name.trim()).filter(Boolean)
                return names.length ? [...new Set(names.map(optionFor))] : null
            }
            case "id":
            case "formula":
                return null
        }
    }

    // ID 열로 바꾸면 적어 둔 값은 버리고 지금 행 순서대로 1 부터 매긴다(numberRows).
    if (type === "id") after = {...after, next: 1}

    const rows = data.rows.map(row => {
        const cells = {...row.cells}
        const value = convert(plain(row))
        if (value === null) delete cells[columnId]
        else cells[columnId] = value
        return {...row, cells}
    })

    return numberRows({
        ...data,
        columns: data.columns.map(column => (column.id === columnId ? after : column)),
        rows,
    })
}

export const clampProgress = (value: number) => Math.min(100, Math.max(0, Math.round(value)))

// ---------------------------------------------------------------- 보이는 글

export function optionOf(column: Column, id: string): SelectOption | undefined {
    return column.options.find(option => option.id === id)
}

export function formatNumber(value: number): string {
    if (!Number.isFinite(value)) return ""
    return value.toLocaleString("ko-KR", {maximumFractionDigits: 4})
}

/** 칸을 글로 적은 모양. 저장 HTML 의 표, 검색, 내보내기, 정렬이 쓴다. 수식 열은 formulaValue 를 쓴다. */
export function displayText(column: Column, value: CellValue): string {
    if (value === null || value === undefined) return ""
    switch (column.type) {
        case "select":
            return typeof value === "string" ? optionOf(column, value)?.name ?? "" : ""
        case "multiSelect":
            return Array.isArray(value)
                ? value.map(id => optionOf(column, id)?.name).filter(Boolean).join(", ")
                : ""
        case "checkbox":
            return value === true ? "✓" : ""
        case "number":
            return typeof value === "number" ? formatNumber(value) : ""
        case "progress":
            return typeof value === "number" ? `${clampProgress(value)}%` : ""
        case "id":
            return typeof value === "number" ? `${column.prefix}${value}` : ""
        default:
            return typeof value === "string" ? value : String(value)
    }
}

/** 한 칸을 글로. 수식이면 계산해서 적는다. */
export function cellText(data: CollectionData, column: Column, row: Row): string {
    if (column.type !== "formula") return displayText(column, row.cells[column.id] ?? null)
    const result = formulaValue(data, column, row)
    if (result.error) return ""
    if (column.asProgress && typeof result.value === "number") return `${clampProgress(result.value)}%`
    return formulaText(result.value)
}

// ---------------------------------------------------------------- 정렬·합계

/** 정렬에 쓰는 값. 빈칸은 null 로 두어 오름·내림 모두 맨 뒤로 보낸다. */
function sortKey(data: CollectionData, column: Column, row: Row): number | string | null {
    if (column.type === "formula") {
        const {value, error} = formulaValue(data, column, row)
        if (error || value === null || value === "") return null
        if (typeof value === "number") return value
        if (typeof value === "boolean") return value ? 1 : 0
        return formulaText(value)
    }
    const value = row.cells[column.id] ?? null
    if (value === null) return null
    if (typeof value === "number") return value
    if (typeof value === "boolean") return value ? 1 : 0
    if (column.type === "select" && typeof value === "string") {
        // 선택지는 적어 둔 순서(할 일 → 진행 중 → 완료)대로 늘어서는 편이 이름 순보다 쓸모 있다.
        const index = column.options.findIndex(option => option.id === value)
        return index === -1 ? null : index
    }
    return displayText(column, value) || null
}

export function sortedRows(data: CollectionData): Row[] {
    const sort = data.sort
    const column = sort && data.columns.find(item => item.id === sort.columnId)
    if (!sort || !column) return data.rows
    const sign = sort.direction === "asc" ? 1 : -1
    const keyed = data.rows.map((row, index) => ({row, index, key: sortKey(data, column, row)}))
    keyed.sort((a, b) => {
        if (a.key === null || b.key === null) {
            if (a.key === b.key) return a.index - b.index
            return a.key === null ? 1 : -1
        }
        let order: number
        if (typeof a.key === "number" && typeof b.key === "number") order = a.key - b.key
        else order = String(a.key).localeCompare(String(b.key), "ko", {numeric: true})
        return order === 0 ? a.index - b.index : order * sign
    })
    return keyed.map(item => item.row)
}

/** 이 열에 쓸 수 있는 계산들. */
export function calcsFor(column: Column): ColumnCalc[] {
    const numeric = column.type === "number" || column.type === "progress"
        || (column.type === "formula")
    const base: ColumnCalc[] = ["none", "count", "filled"]
    if (column.type === "checkbox") return [...base, "checked"]
    if (numeric) return [...base, "sum", "avg", "min", "max"]
    return base
}

/** 열 아래에 적을 계산 결과. 계산을 고르지 않았으면 빈 문자열. */
export function calcText(data: CollectionData, column: Column): string {
    const rows = data.rows
    const values = rows.map(row => {
        if (column.type !== "formula") return row.cells[column.id] ?? null
        const {value, error} = formulaValue(data, column, row)
        return error ? null : value
    })
    const filled = values.filter(value =>
        value !== null && value !== "" && value !== false && !(Array.isArray(value) && value.length === 0))
    const numbers = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    const asPercent = column.type === "progress" || column.asProgress
    const number = (value: number) => (asPercent ? `${formatNumber(Math.round(value * 10) / 10)}%` : formatNumber(value))

    switch (column.calc) {
        case "none":
            return ""
        case "count":
            return `${rows.length}개`
        case "filled":
            return `${filled.length}개`
        case "checked":
            return rows.length ? `${filled.length}/${rows.length} (${Math.round(filled.length / rows.length * 100)}%)` : ""
        case "sum":
            return numbers.length ? number(numbers.reduce((sum, value) => sum + value, 0)) : ""
        case "avg":
            return numbers.length ? number(numbers.reduce((sum, value) => sum + value, 0) / numbers.length) : ""
        case "min":
            return numbers.length ? number(Math.min(...numbers)) : ""
        case "max":
            return numbers.length ? number(Math.max(...numbers)) : ""
    }
}

// ---------------------------------------------------------------- 수식

/*
 * 수식은 칸 이름을 {이름} 으로 부른다(노션처럼 prop("이름") 도 된다). 예:
 *   {가격} * {수량}
 *   if({완료}, 100, {진행도})
 *   dateBetween({마감}, today(), "days") + "일 남음"
 *
 * eval 을 쓰지 않는다. 공개 노트에서는 남이 적은 수식이 보는 사람 브라우저에서 계산된다.
 */

export type FormulaValue = number | string | boolean | string[] | null

type Token =
    | { kind: "number", value: number }
    | { kind: "string", value: string }
    | { kind: "ref", name: string }
    | { kind: "name", value: string }
    | { kind: "op", value: string }
    | { kind: "end" }

type Expr =
    | { kind: "literal", value: FormulaValue }
    | { kind: "ref", name: string }
    | { kind: "unary", op: string, operand: Expr }
    | { kind: "binary", op: string, left: Expr, right: Expr }
    | { kind: "call", name: string, args: Expr[] }

export class FormulaError extends Error {
}

const OPERATORS = ["==", "!=", "<=", ">=", "&&", "||", "+", "-", "*", "/", "%", "^", "<", ">", "!", "(", ")", ",", "="]

function tokenize(source: string): Token[] {
    const tokens: Token[] = []
    let i = 0
    while (i < source.length) {
        const char = source[i]
        if (/\s/.test(char)) {
            i++
            continue
        }
        if (/[0-9.]/.test(char)) {
            const match = /^\d*\.?\d+(e[+-]?\d+)?|^\d+\.?/i.exec(source.slice(i))
            if (!match) throw new FormulaError(`숫자를 읽지 못했습니다: ${source.slice(i, i + 8)}`)
            tokens.push({kind: "number", value: parseFloat(match[0])})
            i += match[0].length
            continue
        }
        if (char === '"' || char === "'" || char === "“" || char === "”") {
            const close = char === "“" ? "”" : char
            let value = ""
            i++
            while (i < source.length && source[i] !== close && !(close === "”" && source[i] === '"')) {
                if (source[i] === "\\" && i + 1 < source.length) i++
                value += source[i++]
            }
            if (i >= source.length) throw new FormulaError("따옴표가 닫히지 않았습니다")
            i++
            tokens.push({kind: "string", value})
            continue
        }
        if (char === "{") {
            const end = source.indexOf("}", i)
            if (end === -1) throw new FormulaError("{ 가 닫히지 않았습니다")
            tokens.push({kind: "ref", name: source.slice(i + 1, end).trim()})
            i = end + 1
            continue
        }
        if (/[\p{L}_]/u.test(char)) {
            const match = /^[\p{L}_][\p{L}\p{N}_]*/u.exec(source.slice(i))!
            tokens.push({kind: "name", value: match[0]})
            i += match[0].length
            continue
        }
        const op = OPERATORS.find(candidate => source.startsWith(candidate, i))
        if (!op) throw new FormulaError(`알 수 없는 글자: ${char}`)
        // = 하나는 == 로 받아 준다(엑셀처럼 적는 사람이 많다).
        tokens.push({kind: "op", value: op === "=" ? "==" : op})
        i += op.length
    }
    tokens.push({kind: "end"})
    return tokens
}

const BINARY_PRECEDENCE: Record<string, number> = {
    "||": 1, "&&": 2, "==": 3, "!=": 3, "<": 4, "<=": 4, ">": 4, ">=": 4, "+": 5, "-": 5, "*": 6, "/": 6, "%": 6, "^": 7,
}

function parse(source: string): Expr {
    const tokens = tokenize(source)
    let position = 0
    const peek = () => tokens[position]
    const next = () => tokens[position++]
    const isOp = (value: string) => {
        const token = peek()
        return token.kind === "op" && token.value === value
    }
    const expectOp = (value: string) => {
        if (!isOp(value)) throw new FormulaError(`'${value}' 가 있어야 합니다`)
        position++
    }

    const primary = (): Expr => {
        const token = next()
        switch (token.kind) {
            case "number":
                return {kind: "literal", value: token.value}
            case "string":
                return {kind: "literal", value: token.value}
            case "ref":
                return {kind: "ref", name: token.name}
            case "name": {
                const lower = token.value.toLowerCase()
                if (!isOp("(")) {
                    if (lower === "true" || token.value === "참") return {kind: "literal", value: true}
                    if (lower === "false" || token.value === "거짓") return {kind: "literal", value: false}
                    throw new FormulaError(`알 수 없는 이름: ${token.value} (칸은 {${token.value}} 처럼 적습니다)`)
                }
                position++
                const args: Expr[] = []
                if (!isOp(")")) {
                    args.push(expression(0))
                    while (isOp(",")) {
                        position++
                        args.push(expression(0))
                    }
                }
                expectOp(")")
                if (lower === "prop") {
                    const first = args[0]
                    if (args.length !== 1 || first.kind !== "literal" || typeof first.value !== "string") {
                        throw new FormulaError('prop 은 prop("칸 이름") 처럼 씁니다')
                    }
                    return {kind: "ref", name: first.value}
                }
                if (!(lower in FUNCTIONS)) throw new FormulaError(`없는 함수: ${token.value}`)
                return {kind: "call", name: lower, args}
            }
            case "op":
                if (token.value === "(") {
                    const inner = expression(0)
                    expectOp(")")
                    return inner
                }
                if (token.value === "-" || token.value === "!" || token.value === "+") {
                    return {kind: "unary", op: token.value, operand: expression(8)}
                }
                throw new FormulaError(`'${token.value}' 이 올 자리가 아닙니다`)
            case "end":
                throw new FormulaError("식이 덜 끝났습니다")
        }
    }

    const expression = (minPrecedence: number): Expr => {
        let left = primary()
        for (; ;) {
            const token = peek()
            if (token.kind !== "op") break
            const precedence = BINARY_PRECEDENCE[token.value]
            if (precedence === undefined || precedence <= minPrecedence) break
            position++
            // ^ 는 오른쪽부터 묶는다(2^3^2 = 2^9).
            const right = expression(token.value === "^" ? precedence - 1 : precedence)
            left = {kind: "binary", op: token.value, left, right}
        }
        return left
    }

    if (peek().kind === "end") throw new FormulaError("식이 비어 있습니다")
    const result = expression(0)
    if (peek().kind !== "end") throw new FormulaError("식 뒤에 남은 글자가 있습니다")
    return result
}

const parsed = new Map<string, Expr | FormulaError>()

function parseCached(source: string): Expr {
    let entry = parsed.get(source)
    if (!entry) {
        try {
            entry = parse(source)
        } catch (error) {
            entry = error instanceof FormulaError ? error : new FormulaError(String(error))
        }
        if (parsed.size > 500) parsed.clear()
        parsed.set(source, entry)
    }
    if (entry instanceof FormulaError) throw entry
    return entry
}

// 값 바꾸기

const toNumber = (value: FormulaValue): number => {
    if (typeof value === "number") return value
    if (typeof value === "boolean") return value ? 1 : 0
    if (value === null || value === "") return 0
    if (Array.isArray(value)) return value.length
    const number = parseFloat(value.replace(/,/g, ""))
    if (!Number.isFinite(number)) throw new FormulaError(`숫자가 아닙니다: "${value}"`)
    return number
}

const toBoolean = (value: FormulaValue): boolean => {
    if (Array.isArray(value)) return value.length > 0
    return Boolean(value)
}

export function formulaText(value: FormulaValue): string {
    if (value === null) return ""
    if (typeof value === "number") return formatNumber(roundNoise(value))
    if (typeof value === "boolean") return value ? "✓" : "✗"
    if (Array.isArray(value)) return value.join(", ")
    return value
}

/** 0.1 + 0.2 같은 떠다니는 소수 오차를 걷는다. */
const roundNoise = (value: number) => Number.isFinite(value) ? parseFloat(value.toPrecision(12)) : value

const isEmpty = (value: FormulaValue) =>
    value === null || value === "" || (Array.isArray(value) && value.length === 0)

const equal = (a: FormulaValue, b: FormulaValue) => {
    if (Array.isArray(a) || Array.isArray(b)) return formulaText(a) === formulaText(b)
    if (typeof a === "number" || typeof b === "number") {
        if (isEmpty(a) || isEmpty(b)) return isEmpty(a) && isEmpty(b)
        try {
            return toNumber(a) === toNumber(b)
        } catch {
            return false
        }
    }
    return (a ?? "") === (b ?? "")
}

const compare = (a: FormulaValue, b: FormulaValue): number => {
    if (typeof a === "number" || typeof b === "number" || typeof a === "boolean" || typeof b === "boolean") {
        return toNumber(a) - toNumber(b)
    }
    return formulaText(a).localeCompare(formulaText(b), "ko", {numeric: true})
}

// 날짜는 YYYY-MM-DD 문자열로 다룬다. 시간대 때문에 하루가 밀리지 않게 UTC 로만 계산한다.

const DAY = 24 * 60 * 60 * 1000

const toDate = (value: FormulaValue): Date => {
    if (typeof value !== "string" || !DATE.test(value)) throw new FormulaError(`날짜가 아닙니다: ${formulaText(value)}`)
    const [year, month, day] = value.split("-").map(Number)
    return new Date(Date.UTC(year, month - 1, day))
}

const fromDate = (date: Date) => date.toISOString().slice(0, 10)

const today = () => {
    const now = new Date()
    return fromDate(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())))
}

const UNITS: Record<string, string> = {
    days: "days", day: "days", 일: "days", weeks: "weeks", week: "weeks", 주: "weeks",
    months: "months", month: "months", 달: "months", 개월: "months", years: "years", year: "years", 년: "years",
}

const unitOf = (value: FormulaValue | undefined) => {
    const unit = UNITS[String(value ?? "days").toLowerCase()]
    if (!unit) throw new FormulaError(`단위는 "days", "weeks", "months", "years" 중 하나입니다`)
    return unit
}

const monthsBetween = (a: Date, b: Date) => {
    let months = (a.getUTCFullYear() - b.getUTCFullYear()) * 12 + (a.getUTCMonth() - b.getUTCMonth())
    // 날이 아직 안 찼으면 한 달을 덜 센다.
    if (months > 0 && a.getUTCDate() < b.getUTCDate()) months--
    if (months < 0 && a.getUTCDate() > b.getUTCDate()) months++
    return months
}

type FunctionSpec = {
    signature: string
    description: string
    /** 인자를 미리 계산하지 않고 넘겨받는 함수(if 처럼 고른 쪽만 계산한다) */
    lazy?: boolean
    run: (args: FormulaValue[], evaluate?: (expr: Expr) => FormulaValue, exprs?: Expr[]) => FormulaValue
}

const needArgs = (name: string, args: unknown[], min: number, max = min) => {
    if (args.length < min || args.length > max) {
        throw new FormulaError(`${name} 에 넣는 값은 ${min === max ? `${min}개` : `${min}~${max}개`}입니다`)
    }
}

const numbersOf = (args: FormulaValue[]) =>
    args.flatMap(value => (Array.isArray(value) ? value : [value])).filter(value => !isEmpty(value)).map(toNumber)

export const FUNCTIONS: Record<string, FunctionSpec> = {
    if: {
        signature: "if(조건, 참일 때, 거짓일 때)", description: "조건에 따라 둘 중 하나", lazy: true,
        run: (_args, evaluate, exprs) => {
            needArgs("if", exprs!, 2, 3)
            return toBoolean(evaluate!(exprs![0])) ? evaluate!(exprs![1]) : exprs![2] ? evaluate!(exprs![2]) : null
        },
    },
    and: {
        signature: "and(a, b, …)", description: "모두 참이면 참",
        run: args => args.every(toBoolean),
    },
    or: {
        signature: "or(a, b, …)", description: "하나라도 참이면 참",
        run: args => args.some(toBoolean),
    },
    not: {
        signature: "not(a)", description: "참·거짓을 뒤집기",
        run: args => {
            needArgs("not", args, 1)
            return !toBoolean(args[0])
        },
    },
    empty: {
        signature: "empty(값)", description: "비어 있으면 참",
        run: args => {
            needArgs("empty", args, 1)
            return isEmpty(args[0])
        },
    },
    round: {
        signature: "round(수, 자릿수)", description: "반올림(자릿수는 생략하면 0)",
        run: args => {
            needArgs("round", args, 1, 2)
            const digits = args[1] === undefined ? 0 : toNumber(args[1])
            const scale = Math.pow(10, digits)
            return Math.round(toNumber(args[0]) * scale) / scale
        },
    },
    floor: {
        signature: "floor(수)", description: "내림",
        run: args => (needArgs("floor", args, 1), Math.floor(toNumber(args[0]))),
    },
    ceil: {
        signature: "ceil(수)", description: "올림",
        run: args => (needArgs("ceil", args, 1), Math.ceil(toNumber(args[0]))),
    },
    abs: {
        signature: "abs(수)", description: "절댓값",
        run: args => (needArgs("abs", args, 1), Math.abs(toNumber(args[0]))),
    },
    sqrt: {
        signature: "sqrt(수)", description: "제곱근",
        run: args => (needArgs("sqrt", args, 1), Math.sqrt(toNumber(args[0]))),
    },
    min: {
        signature: "min(a, b, …)", description: "가장 작은 수",
        run: args => {
            const numbers = numbersOf(args)
            return numbers.length ? Math.min(...numbers) : null
        },
    },
    max: {
        signature: "max(a, b, …)", description: "가장 큰 수",
        run: args => {
            const numbers = numbersOf(args)
            return numbers.length ? Math.max(...numbers) : null
        },
    },
    sum: {
        signature: "sum(a, b, …)", description: "더하기",
        run: args => numbersOf(args).reduce((sum, value) => sum + value, 0),
    },
    avg: {
        signature: "avg(a, b, …)", description: "평균(빈칸은 빼고)",
        run: args => {
            const numbers = numbersOf(args)
            return numbers.length ? numbers.reduce((sum, value) => sum + value, 0) / numbers.length : null
        },
    },
    percent: {
        signature: "percent(부분, 전체)", description: "부분 ÷ 전체 × 100 (전체가 0이면 0)",
        run: args => {
            needArgs("percent", args, 2)
            const whole = toNumber(args[1])
            return whole === 0 ? 0 : toNumber(args[0]) / whole * 100
        },
    },
    len: {
        signature: "len(값)", description: "글자 수, 태그면 태그 개수",
        run: args => {
            needArgs("len", args, 1)
            const value = args[0]
            if (Array.isArray(value)) return value.length
            return formulaText(value).length
        },
    },
    concat: {
        signature: "concat(a, b, …)", description: "글 이어 붙이기",
        run: args => args.map(formulaText).join(""),
    },
    contains: {
        signature: "contains(값, 찾을 것)", description: "글이나 태그에 들어 있으면 참",
        run: args => {
            needArgs("contains", args, 2)
            const [haystack, needle] = args
            if (Array.isArray(haystack)) return haystack.includes(formulaText(needle))
            return formulaText(haystack).includes(formulaText(needle))
        },
    },
    today: {
        signature: "today()", description: "오늘 날짜",
        run: args => (needArgs("today", args, 0), today()),
    },
    datebetween: {
        signature: 'dateBetween(날짜1, 날짜2, "days")', description: "날짜1 − 날짜2 (days·weeks·months·years)",
        run: args => {
            needArgs("dateBetween", args, 2, 3)
            if (isEmpty(args[0]) || isEmpty(args[1])) return null
            const a = toDate(args[0]), b = toDate(args[1])
            switch (unitOf(args[2])) {
                case "weeks":
                    return Math.trunc((a.getTime() - b.getTime()) / DAY / 7)
                case "months":
                    return monthsBetween(a, b)
                case "years":
                    return Math.trunc(monthsBetween(a, b) / 12)
                default:
                    return Math.round((a.getTime() - b.getTime()) / DAY)
            }
        },
    },
    dateadd: {
        signature: 'dateAdd(날짜, 수, "days")', description: "날짜에 더하기 (days·weeks·months·years)",
        run: args => {
            needArgs("dateAdd", args, 2, 3)
            if (isEmpty(args[0])) return null
            const date = toDate(args[0])
            const amount = Math.trunc(toNumber(args[1]))
            switch (unitOf(args[2])) {
                case "weeks":
                    date.setUTCDate(date.getUTCDate() + amount * 7)
                    break
                case "months":
                    date.setUTCMonth(date.getUTCMonth() + amount)
                    break
                case "years":
                    date.setUTCFullYear(date.getUTCFullYear() + amount)
                    break
                default:
                    date.setUTCDate(date.getUTCDate() + amount)
            }
            return fromDate(date)
        },
    },
    number: {
        signature: "number(값)", description: "숫자로 바꾸기",
        run: args => (needArgs("number", args, 1), toNumber(args[0])),
    },
    text: {
        signature: "text(값)", description: "글로 바꾸기",
        run: args => (needArgs("text", args, 1), formulaText(args[0])),
    },
}

/** 수식 칸에서 이 칸의 값을 읽는다. select·multiSelect 는 선택지 이름으로 준다. */
function columnValue(data: CollectionData, column: Column, row: Row, depth: number): FormulaValue {
    if (column.type === "formula") return evaluateFormula(data, column, row, depth + 1)
    const value = row.cells[column.id] ?? null
    if (value === null) return column.type === "checkbox" ? false : null
    if (column.type === "select") return typeof value === "string" ? optionOf(column, value)?.name ?? null : null
    // 앞 글자가 있으면 보이는 그대로("TASK-3"), 없으면 숫자로 셈에 쓴다.
    if (column.type === "id") return typeof value === "number" && column.prefix ? `${column.prefix}${value}` : value
    if (column.type === "multiSelect") {
        return Array.isArray(value) ? value.map(id => optionOf(column, id)?.name ?? "").filter(Boolean) : null
    }
    return value
}

const MAX_DEPTH = 8

function evaluateFormula(data: CollectionData, column: Column, row: Row, depth: number): FormulaValue {
    if (depth > MAX_DEPTH) throw new FormulaError("수식이 서로를 부르며 맴돕니다")
    if (!column.formula.trim()) return null
    const expr = parseCached(column.formula)

    const evaluate = (node: Expr): FormulaValue => {
        switch (node.kind) {
            case "literal":
                return node.value
            case "ref": {
                const target = data.columns.find(item => item.name.trim() === node.name)
                if (!target) throw new FormulaError(`없는 칸: {${node.name}}`)
                if (target.id === column.id) throw new FormulaError("수식이 자기 칸을 부릅니다")
                return columnValue(data, target, row, depth)
            }
            case "unary": {
                const value = evaluate(node.operand)
                if (node.op === "!") return !toBoolean(value)
                return node.op === "-" ? -toNumber(value) : toNumber(value)
            }
            case "binary": {
                if (node.op === "&&") return toBoolean(evaluate(node.left)) && toBoolean(evaluate(node.right))
                if (node.op === "||") return toBoolean(evaluate(node.left)) || toBoolean(evaluate(node.right))
                const left = evaluate(node.left), right = evaluate(node.right)
                switch (node.op) {
                    case "+":
                        // 한쪽이라도 글이면 이어 붙인다("완료 " + 3).
                        if ((typeof left === "string" && isNaN(Number(left))) || (typeof right === "string" && isNaN(Number(right)))
                            || Array.isArray(left) || Array.isArray(right)) {
                            return formulaText(left) + formulaText(right)
                        }
                        return toNumber(left) + toNumber(right)
                    case "-":
                        return toNumber(left) - toNumber(right)
                    case "*":
                        return toNumber(left) * toNumber(right)
                    case "/": {
                        const divisor = toNumber(right)
                        if (divisor === 0) throw new FormulaError("0 으로 나눌 수 없습니다")
                        return toNumber(left) / divisor
                    }
                    case "%": {
                        const divisor = toNumber(right)
                        if (divisor === 0) throw new FormulaError("0 으로 나눌 수 없습니다")
                        return toNumber(left) % divisor
                    }
                    case "^":
                        return Math.pow(toNumber(left), toNumber(right))
                    case "==":
                        return equal(left, right)
                    case "!=":
                        return !equal(left, right)
                    case "<":
                        return compare(left, right) < 0
                    case "<=":
                        return compare(left, right) <= 0
                    case ">":
                        return compare(left, right) > 0
                    case ">=":
                        return compare(left, right) >= 0
                }
                throw new FormulaError(`알 수 없는 연산: ${node.op}`)
            }
            case "call": {
                const spec = FUNCTIONS[node.name]
                if (spec.lazy) return spec.run([], evaluate, node.args)
                return spec.run(node.args.map(evaluate))
            }
        }
    }

    const value = evaluate(expr)
    if (typeof value === "number" && !Number.isFinite(value)) throw new FormulaError("계산 결과가 숫자가 아닙니다")
    return typeof value === "number" ? roundNoise(value) : value
}

export type FormulaResult = { value: FormulaValue, error: string | null }

export function formulaValue(data: CollectionData, column: Column, row: Row): FormulaResult {
    try {
        return {value: evaluateFormula(data, column, row, 0), error: null}
    } catch (error) {
        return {value: null, error: error instanceof FormulaError ? error.message : "계산하지 못했습니다"}
    }
}

/** 식만 읽어 본다(칸 값 없이). 쓰는 중에 틀린 곳을 바로 보여 줄 때. */
export function formulaSyntaxError(source: string): string | null {
    if (!source.trim()) return null
    try {
        parseCached(source)
        return null
    } catch (error) {
        return error instanceof FormulaError ? error.message : "식을 읽지 못했습니다"
    }
}

/** 칸 이름이 바뀌면 다른 수식이 부르던 {옛 이름} 도 따라 바꾼다. */
export function renameInFormulas(data: CollectionData, columnId: string, name: string): CollectionData {
    const before = data.columns.find(column => column.id === columnId)
    if (!before || before.name === name) return data
    const old = before.name.trim()
    const escaped = old.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const braces = new RegExp(`\\{\\s*${escaped}\\s*\\}`, "g")
    const prop = new RegExp(`prop\\(\\s*(["'])${escaped}\\1\\s*\\)`, "gi")
    return {
        ...data,
        columns: data.columns.map(column => {
            if (column.id === columnId) return {...column, name}
            if (column.type !== "formula" || !old || !name.trim()) return column
            const formula = column.formula
                .replace(braces, `{${name.trim()}}`)
                .replace(prop, (_m, quote: string) => `prop(${quote}${name.trim()}${quote})`)
            return formula === column.formula ? column : {...column, formula}
        }),
    }
}
