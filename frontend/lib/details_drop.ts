import {NodeSelection, Plugin, PluginKey} from "@tiptap/pm/state"
import {EditorView} from "@tiptap/pm/view"

/**
 * 끌던 블록을 접기 제목 위에 놓으면 그 접기 본문 맨 앞에 넣는다.
 *
 * ProseMirror 기본 놓기는 제목 위에 놓은 블록을 접기 앞이나 뒤로 보낸다(제목은 글자만 담는다).
 * 접기에 넣으려면 펼쳐서 본문 줄 사이를 정확히 겨눠야 했고, 접힌 접기에는 넣을 길이 없었다.
 * 접혀 있던 접기는 넣으면서 펼쳐, 들어간 것이 보이게 한다.
 *
 * 끄는 동안 겨눈 접기에 drop-into 클래스를 달아 표시하고, 엉뚱한 자리를 가리키는 drop 커서 줄은 감춘다.
 * 접기를 접기 위에 놓는 것은 detailsNestingGuard 가 안쪽 접기를 풀어 준다(uiEvent: "drop").
 */
const TARGET_CLASS = "drop-into"
const HIDE_CURSOR_CLASS = "dropping-into-details"

/** 이벤트가 가리키는 접기 제목 → 그 접기 노드의 위치. 제목 위가 아니면 null. */
function targetDetails(view: EditorView, event: DragEvent): { pos: number, dom: HTMLElement } | null {
    const target = event.target instanceof Element ? event.target : (event.target as Node | null)?.parentElement
    const summary = target?.closest("summary")
    if (!summary || !view.dom.contains(summary)) return null
    const dom = summary.closest<HTMLElement>('[data-type="details"]')
    if (!dom) return null
    const $pos = view.state.doc.resolve(view.posAtDOM(summary, 0))
    for (let depth = $pos.depth; depth > 0; depth--) {
        if ($pos.node(depth).type.name === "details") return {pos: $pos.before(depth), dom}
    }
    return null
}

export function detailsDrop(): Plugin {
    let marked: HTMLElement | null = null
    const mark = (view: EditorView, dom: HTMLElement | null) => {
        if (marked === dom) return
        marked?.classList.remove(TARGET_CLASS)
        dom?.classList.add(TARGET_CLASS)
        marked = dom
        // drop 커서 줄은 에디터 바깥(offsetParent)에 붙으므로 body 에 표시해 감춘다.
        document.body.classList.toggle(HIDE_CURSOR_CLASS, dom !== null)
    }

    return new Plugin({
        key: new PluginKey("detailsDrop"),
        props: {
            handleDOMEvents: {
                dragover(view, event) {
                    mark(view, view.dragging ? targetDetails(view, event)?.dom ?? null : null)
                    return false
                },
                dragleave(view, event) {
                    // 에디터 밖으로 나갈 때만 지운다. 안쪽 요소 사이를 오갈 때도 dragleave 가 온다.
                    if (!view.dom.contains(event.relatedTarget as Node | null)) mark(view, null)
                    return false
                },
                dragend(view) {
                    mark(view, null)
                    return false
                },
            },
            handleDrop(view, event, slice, moved) {
                mark(view, null)
                const target = targetDetails(view, event)
                if (!target || slice.size === 0) return false

                const details = view.state.doc.nodeAt(target.pos)
                const summary = details?.firstChild
                if (!details || !summary) return false

                const tr = view.state.tr
                // 기본 놓기와 같다: 옮기는 것이면 끌기 시작할 때 골라 둔 원래 자리를 지운다.
                if (moved) tr.deleteSelection()
                const detailsPos = tr.mapping.map(target.pos)
                // details(+1) 안 summary 뒤, detailsContent(+1) 안쪽 맨 앞.
                const insertAt = detailsPos + 1 + summary.nodeSize + 1
                tr.replaceRange(insertAt, insertAt, slice)
                const current = tr.doc.nodeAt(detailsPos)
                if (current && !current.attrs.open) {
                    tr.setNodeMarkup(detailsPos, undefined, {...current.attrs, open: true})
                }
                // 블록 하나를 옮겼으면 놓은 블록을 골라 둔다(기본 놓기처럼).
                const placed = tr.doc.nodeAt(insertAt)
                if (slice.content.childCount === 1 && placed && NodeSelection.isSelectable(placed)) {
                    tr.setSelection(NodeSelection.create(tr.doc, insertAt))
                }
                view.focus()
                view.dispatch(tr.setMeta("uiEvent", "drop"))
                return true
            },
        },
    })
}
