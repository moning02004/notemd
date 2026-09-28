import {Extension} from "@tiptap/core";
import {GapCursor} from "@tiptap/pm/gapcursor";
import {NodeSelection, Plugin, PluginKey, TextSelection} from "@tiptap/pm/state";
import {EditorView} from "@tiptap/pm/view";
import {ResolvedPos} from "@tiptap/pm/model";

/** 틈 커서가 설 수 있는 자리 = 글을 쓸 수 없는 틈. 틈 커서의 판단을 그대로 빌린다(타입에서는 감춰져 있다). */
const isGap = ($pos: ResolvedPos): boolean =>
    (GapCursor as unknown as { valid: ($pos: ResolvedPos) => boolean }).valid($pos)

/**
 * 열어 둔 빈 줄의 자리(문단 앞 위치). 아무것도 쓰지 않고 커서가 다른 곳으로 가면 도로 닫는다.
 * 틈을 잘못 눌렀거나 제목에서 Enter 만 치고 떠났을 때 빈 줄이 남아 저장되지 않게 한다.
 * 편집기가 포커스를 잃는 것만으로는 닫지 않는다. 툴바 단추(제목·목록 등)를 누를 때도 포커스가 빠지는데,
 * 그 빈 줄을 꾸미려던 것일 수 있다.
 */
const openedLineKey = new PluginKey<number | null>("openedLine")

/*
 * 글을 쓸 수 없는 틈에 새 줄 열기.
 *
 * 표·가로줄처럼 커서가 들어가 앉을 수 없는 블록이 문서 맨 앞이나 맨 끝, 또는 서로 붙어 있으면
 * 그 사이에 글을 쓸 방법이 없다. ProseMirror 는 방향키로 그 틈에 '틈 커서'를 두게 하지만,
 * 모바일에는 방향키가 없고 틈 커서 위에서는 한글 조합이 자주 어긋난다.
 * 그래서 틈을 누르거나(아래 확장) 제목에서 Enter 를 치면 곧바로 빈 문단을 만들어 커서를 둔다.
 */

/**
 * pos 에 빈 문단을 열고 커서를 둔다. 바로 옆에 이미 빈 문단이 있으면 새로 만들지 않고 그리로 간다
 * (틈을 여러 번 눌러도 빈 줄이 쌓이지 않게).
 */
export function openLineAt(view: EditorView, pos: number): boolean {
    const {state} = view
    const $pos = state.doc.resolve(pos)
    const paragraph = state.schema.nodes.paragraph
    const isEmptyParagraph = (node: typeof $pos.nodeAfter) => node?.type === paragraph && node.content.size === 0

    let cursor: number
    let tr = state.tr
    if (isEmptyParagraph($pos.nodeAfter)) {
        cursor = pos + 1
    } else if (isEmptyParagraph($pos.nodeBefore)) {
        cursor = pos - 1
    } else {
        const index = $pos.index()
        if (!$pos.parent.canReplaceWith(index, index, paragraph)) return false
        // 빈 줄을 연 것은 되돌리기 기록에 남기지 않는다. 그 줄에 쓴 글은 평소처럼 남는다.
        tr = tr.insert(pos, paragraph.create()).setMeta(openedLineKey, pos).setMeta("addToHistory", false)
        cursor = pos + 1
    }

    view.dispatch(tr.setSelection(TextSelection.create(tr.doc, cursor)).scrollIntoView())
    view.focus()
    return true
}

/** 문서 맨 앞에 글을 쓸 자리가 없는지(표 등으로 시작하는지) */
export const startsWithGap = (view: EditorView) => isGap(view.state.doc.resolve(0))

/**
 * 누른 높이가 문서 맨 위 단계의 블록 사이(맨 앞·블록과 블록 사이·맨 끝)에 있고,
 * 그 틈이 글을 쓸 수 없는 곳이면 그 자리를 돌려준다.
 */
function topLevelGapAt(view: EditorView, y: number): number | null {
    const {doc} = view.state
    let pos = 0
    let previousBottom = -Infinity

    for (let index = 0; index <= doc.childCount; index++) {
        const node = index < doc.childCount ? doc.child(index) : null
        const rect = node ? (view.nodeDOM(pos) as HTMLElement | null)?.getBoundingClientRect() : null
        if (node && !rect) return null
        const top = rect ? rect.top : Infinity

        if (y >= previousBottom && y < top) return isGap(doc.resolve(pos)) ? pos : null
        if (!node || !rect) return null

        previousBottom = rect.bottom
        pos += node.nodeSize
    }
    return null
}

export const OpenLineOnGapTap = Extension.create({
    name: "openLineOnGapTap",
    // 틈 커서(Gapcursor)보다 먼저 두어, 같은 누름에 틈 커서가 서지 않게 한다.
    priority: 101,

    addProseMirrorPlugins() {
        // 마지막으로 누른 자리
        let pressedAt: { x: number, y: number } | null = null

        return [
            new Plugin<number | null>({
                key: openedLineKey,
                state: {
                    init: () => null,
                    apply(tr, opened) {
                        const meta = tr.getMeta(openedLineKey) as number | null | undefined
                        if (meta !== undefined) return meta
                        if (opened === null) return null
                        const mapped = tr.mapping.mapResult(opened)
                        return mapped.deleted ? null : mapped.pos
                    },
                },
                appendTransaction(_transactions, _oldState, state) {
                    const opened = openedLineKey.getState(state)
                    if (opened === null || opened === undefined) return null

                    const line = state.doc.nodeAt(opened)
                    // 뭔가 쓰기 시작했으면(또는 다른 것이 됐으면) 더는 지켜보지 않는다.
                    if (!line || line.type.name !== "paragraph" || line.content.size > 0) {
                        return state.tr.setMeta(openedLineKey, null)
                    }
                    const {from} = state.selection
                    if (from > opened && from < opened + line.nodeSize) return null

                    // 빈 채로 떠났다. 되돌리기 기록에는 남기지 않는다(연 것도 닫은 것도 사람이 한 일이 아니다).
                    return state.tr.delete(opened, opened + line.nodeSize)
                        .setMeta(openedLineKey, null)
                        .setMeta("addToHistory", false)
                },
            }),
            new Plugin({
                key: new PluginKey("openLineOnGapTap"),
                props: {
                    /*
                     * ProseMirror 의 handleClick 이 아니라 DOM 의 click 을 받는다. handleClick 은 누르고 떼는 사이에
                     * 마우스 이동이 한 번만 끼어도 불리지 않는다. 대신 누른 자리와 뗀 자리가 같을 때만 '누름'으로 본다
                     * (끌어서 글자를 고르다 틈에서 놓은 것은 아니다).
                     */
                    handleDOMEvents: {
                        mousedown(_view, event) {
                            pressedAt = {x: event.clientX, y: event.clientY}
                            return false
                        },
                        click(view, event) {
                            const pressed = pressedAt
                            pressedAt = null
                            if (!view.editable || event.button !== 0 || !pressed) return false
                            if (Math.abs(pressed.x - event.clientX) > 4 || Math.abs(pressed.y - event.clientY) > 4) return false

                            // 표 아래 빈 곳처럼 블록 사이를 누르면 ProseMirror 는 가장 가까운 칸 안에 커서를 둔다.
                            // 그래서 커서 자리보다 누른 높이를 먼저 본다.
                            const gap = topLevelGapAt(view, event.clientY)
                            if (gap !== null) return openLineAt(view, gap)

                            // 접기 안처럼 안쪽의 틈은 틈 커서가 클릭을 받는 조건을 그대로 따른다.
                            const clicked = view.posAtCoords({left: event.clientX, top: event.clientY})
                            if (!clicked || !isGap(view.state.doc.resolve(clicked.pos))) return false
                            // 가로줄처럼 고를 수 있는 블록 자체를 누른 것이면 그 블록을 고르게 둔다.
                            const node = clicked.inside > -1 ? view.state.doc.nodeAt(clicked.inside) : null
                            if (node && NodeSelection.isSelectable(node)) return false

                            return openLineAt(view, clicked.pos)
                        },
                    },
                },
            }),
        ]
    },
})
