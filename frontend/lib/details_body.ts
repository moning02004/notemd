import {Editor} from "@tiptap/core"
import {Node as PMNode} from "@tiptap/pm/model"
import {EditorState, Plugin, PluginKey, TextSelection} from "@tiptap/pm/state"
import {Decoration, DecorationSet} from "@tiptap/pm/view"

/*
 * 펼친 접기의 본문이 빈 줄 하나뿐이면 그 줄을 감춘다.
 *
 * 스키마상 본문은 블록이 적어도 하나 있어야 해서(">>" 로 만들든 툴바로 만들든) 빈 문단이 하나 딸려 온다.
 * 제목만 적어 둔 접기 아래에 빈 줄이 늘 붙어 있어 어색했다. 쓰려면 어차피 제목에서 Enter 를 치므로,
 * 커서가 그 줄에 들어가 있을 때만 보이고 쓰지 않고 떠나면 다시 감춘다(표 위 빈 줄과 같은 규칙).
 *
 * display:none 으로 감추면 details 확장이 '접힌 내용' 으로 여겨 커서를 밖으로 튕겨 낸다
 * (offsetParent 로 보이는지 판단한다). 그래서 본문의 높이만 0 으로 접는다(globals.css 의 .is-empty-body).
 */

const EMPTY_BODY_CLASS = "is-empty-body"

/** details 노드의 본문이 빈 문단 하나뿐인지 */
function hasEmptyBody(details: PMNode): boolean {
    const body = details.lastChild
    if (!body || body.type.name !== "detailsContent" || body.childCount !== 1) return false
    const only = body.firstChild!
    return only.isTextblock && only.content.size === 0
}

function decorate(state: EditorState): DecorationSet {
    const {from, to} = state.selection
    const decorations: Decoration[] = []

    state.doc.descendants((node, pos) => {
        if (node.type.name !== "details") return
        if (hasEmptyBody(node)) {
            const bodyStart = pos + node.nodeSize - node.lastChild!.nodeSize - 1
            const bodyEnd = pos + node.nodeSize - 1
            const cursorInBody = from >= bodyStart && to <= bodyEnd
            /*
             * 표시는 본문 안의 빈 문단에 붙이고, 본문을 접는 건 CSS(:has)에 맡긴다.
             * details·detailsContent 는 노드 뷰가 열림 상태를 DOM 에 따로 들고 있다(is-open class, hidden 속성).
             * 거기에 장식을 붙이면 장식이 바뀔 때 ProseMirror 가 노드 뷰를 새로 만들기도 하는데, 새 본문 뷰는
             * hidden 으로 시작해 부모가 풀어 주기를 기다리므로 펼친 접기의 본문이 닫힌 채 남았다.
             */
            if (!cursorInBody) decorations.push(Decoration.node(bodyStart + 1, bodyEnd - 1, {class: EMPTY_BODY_CLASS}))
        }
    })
    return DecorationSet.create(state.doc, decorations)
}

export function emptyDetailsBody(): Plugin {
    return new Plugin({
        key: new PluginKey("emptyDetailsBody"),
        props: {
            decorations: decorate,
        },
    })
}

/**
 * 펼친 접기의 제목에서 Enter. 본문이 빈 줄 하나뿐이면 새 줄을 더 만들지 않고 그 줄로 들어간다.
 * (details 확장의 기본 Enter 는 본문 맨 앞에 줄을 하나 더 넣어, 감춰 둔 빈 줄과 함께 두 줄이 된다.)
 */
export function enterEmptyDetailsBody(editor: Editor): boolean {
    const {state, view} = editor
    const {$head, empty} = state.selection
    if (!empty || $head.parent.type.name !== "detailsSummary") return false

    const details = $head.node(-1)
    if (details.type.name !== "details" || details.attrs.open === false || !hasEmptyBody(details)) return false

    // 제목 끝(= 본문 시작) → 본문 안(+1) → 문단 안(+1)
    const inside = $head.after() + 2
    view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, inside)).scrollIntoView())
    return true
}
