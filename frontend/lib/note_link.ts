import {mergeAttributes, Node} from "@tiptap/core"
import {Plugin, PluginKey} from "@tiptap/pm/state"

export type NoteLinkOptions = {
    /** 링크를 눌렀을 때 그 노트로 옮겨 가는 통로. 편집 화면이 앱 라우터로 넘겨준다. */
    onOpen?: (noteId: string) => void
}

/**
 * 다른 노트를 가리키는 조각.
 *
 * 그냥 링크로 넣어도 눌러서 갈 수는 있지만, 나중에 "이 노트를 가리키는 노트들"(백링크)을
 * 찾으려면 본문에서 주소를 긁어 파싱해야 한다. <a data-note="..."> 로 심어두면
 * 어느 노트를 가리키는지가 표시 문자열과 분리되어, 제목이 바뀌어도 가리키는 대상은 남는다.
 *
 * atom 으로 두어 통째로 지워지게 한다. 글자를 하나씩 지워 제목만 반쯤 남는 링크는
 * 아무에게도 쓸모가 없다.
 */
export const NoteLink = Node.create<NoteLinkOptions>({
    name: "noteLink",
    group: "inline",
    inline: true,
    atom: true,
    selectable: true,

    addOptions() {
        return {onOpen: undefined}
    },

    addAttributes() {
        return {
            noteId: {
                default: null,
                parseHTML: element => element.getAttribute("data-note"),
                renderHTML: attributes => (attributes.noteId ? {"data-note": attributes.noteId} : {}),
            },
            // 표시용으로만 들고 있는 제목. 대상 노트의 제목이 바뀌면 여기 값은 옛날 것이 된다.
            title: {
                default: "",
                parseHTML: element => element.textContent?.trim() ?? "",
                renderHTML: () => ({}),
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

    /*
     * 편집 중에는 <a> 를 눌러도 브라우저가 이동하지 않고 조각이 선택될 뿐이다.
     * 노트 링크는 고칠 글자가 없는 atom 이라 누르는 목적은 거의 항상 '가 보기'이므로,
     * 편집 중이든 읽기 전용이든 바로 옮겨 간다. 지우는 건 Backspace 로 충분하다.
     * ⌘/Ctrl·Shift·가운데 버튼은 브라우저에 맡겨 새 탭/창으로 열리게 둔다.
     */
    addProseMirrorPlugins() {
        const options = this.options

        return [
            new Plugin({
                key: new PluginKey("noteLinkClick"),
                props: {
                    handleDOMEvents: {
                        click: (_view, event) => {
                            const anchor = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>("a.note-link")
                            const noteId = anchor?.getAttribute("data-note")
                            if (!noteId) return false
                            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
                                // 편집 중에는 contenteditable 이 새 탭 열기도 막으므로 직접 연다.
                                if (event.metaKey || event.ctrlKey) {
                                    event.preventDefault()
                                    window.open(anchor!.href, "_blank", "noopener")
                                    return true
                                }
                                return false
                            }

                            event.preventDefault()
                            if (options.onOpen) options.onOpen(noteId)
                            else window.location.assign(anchor!.href)
                            return true
                        },
                    },
                },
            }),
        ]
    },
})
