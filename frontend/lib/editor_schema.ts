/*
 * 노트 문서의 스키마(어떤 노드·마크·속성이 있고 HTML 과 어떻게 오가는지)만 모은 곳.
 *
 * 브라우저의 에디터와 공동 편집 서버(collab, Node)가 함께 쓴다. collab 은 Y 문서 ↔ HTML 을 바꾸고
 * (검색·내보내기용 사본, 에이전트 덧붙이기) 처음 여는 노트의 HTML 로 Y 문서를 만든다. 두 쪽의 스키마가
 * 어긋나면 모르는 노드·속성이 조용히 사라지므로, 스키마에 영향을 주는 것은 모두 여기서만 정한다.
 *
 * 여기 두는 것: 노드·마크 정의, 속성(parseHTML/renderHTML), 스키마·HTML 출력을 바꾸는 옵션.
 * 두지 않는 것: 플러그인, 노드 뷰, 단축키, 입력 규칙, 명령, 화면 전용 확장(Placeholder·Dropcursor·
 * Gapcursor·FileHandler·History·슬래시 메뉴). 에디터는 여기 있는 확장을 extend 해 그런 것을 덧붙인다.
 *
 * Node 에서도 읽혀야 하므로 React, 브라우저 전용 모듈, 앱 경로(@/…)를 import 하지 않는다.
 */
import {AnyExtension, getSchema, mergeAttributes, Node} from "@tiptap/core"
import type {DOMOutputSpec, Schema} from "@tiptap/pm/model"
import Document from "@tiptap/extension-document"
import Text from "@tiptap/extension-text"
import Paragraph from "@tiptap/extension-paragraph"
import Heading from "@tiptap/extension-heading"
import Blockquote from "@tiptap/extension-blockquote"
import BulletList from "@tiptap/extension-bullet-list"
import OrderedList from "@tiptap/extension-ordered-list"
import ListItem from "@tiptap/extension-list-item"
import HardBreak from "@tiptap/extension-hard-break"
import HorizontalRule from "@tiptap/extension-horizontal-rule"
import Bold from "@tiptap/extension-bold"
import Italic from "@tiptap/extension-italic"
import Strike from "@tiptap/extension-strike"
import Code from "@tiptap/extension-code"
import CodeBlock from "@tiptap/extension-code-block"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import TextAlign from "@tiptap/extension-text-align"
import {Table, TableCell, TableHeader, TableRow} from "@tiptap/extension-table"
import {TaskItem, TaskList} from "@tiptap/extension-list"
import {Details, DetailsContent, DetailsSummary} from "@tiptap/extension-details"
import {cellText, COLLECTION_LABEL, parseCollection, serializeCollection, sortedRows} from "./collection_core"

// ---------------------------------------------------------------- 표

/** 열이 이보다 좁아지지 않는다. 표의 HTML 출력(colgroup 의 min-width)에도 들어가므로 스키마 쪽 값이다. */
export const TABLE_CELL_MIN_WIDTH = 64

export const TABLE_OPTIONS = {resizable: true, handleWidth: 8, cellMinWidth: TABLE_CELL_MIN_WIDTH}

/*
 * 칸 속성: 배경색과 세로 정렬.
 *
 * 배경색은 style 만 두면 다시 읽을 때 브라우저가 rgb(...) 로 바꿔 돌려주어 고른 색을 알아볼 수 없다.
 * 고른 값은 data- 속성으로도 적어 두고 그쪽을 먼저 읽는다.
 *
 * 값을 style 에 그대로 옮겨 적으므로 색 모양(#hex, rgb/rgba, 이름 있는 색)만 받는다. 붙여 넣은 HTML 의
 * data-background-color="red; position: fixed; …" 같은 값이 다른 CSS 를 끼워 넣지 못하게 한다.
 * 공개 노트는 다른 사람에게도 보인다. 읽을 때와 쓸 때 모두 거른다.
 */
const SAFE_COLOR = /^(#[0-9a-f]{3,8}|rgba?\(\s*[\d.]+%?(\s*,\s*[\d.]+%?){2,3}\s*\)|[a-z]+)$/i

const safeColor = (value: unknown) =>
    typeof value === "string" && SAFE_COLOR.test(value.trim()) ? value.trim() : null

const safeVerticalAlign = (value: unknown) => (value === "middle" || value === "bottom" ? value : null)

const cellAttributes = {
    backgroundColor: {
        default: null,
        parseHTML: (element: HTMLElement) =>
            safeColor(element.getAttribute("data-background-color")) ?? safeColor(element.style.backgroundColor),
        renderHTML: (attributes: { backgroundColor?: string | null }) => {
            const color = safeColor(attributes.backgroundColor)
            return color ? {"data-background-color": color, style: `background-color: ${color}`} : {}
        },
    },
    // 세로 정렬. 정하지 않으면 위(CSS 기본)다. 가로 정렬(align)은 표 확장이 이미 갖고 있다.
    verticalAlign: {
        default: null,
        parseHTML: (element: HTMLElement) => safeVerticalAlign(element.style.verticalAlign),
        renderHTML: (attributes: { verticalAlign?: string | null }) => {
            const value = safeVerticalAlign(attributes.verticalAlign)
            return value ? {style: `vertical-align: ${value}`} : {}
        },
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

// ---------------------------------------------------------------- 이미지

/** 글자 사이에도 놓을 수 있게 inline 으로 둔다(스키마가 달라지는 옵션). resize 는 화면 쪽이라 에디터가 더한다. */
export const IMAGE_OPTIONS = {inline: true}

export const ImageBase = Image.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            // block: 한 줄을 혼자 쓴다(문단 정렬을 따른다) · inline: 글자 사이에 흐른다
            display: {
                default: null,
                parseHTML: element => element.getAttribute("data-display"),
                renderHTML: attributes => (attributes.display ? {"data-display": attributes.display} : {}),
            },
        }
    },
})

// ---------------------------------------------------------------- 링크

// 링크 마크의 inclusive 기본값은 autolink 옵션을 그대로 따라간다(= autolink 켜면 true).
// 그러면 링크 끝에 커서를 두고 이어서 타이핑할 때 링크가 계속 늘어나므로 꺼둔다.
// 자동 링크는 "변경 범위가 공백으로 끝날 때" 단어 전체에 마크를 붙이는 방식이라
// inclusive 와 무관하게 그대로 동작한다.
export const LinkBase = Link.extend({
    inclusive: false,
})

export const LINK_OPTIONS = {
    // openOnClick: false 여도 읽기 전용일 때는 클릭 핸들러가 빠지므로
    // 공유 화면에서는 링크가 그대로 열린다. 편집 중에는 열리지 않는다.
    openOnClick: false,
    autolink: true,
    linkOnPaste: true,
    defaultProtocol: "https",
    protocols: ["http", "https", "mailto"],
    HTMLAttributes: {
        target: "_blank",
        rel: "noopener noreferrer nofollow",
    },
}

// ---------------------------------------------------------------- 노트 링크

/**
 * 다른 노트를 가리키는 조각.
 *
 * 그냥 링크로 넣어도 눌러서 갈 수는 있지만, "이 노트를 가리키는 노트들"(백링크)을 찾으려면
 * 어느 노트를 가리키는지가 표시 문자열과 분리돼 있어야 한다. <a data-note="..."> 로 심어두면
 * 제목이 바뀌어도 가리키는 대상은 남는다.
 *
 * atom 으로 두어 통째로 지워지게 한다. 글자를 하나씩 지워 제목만 반쯤 남는 링크는
 * 아무에게도 쓸모가 없다. 누르면 여는 동작은 에디터(lib/note_link.ts)가 더한다.
 */
export const NoteLinkBase = Node.create({
    name: "noteLink",
    group: "inline",
    inline: true,
    atom: true,
    selectable: true,

    addAttributes() {
        return {
            noteId: {
                default: null,
                parseHTML: element => element.getAttribute("data-note"),
                renderHTML: attributes => (attributes.noteId ? {"data-note": attributes.noteId} : {}),
            },
            // 표시용 제목. 서버가 노트를 내려줄 때 지금 대상 노트의 제목으로 다시 써 준다.
            title: {
                default: "",
                parseHTML: element => element.textContent?.trim() ?? "",
                renderHTML: () => ({}),
            },
            // 서버가 보는 사람 기준으로 붙여 준다. 없으면 열 수 있는 노트.
            // deleted: 휴지통에 있음 · locked: 비밀번호가 걸린 남의 노트 · unavailable: 없거나 볼 수 없음
            state: {
                default: null,
                parseHTML: element => element.getAttribute("data-state"),
                renderHTML: attributes => (attributes.state ? {"data-state": attributes.state} : {}),
            },
        }
    },

    parseHTML() {
        // Link 확장(priority 1000)의 "a[href]" 규칙이 먼저 등록되어 있어, 그대로 두면 저장했다가
        // 다시 불러올 때 일반 링크로 바뀌고 data-note 가 사라진다. 규칙 단위 우선순위로 앞선다.
        return [{tag: "a[data-note]", priority: 100}]
    },

    renderHTML({node, HTMLAttributes}) {
        return [
            "a",
            mergeAttributes(HTMLAttributes, {
                href: `/s/${node.attrs.noteId}`,
                class: "note-link",
            }),
            node.attrs.title || "제목 없음",
        ]
    },
})

// ---------------------------------------------------------------- 접기

export const DetailsBase = Details.extend({
    // open 어트리뷰트는 persist: true 일 때만 생기고 기본값이 false 라
    // 새로 만든 details 가 접힌 채로 시작한다. 펼친 상태로 시작하도록 기본값을 뒤집는다.
    // 저장은 getHTML() 로 하고 parseHTML 이 <details> 의 open 속성 유무를 읽으므로,
    // 이미 저장된 노트의 접힘/펼침 상태는 영향받지 않는다.
    addAttributes() {
        const parent = (this.parent?.() ?? {}) as Record<string, Record<string, unknown>>
        return {
            ...parent,
            open: {
                ...parent.open,
                default: true,
            },
        }
    },
})

export const DETAILS_OPTIONS = {
    persist: true,                      // 열림/닫힘 상태를 문서에 저장
    HTMLAttributes: {class: "details"},
}

// ---------------------------------------------------------------- 모음표

/**
 * 열마다 속성(선택·태그·진행도·수식 등)을 정해 쓰는 표. 데이터 모양과 계산은 lib/collection_core.ts 에 있다.
 *
 * 내용 전체를 data 속성(JSON 문자열) 하나로 들고 다니는 atom 이다. 칸마다 노드를 두면 공동 편집에서 칸 단위로
 * 합쳐지는 대신 열 속성·수식·정렬을 노드 트리로 옮겨 적어야 해 스키마가 크게 불어난다. 대신 두 사람이 같은 표를
 * 동시에 고치면 나중에 고친 쪽 표가 남는다.
 *
 * 저장 HTML 에는 data 와 함께 보이는 그대로의 <table> 을 적는다. 검색·미리보기·마크다운/PDF 내보내기·에이전트가
 * 읽는 본문은 이 표를 본다. 다시 읽을 때는 data 만 읽는다(atom 이라 안쪽 표는 건너뛴다).
 */
export const CollectionBase = Node.create({
    name: "collection",
    group: "block",
    atom: true,
    selectable: true,
    draggable: false,

    addAttributes() {
        return {
            data: {
                default: "",
                parseHTML: element => element.getAttribute("data-collection") ?? "",
                renderHTML: () => ({}),
            },
        }
    },

    parseHTML() {
        return [{tag: 'div[data-type="collection"]'}]
    },

    renderHTML({node}) {
        const data = parseCollection(node.attrs.data)
        const columns = data.columns
        const head = ["thead", {}, ["tr", {}, ...columns.map(column => ["th", {}, column.name])]]
        const body = ["tbody", {}, ...sortedRows(data).map(row =>
            ["tr", {}, ...columns.map(column => ["td", {}, cellText(data, column, row)])])]
        return [
            "div",
            {"data-type": "collection", "data-collection": serializeCollection(data), class: "collection"},
            ["p", {class: "collection-title"}, data.title || COLLECTION_LABEL],
            ["table", {}, head, body],
        ] as unknown as DOMOutputSpec
    },
})

// ---------------------------------------------------------------- 그 밖의 스키마 옵션

export const TEXT_ALIGN_OPTIONS = {types: ["heading", "paragraph"]}
export const TASK_ITEM_OPTIONS = {nested: true}

/*
 * 스키마만 담은 확장 목록(설정까지 끝난 것). collab 서버가 그대로 쓴다.
 * 코드 블록은 문법 강조가 붙은 CodeBlockLowlight 대신 CodeBlock 을 쓴다. 강조는 화면 장식일 뿐이고
 * 스키마(language 속성, <pre><code class="language-…">)는 같다.
 */
export const SCHEMA_EXTENSIONS: AnyExtension[] = [
    Document,
    Text,
    Paragraph,
    Heading,
    Blockquote,
    BulletList,
    OrderedList,
    ListItem,
    HardBreak,
    HorizontalRule,
    Bold,
    Italic,
    Strike,
    Code,
    CodeBlock,
    LinkBase.configure(LINK_OPTIONS),
    ImageBase.configure(IMAGE_OPTIONS),
    TextAlign.configure(TEXT_ALIGN_OPTIONS),
    Table.configure(TABLE_OPTIONS),
    TableRow,
    CustomTableHeader,
    CustomTableCell,
    TaskList,
    TaskItem.configure(TASK_ITEM_OPTIONS),
    NoteLinkBase,
    DetailsBase.configure(DETAILS_OPTIONS),
    DetailsSummary,
    DetailsContent,
    CollectionBase,
]

/**
 * 스키마를 견줄 수 있는 모양으로 적는다: 노드·마크 이름, 속성 이름, content, group, inline·atom.
 * 에디터의 스키마가 SCHEMA_EXTENSIONS 와 같은지 개발 중에 확인할 때 쓴다(useEditorInstance).
 */
export function schemaSignature(schema: Schema): string {
    const nodes = Object.values(schema.nodes).map(type => ({
        name: type.name,
        attrs: Object.keys(type.spec.attrs ?? {}).sort(),
        content: type.spec.content ?? "",
        group: type.spec.group ?? "",
        inline: Boolean(type.spec.inline),
        atom: Boolean(type.spec.atom),
    }))
    const marks = Object.values(schema.marks).map(type => ({
        name: type.name,
        attrs: Object.keys(type.spec.attrs ?? {}).sort(),
        inclusive: type.spec.inclusive ?? null,
    }))
    const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)
    return JSON.stringify({nodes: nodes.sort(byName), marks: marks.sort(byName)})
}

let expectedSignature: string | null = null

/** SCHEMA_EXTENSIONS 로 만든 스키마의 모양(한 번만 계산한다). */
export function expectedSchemaSignature(): string {
    expectedSignature ??= schemaSignature(getSchema(SCHEMA_EXTENSIONS))
    return expectedSignature
}
