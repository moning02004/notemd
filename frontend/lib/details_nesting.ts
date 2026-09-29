import {Node as PMNode} from "@tiptap/pm/model"
import {Plugin, PluginKey, Transaction} from "@tiptap/pm/state"

/**
 * 붙여넣거나 끌어다 놓아 접기 안에 접기가 생기면 안쪽 접기를 푼다.
 *
 * 접기를 새로 만드는 명령(setDetails)은 접기 안에서 이미 막혀 있지만, 스키마는 detailsContent 안의
 * details 를 허용한다(block+ 에서 하나만 빼는 표현이 없다). 그래서 접기가 든 내용을 접기 안에 붙여넣으면
 * 계단처럼 겹쳐 들어갔다. 붙여넣기·놓기로 바뀐 자리만 살펴, 안쪽 접기를 제목 한 줄 + 본문으로 펼친다.
 *
 * 이미 겹친 채 저장된 노트는 건드리지 않는다. 사람이 고치지 않은 본문이 조용히 바뀌면 안 된다.
 * 안쪽 접기는 툴바의 접기 버튼으로 풀 수 있다.
 */
export function detailsNestingGuard(): Plugin {
    return new Plugin({
        key: new PluginKey("detailsNestingGuard"),
        appendTransaction(transactions, _oldState, newState) {
            const pasted = transactions.filter(tr =>
                tr.docChanged && ["paste", "drop"].includes(tr.getMeta("uiEvent")))
            if (pasted.length === 0) return null

            // 붙여넣은 트랜잭션들이 바꾼 범위를 새 문서 좌표로 모은다.
            const ranges: Array<[number, number]> = []
            transactions.forEach((tr, index) => {
                if (!pasted.includes(tr)) return
                // 한 스텝의 범위는 그 스텝 직후 좌표다. 같은 트랜잭션의 뒤 스텝과 뒤에 온 트랜잭션들을 거쳐야
                // 새 문서 좌표가 된다.
                const later = transactions.slice(index + 1).map(next => next.mapping)
                tr.mapping.maps.forEach((map, step) => {
                    const after = [tr.mapping.slice(step + 1), ...later]
                    map.forEach((_oldStart, _oldEnd, from, to) => {
                        ranges.push(after.reduce<[number, number]>(
                            ([a, b], mapping) => [mapping.map(a, -1), mapping.map(b, 1)], [from, to]))
                    })
                })
            })

            const nested = new Set<number>()
            for (const [from, to] of ranges) {
                newState.doc.nodesBetween(from, Math.min(to, newState.doc.content.size), (node, pos) => {
                    // 바뀐 범위를 감싸는 바깥 노드도 지나가므로, 이번에 들어온(범위 안에서 시작하는) 접기만 본다.
                    if (pos < from || node.type.name !== "details") return
                    if (hasDetailsAncestor(newState.doc, pos)) nested.add(pos)
                })
            }
            if (nested.size === 0) return null

            const tr = newState.tr
            // 뒤(안쪽)에서부터 푼다. 앞쪽 위치는 뒤의 변경에 밀리지 않는다.
            ;[...nested].sort((a, b) => b - a).forEach(pos => unwrapDetails(tr, pos))
            return tr
        },
    })
}

function hasDetailsAncestor(doc: PMNode, pos: number): boolean {
    const $pos = doc.resolve(pos)
    for (let depth = $pos.depth; depth > 0; depth--) {
        if ($pos.node(depth).type.name === "details") return true
    }
    return false
}

/** pos 의 접기를 '제목 문단 + 본문 블록들' 로 바꾼다. 제목이 비어 있으면 문단을 두지 않는다. */
function unwrapDetails(tr: Transaction, pos: number) {
    const node = tr.doc.nodeAt(pos)
    if (!node || node.type.name !== "details") return

    const {schema} = tr.doc.type
    const blocks: PMNode[] = []
    node.forEach(child => {
        if (child.type.name === "detailsSummary") {
            if (child.content.size > 0) blocks.push(schema.nodes.paragraph.create(null, child.content))
        } else if (child.type.name === "detailsContent") {
            child.forEach(block => blocks.push(block))
        }
    })
    if (blocks.length === 0) blocks.push(schema.nodes.paragraph.create())

    tr.replaceWith(pos, pos + node.nodeSize, blocks)
}
