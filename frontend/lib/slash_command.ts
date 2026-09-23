import {Extension, Range} from "@tiptap/core"
import {Editor} from "@tiptap/react"
import Suggestion from "@tiptap/suggestion"

/**
 * "/" 를 쳐서 블록을 바꾸는 메뉴.
 *
 * 툴바는 항상 화면 위에 있어서 글을 쓰다 말고 손이 위로 올라가야 한다. 쓰던 자리에서
 * 바로 고를 수 있게 노션과 같은 방식으로 만들었다. 팝업은 React 를 끼우지 않고
 * DOM 으로 직접 그린다 — suggestion 은 에디터 밖 좌표에 붙는 일회성 목록이라
 * 컴포넌트 트리에 넣으면 오히려 생애주기가 꼬인다.
 */

type SlashItem = {
    label: string
    hint: string
    /** 한글·영문·줄임말 어느 쪽으로 쳐도 찾히게 한다. */
    keywords: string[]
    glyph: string
    /** 지금 자리에서 쓸 수 없는 항목은 아예 목록에서 뺀다. */
    enabled?: (editor: Editor) => boolean
    run: (editor: Editor, range: Range) => void
}

const ITEMS: SlashItem[] = [
    {
        label: "제목 1", hint: "가장 큰 제목", glyph: "H1",
        keywords: ["제목", "heading", "h1", "title"],
        run: (editor, range) => editor.chain().focus().deleteRange(range).setNode("heading", {level: 1}).run(),
    },
    {
        label: "제목 2", hint: "중간 제목", glyph: "H2",
        keywords: ["제목", "heading", "h2"],
        run: (editor, range) => editor.chain().focus().deleteRange(range).setNode("heading", {level: 2}).run(),
    },
    {
        label: "제목 3", hint: "작은 제목", glyph: "H3",
        keywords: ["제목", "heading", "h3"],
        run: (editor, range) => editor.chain().focus().deleteRange(range).setNode("heading", {level: 3}).run(),
    },
    {
        label: "글머리 기호", hint: "• 로 시작하는 목록", glyph: "•",
        keywords: ["목록", "리스트", "불릿", "bullet", "list", "ul"],
        run: (editor, range) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
    },
    {
        label: "번호 매기기", hint: "1. 2. 3. 순서 목록", glyph: "1.",
        keywords: ["목록", "리스트", "번호", "순서", "number", "ordered", "ol"],
        run: (editor, range) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
    },
    {
        label: "체크리스트", hint: "할 일 목록", glyph: "☑",
        keywords: ["체크", "할일", "todo", "task", "check"],
        run: (editor, range) => editor.chain().focus().deleteRange(range).toggleTaskList().run(),
    },
    {
        label: "인용", hint: "옮겨 적은 글", glyph: "❝",
        keywords: ["인용", "quote", "blockquote"],
        run: (editor, range) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
    },
    {
        label: "코드 블록", hint: "문법 강조가 되는 코드", glyph: "{}",
        keywords: ["코드", "code", "codeblock", "pre"],
        run: (editor, range) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
    },
    {
        label: "접기", hint: "펼쳐 볼 수 있는 블록", glyph: "▸",
        keywords: ["접기", "토글", "details", "toggle", "fold"],
        // 접기 안에서 또 접기를 만들면 겹쳐 들어간다. ">>" 입력 규칙과 같은 규칙.
        enabled: editor => !editor.isActive("details"),
        run: (editor, range) => editor.chain().focus().deleteRange(range).setDetails().run(),
    },
    {
        label: "표", hint: "3 × 3 표", glyph: "⊞",
        keywords: ["표", "테이블", "table", "grid"],
        run: (editor, range) => editor.chain().focus().deleteRange(range)
            .insertTable({rows: 3, cols: 3, withHeaderRow: true}).run(),
    },
    {
        label: "구분선", hint: "가로줄로 나누기", glyph: "—",
        keywords: ["구분", "선", "divider", "hr", "line"],
        run: (editor, range) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
    },
]

function search(query: string, editor: Editor): SlashItem[] {
    const usable = ITEMS.filter(item => item.enabled?.(editor) ?? true)

    const keyword = query.trim().toLowerCase()
    if (!keyword) return usable
    return usable.filter(item =>
        item.label.toLowerCase().includes(keyword) ||
        item.keywords.some(word => word.includes(keyword)))
}

/** 커서 옆에 뜨는 목록. 화면 아래가 좁으면 위로 뒤집는다. */
class SlashMenu {
    private readonly element: HTMLDivElement
    private items: SlashItem[] = []
    private rows: HTMLButtonElement[] = []
    /** 지금 그려져 있는 목록. 이게 그대로면 다시 그리지 않는다. */
    private drawnKey = ""
    private selected = 0
    private dismissed = false
    private onPick: (item: SlashItem) => void = () => {
    }

    constructor() {
        this.element = document.createElement("div")
        this.element.className = `fixed z-[9999] w-60 max-h-72 overflow-y-auto rounded-xl border border-border
                                  bg-surface p-1 shadow-lg text-[13px]`
        this.element.setAttribute("role", "listbox")
    }

    update(items: SlashItem[], rect: DOMRect | null, onPick: (item: SlashItem) => void) {
        this.items = items
        this.onPick = onPick
        if (this.selected >= items.length) this.selected = Math.max(0, items.length - 1)

        if (this.dismissed || items.length === 0) {
            this.detach()
            return
        }

        if (!this.element.isConnected) document.body.appendChild(this.element)
        this.draw()
        this.place(rect)
    }

    /**
     * 목록이 바뀌었을 때만 다시 그리고, 선택 표시는 클래스만 갈아끼운다.
     * 키를 누를 때마다 innerHTML 을 새로 쓰면 스크롤 위치가 매번 0 으로 돌아가
     * 골라둔 항목이 화면 밖으로 나가버린다.
     */
    private draw() {
        const key = this.items.map(item => item.label).join("|")
        if (key !== this.drawnKey) {
            this.drawnKey = key
            this.build()
            this.element.scrollTop = 0
        }
        this.highlight()
    }

    private build() {
        this.element.innerHTML = ""
        this.rows = this.items.map((item, index) => {
            const row = document.createElement("button")
            row.type = "button"
            row.setAttribute("role", "option")

            const glyph = document.createElement("span")
            glyph.className = `shrink-0 w-6 h-6 rounded-md border border-border bg-background
                               flex items-center justify-center text-[11px] font-medium`
            glyph.textContent = item.glyph

            const text = document.createElement("span")
            text.className = "min-w-0 flex-1"
            const label = document.createElement("span")
            label.className = "block truncate font-medium text-foreground"
            label.textContent = item.label
            const hint = document.createElement("span")
            hint.className = "block truncate text-[11px] text-subtle"
            hint.textContent = item.hint
            text.append(label, hint)

            row.append(glyph, text)
            // mousedown 으로 받아야 에디터가 포커스를 잃기 전에 실행된다.
            row.addEventListener("mousedown", event => {
                event.preventDefault()
                this.onPick(item)
            })
            row.addEventListener("mouseenter", () => {
                this.selected = index
                this.highlight()
            })
            this.element.appendChild(row)
            return row
        })
    }

    /** 선택 표시를 옮기고, 그 줄이 보이도록 목록만 스크롤한다(페이지는 건드리지 않는다). */
    private highlight() {
        this.rows.forEach((row, index) => {
            const on = index === this.selected
            row.setAttribute("aria-selected", String(on))
            row.className = `flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left cursor-pointer
                ${on ? "bg-accent-menu text-accent" : "text-muted hover:bg-background"}`
        })

        const row = this.rows[this.selected]
        if (!row) return

        const top = row.offsetTop
        const bottom = top + row.offsetHeight
        if (top < this.element.scrollTop) this.element.scrollTop = top
        else if (bottom > this.element.scrollTop + this.element.clientHeight) {
            this.element.scrollTop = bottom - this.element.clientHeight
        }
    }

    private place(rect: DOMRect | null) {
        if (!rect) return
        const height = this.element.offsetHeight || 260
        const flipUp = rect.bottom + height + 8 > window.innerHeight
        this.element.style.top = `${flipUp ? Math.max(8, rect.top - height - 6) : rect.bottom + 6}px`
        this.element.style.left = `${Math.min(rect.left, window.innerWidth - this.element.offsetWidth - 8)}px`
    }

    /** 위·아래·엔터만 가로챈다. 나머지는 에디터로 흘려보내야 계속 타이핑된다. */
    handleKey(event: KeyboardEvent): boolean {
        if (this.dismissed || this.items.length === 0) return false

        if (event.key === "ArrowDown") {
            this.selected = (this.selected + 1) % this.items.length
            this.highlight()
            return true
        }
        if (event.key === "ArrowUp") {
            this.selected = (this.selected - 1 + this.items.length) % this.items.length
            this.highlight()
            return true
        }
        if (event.key === "Enter") {
            this.onPick(this.items[this.selected])
            return true
        }
        if (event.key === "Escape") {
            // suggestion 자체는 살아 있으므로 목록만 감춘다. 다시 뜨는 건 새로 "/" 를 칠 때.
            this.dismissed = true
            this.detach()
            return true
        }
        return false
    }

    close() {
        this.dismissed = false
        this.selected = 0
        this.drawnKey = ""
        this.rows = []
        this.detach()
    }

    private detach() {
        if (this.element.isConnected) this.element.remove()
    }
}

export const SlashCommand = Extension.create({
    name: "slashCommand",

    addProseMirrorPlugins() {
        const menu = new SlashMenu()

        return [
            Suggestion<SlashItem>({
                editor: this.editor,
                char: "/",
                command: ({editor, range, props}) => props.run(editor as Editor, range),
                items: ({query, editor}) => search(query, editor as Editor),
                // 코드 블록 안에서는 "/" 가 그냥 글자다. 접기 제목 줄도 블록을 바꿀 자리가 아니다.
                allow: ({state, range}) => {
                    const parent = state.doc.resolve(range.from).parent.type.name
                    return parent !== "codeBlock" && parent !== "detailsSummary"
                },
                render: () => ({
                    onStart: props => menu.update(props.items, props.clientRect?.() ?? null, item =>
                        props.command(item)),
                    onUpdate: props => menu.update(props.items, props.clientRect?.() ?? null, item =>
                        props.command(item)),
                    onKeyDown: props => menu.handleKey(props.event),
                    onExit: () => menu.close(),
                }),
            }),
        ]
    },
})
