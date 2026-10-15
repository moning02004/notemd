import {Editor} from "@tiptap/core"
import {ResolvedPos} from "@tiptap/pm/model"
import {EditorState, TextSelection, Transaction} from "@tiptap/pm/state"

/*
 * 코드 블록 안에서 코드 에디터처럼 움직이는 키들.
 *
 * - Tab / Shift-Tab: 한 단계(공백 4칸) 들이고 내민다. 여러 줄을 골랐으면 그 줄들을 한꺼번에.
 * - Enter: 새 줄이 윗줄의 들여쓰기를 이어받는다. 여는 괄호·콜론으로 끝난 줄이면 한 단계 더 들인다.
 *   들여쓰기만 남은 빈 줄에서 다시 누르면 새 줄을 만들지 않고 한 단계 내민다(목록의 Enter 처럼).
 * - Backspace: 줄 앞 들여쓰기 안에서는 한 칸이 아니라 한 단계씩 지운다.
 * - Shift-Enter: Enter 와 같다. 기본은 하드 브레이크 대신 코드 블록을 빠져나가(exitCode) 손버릇으로 누르면 튕겨 나갔다.
 *   블록을 나가려면 Mod-Enter, 또는 빈 줄 두 개 뒤 Enter, 마지막 줄에서 ↓.
 * - Mod-a: 코드 블록 안에서 누르면 그 코드만 고른다. 이미 다 골랐으면 한 번 더 눌러 문서 전체를 고른다.
 *
 * 탭 문자 대신 공백을 쓴다. 한 단계는 4칸, YAML 은 관례대로 2칸이다.
 * "- " 로 시작하는 줄(YAML 목록 항목 등)에서 Enter 를 치면 새 줄을 "- " 뒤 글자 자리에 맞춘다.
 *
 *   - name: namename
 *     value: "123123"
 */

const TWO_SPACE_LANGUAGES = new Set(["yaml", "yml"])

/** 이 코드 블록에서 한 단계 들여쓰기. */
function indentUnit($pos: ResolvedPos): string {
    return TWO_SPACE_LANGUAGES.has(String($pos.parent.attrs.language ?? "").toLowerCase()) ? "  " : "    "
}

const OPENERS = /[{[(:]$/
const CLOSERS: Record<string, string> = {"{": "}", "[": "]", "(": ")"}

type CodeLine = { start: number, text: string }

/** 선택이 한 코드 블록 안에 있으면 그 블록의 $from. */
function codeBlockOf(state: EditorState): ResolvedPos | null {
    const {$from, $to} = state.selection
    if ($from.parent.type.name !== "codeBlock" || !$from.sameParent($to)) return null
    return $from
}

/** from~to 에 걸친 줄들(문서 위치와 글). */
function linesBetween($pos: ResolvedPos, from: number, to: number): CodeLine[] {
    const blockStart = $pos.start()
    const text = $pos.parent.textContent
    const lines: CodeLine[] = []
    let offset = 0
    for (const line of text.split("\n")) {
        const start = blockStart + offset
        const end = start + line.length
        if (end >= from && start <= to) lines.push({start, text: line})
        offset += line.length + 1
    }
    return lines
}

/** 줄 앞 들여쓰기. 붙여 넣은 코드(Go, Makefile 등)는 탭 문자로 들여 쓰기도 해서 탭도 센다. */
const leadingWhitespace = (line: string) => line.match(/^[ \t]*/)![0]

/** 한 단계 내밀 때 줄 앞에서 지울 글자 수. 탭은 한 글자, 공백은 단계 단위에 맞춰(4칸 단위에서 6칸이면 2칸) 지운다. */
function outdentWidth(line: string, unit: string): number {
    if (line.startsWith("\t")) return 1
    const spaces = line.match(/^ */)![0].length
    return spaces === 0 ? 0 : (spaces % unit.length || unit.length)
}

/** 줄 앞 들여쓰기를 한 단계 지운다. 뒤쪽 줄부터 지워 앞쪽 위치가 밀리지 않게 한다. */
function outdent(tr: Transaction, lines: CodeLine[], unit: string) {
    for (const line of [...lines].reverse()) {
        const width = outdentWidth(line.text, unit)
        if (width > 0) tr.delete(line.start, line.start + width)
    }
}

export function indentCode(editor: Editor): boolean {
    const {state, view} = editor
    const $from = codeBlockOf(state)
    if (!$from) return false
    const {from, to} = state.selection
    const lines = linesBetween($from, from, to)
    const unit = indentUnit($from)

    // 한 줄 안이면 커서(또는 고른 글) 자리에 넣는다.
    if (lines.length === 1) {
        view.dispatch(state.tr.insertText(unit, from, to))
        return true
    }
    const tr = state.tr
    for (const line of [...lines].reverse()) tr.insertText(unit, line.start)
    view.dispatch(tr)
    return true
}

export function outdentCode(editor: Editor): boolean {
    const {state, view} = editor
    const $from = codeBlockOf(state)
    if (!$from) return false
    const {from, to} = state.selection
    const tr = state.tr
    outdent(tr, linesBetween($from, from, to), indentUnit($from))
    if (tr.docChanged) view.dispatch(tr)
    // 내밀 것이 없어도 코드 블록 밖으로 포커스가 빠지지 않게 키를 먹는다.
    return true
}

export function enterInCode(editor: Editor): boolean {
    const {state, view} = editor
    const $from = codeBlockOf(state)
    if (!$from || !state.selection.empty) return false
    const pos = $from.pos
    const [line] = linesBetween($from, pos, pos)
    const before = line.text.slice(0, pos - line.start)
    const after = line.text.slice(pos - line.start)
    const unit = indentUnit($from)
    const indent = leadingWhitespace(line.text)

    // 들여쓰기만 남은 빈 줄: 새 줄 대신 한 단계 내민다.
    if (indent && line.text.trim() === "") {
        const tr = state.tr
        outdent(tr, [line], unit)
        tr.setSelection(TextSelection.create(tr.doc, line.start + line.text.length - outdentWidth(line.text, unit)))
        view.dispatch(tr.scrollIntoView())
        return true
    }

    const trimmed = before.trimEnd()
    const opens = OPENERS.test(trimmed)
    // 커서가 들여쓰기 안쪽이면 커서 앞까지만 이어받는다. "- " 항목 줄이면 "- " 뒤 글자 자리까지.
    const item = before.match(/^([ \t]*)- (?=\S)/)
    const carried = before.trim() === "" ? before : item ? item[1] + "  " : indent
    const inner = opens ? carried + unit : carried

    // 들일 것이 없으면 기본 동작(줄바꿈, 빈 줄 두 개 뒤 Enter 로 블록 나가기)에 맡긴다.
    if (!inner) return false

    const tr = state.tr
    const closer = CLOSERS[trimmed.slice(-1)]
    const closes = closer !== undefined && after.trimStart().startsWith(closer)
    if (closes) {
        // "{|}" 에서 Enter: 닫는 괄호를 한 줄 아래 원래 들여쓰기로 내리고 그 사이에 커서를 둔다.
        tr.insertText("\n" + inner + "\n" + carried, pos)
        tr.setSelection(TextSelection.create(tr.doc, pos + 1 + inner.length))
    } else {
        tr.insertText("\n" + inner, pos)
    }
    view.dispatch(tr.scrollIntoView())
    return true
}

export function backspaceIndent(editor: Editor): boolean {
    const {state, view} = editor
    const $from = codeBlockOf(state)
    if (!$from || !state.selection.empty) return false
    const pos = $from.pos
    const [line] = linesBetween($from, pos, pos)
    const before = line.text.slice(0, pos - line.start)
    // 공백만일 때. 탭은 어차피 한 글자라 기본 Backspace 에 맡긴다.
    if (!/^ +$/.test(before)) return false
    view.dispatch(state.tr.delete(pos - outdentWidth(before, indentUnit($from)), pos))
    return true
}

export function selectCodeBlock(editor: Editor): boolean {
    const {state, view} = editor
    const $from = codeBlockOf(state)
    if (!$from || $from.parent.content.size === 0) return false
    const start = $from.start()
    const end = $from.end()
    const {from, to} = state.selection
    if (from === start && to === end) return false
    view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, start, end)))
    return true
}
