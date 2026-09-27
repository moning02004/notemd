import {mergeAttributes, Node} from "@tiptap/core"
import {Plugin, PluginKey, TextSelection} from "@tiptap/pm/state"
import {EditorView} from "@tiptap/pm/view"
import toast from "react-hot-toast"

export type NoteLinkOptions = {
    /** 링크를 눌렀을 때 그 노트를 여는 통로. 없으면 그 노트 주소로 옮겨 간다. */
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

    /*
     * 편집 중에는 <a> 를 눌러도 브라우저가 이동하지 않고 조각이 선택될 뿐이다.
     * 노트 링크는 고칠 글자가 없는 atom 이라 누르는 목적은 거의 항상 '열어 보기'이므로,
     * 편집 중이든 읽기 전용이든 바로 onOpen 을 부른다(편집 화면은 옆 패널에 펼친다).
     * 지우는 건 Backspace 로 충분하다.
     * ⌘/Ctrl·Shift·가운데 버튼은 브라우저에 맡겨 새 탭/창으로 열리게 둔다.
     */
    addProseMirrorPlugins() {
        const options = this.options

        return [
            new Plugin({
                key: new PluginKey("noteLinkClick"),
                props: {
                    handleDOMEvents: {
                        /*
                         * 누르는 순간 에디터가 이 조각을 통째로 선택하면(NodeSelection) 서식 버블이 뜨고,
                         * 모바일에서는 키보드까지 올라와 옆에 펼친 패널을 가린다. 누르는 목적은 열어 보기뿐이니
                         * 선택도 포커스도 옮기지 않는다. 지우는 건 뒤에서 Backspace 로 한다.
                         */
                        mousedown: (_view, event) => {
                            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false
                            if (!(event.target as HTMLElement | null)?.closest("a.note-link")) return false
                            event.preventDefault()
                            return true
                        },
                        click: (view, event) => {
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
                            // 열어 봐야 소용없는 노트는 옮겨 가지 않고 까닭만 알린다.
                            // 휴지통 노트는 링크로 열면 휴지통에 있다는 걸 모른 채 고치게 된다.
                            const state = anchor!.getAttribute("data-state")
                            if (state === "deleted") {
                                toast("휴지통에 있는 노트입니다. 휴지통에서 복원할 수 있습니다.")
                                return true
                            }
                            if (state === "unavailable") {
                                toast("없거나 볼 수 없는 노트입니다.")
                                return true
                            }

                            if (options.onOpen) {
                                leaveEditorForPeek(view)
                                options.onOpen(noteId)
                            } else window.location.assign(anchor!.href)
                            return true
                        },
                    },
                },
            }),
        ]
    },
})

/**
 * 옆에 노트를 펼치기 전에 쓰던 자리를 정리한다.
 *
 * 글자를 골라 둔 채로 링크를 누르면 선택이 남아 서식 버블이 펼친 패널 위에 떠 있게 된다.
 * 선택은 끝자리 커서로 접는다(쓰던 자리는 그대로). 패널이 화면을 덮는 좁은 화면에서는
 * 올라와 있던 키보드가 패널을 가리므로 포커스도 놓는다. 넓은 화면에서는 보면서 이어 쓸 수 있게 둔다.
 */
function leaveEditorForPeek(view: EditorView) {
    const {selection} = view.state
    if (!selection.empty) {
        view.dispatch(view.state.tr.setSelection(TextSelection.near(selection.$to)))
    }
    if (window.matchMedia("(max-width: 767px)").matches) {
        (view.dom as HTMLElement).blur()
    }
}
