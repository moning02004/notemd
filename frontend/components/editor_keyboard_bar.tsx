"use client";

import React, {useEffect, useState} from "react";
import {Editor, useEditorState} from "@tiptap/react";
import {Selection, TextSelection} from "@tiptap/pm/state";
import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    IndentDecrease,
    IndentIncrease,
    KeyboardOff,
    Redo2,
    Undo2,
} from "lucide-react";
import {indentCode, outdentCode} from "@/lib/code_block";

/*
 * 휴대폰에서 본문을 쓰는 동안 키보드 바로 위에 붙는 막대.
 *
 * 휴대폰 키보드에는 Tab·화살표·되돌리기가 없다. 목록을 들이고 내밀거나(Tab/Shift-Tab), 손가락으로 맞추기 어려운
 * 커서를 한 칸씩 옮기거나, 잘못 지운 것을 되돌릴 길이 없어 여기에 모아 둔다.
 *
 * 단추를 눌러도 본문에서 포커스가 빠지지 않게 pointerdown 을 막는다. 빠지면 키보드가 내려가 버린다.
 */

/** 화면 아래에서 키보드가 차지한 높이. 키보드가 layout viewport 를 줄이지 않는 브라우저(iOS 등)에서도 맞다. */
function useKeyboardInset(): number {
    const [inset, setInset] = useState(0);
    useEffect(() => {
        const viewport = window.visualViewport;
        if (!viewport) return;
        const update = () => setInset(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
        update();
        viewport.addEventListener("resize", update);
        viewport.addEventListener("scroll", update);
        return () => {
            viewport.removeEventListener("resize", update);
            viewport.removeEventListener("scroll", update);
        };
    }, []);
    return inset;
}

/** 손가락으로 쓰는 기기인지(마우스·트랙패드가 붙은 태블릿은 빼고). */
function useTouchOnly(): boolean {
    const [touch, setTouch] = useState(false);
    useEffect(() => {
        const query = window.matchMedia("(hover: none) and (pointer: coarse)");
        const update = () => setTouch(query.matches);
        update();
        query.addEventListener("change", update);
        return () => query.removeEventListener("change", update);
    }, []);
    return touch;
}

/** 지금 커서가 있는 목록 항목의 종류. 체크리스트와 불릿·번호 목록은 항목 노드가 다르다. */
const listItemType = (editor: Editor) => editor.isActive("taskItem") ? "taskItem" : "listItem";

function indent(editor: Editor) {
    if (editor.isActive("codeBlock")) return indentCode(editor);
    return editor.commands.sinkListItem(listItemType(editor));
}

function outdent(editor: Editor) {
    if (editor.isActive("codeBlock")) return outdentCode(editor);
    return editor.commands.liftListItem(listItemType(editor));
}

/** 한 글자 옆으로. 문단 끝·처음에서는 이웃 문단으로 넘어간다. */
function moveSideways(editor: Editor, dir: -1 | 1) {
    const {state, view} = editor;
    const {selection, doc} = state;
    // 고른 글이 있으면 먼저 그 끝으로 접는다(키보드 ←/→ 와 같다).
    if (!selection.empty) {
        view.dispatch(state.tr.setSelection(TextSelection.create(doc, dir < 0 ? selection.from : selection.to)));
        return;
    }
    const $head = selection.$head;
    const inside = dir < 0 ? $head.parentOffset > 0 : $head.parentOffset < $head.parent.content.size;
    const target = inside && $head.parent.isTextblock
        ? TextSelection.create(doc, $head.pos + dir)
        : Selection.findFrom(doc.resolve(dir < 0 ? $head.before() : $head.after()), dir, true);
    if (target) view.dispatch(state.tr.setSelection(target).scrollIntoView());
}

/** 한 줄 위·아래로. 화면에 그려진 줄을 따라가므로 문단 안에서 접힌 줄도 한 줄씩 옮긴다. */
function moveVertically(editor: Editor, dir: -1 | 1) {
    const {state, view} = editor;
    const head = state.selection.head;
    const coords = view.coordsAtPos(head);
    const line = Math.max(coords.bottom - coords.top, 12);
    /*
     * 커서 줄 바로 위(아래)부터 조금씩 멀리 짚어 본다. 문단 사이 여백을 짚어도 posAtCoords 는 가까운 문단의 끝을
     * 돌려줘 엉뚱한 자리(윗문단 끝)로 가므로, 짚은 높이가 돌려받은 자리의 글줄 안에 들 때만 받는다.
     */
    for (let reach = 2; reach <= line * 3; reach += 4) {
        const top = dir < 0 ? coords.top - reach : coords.bottom + reach;
        const found = view.posAtCoords({left: coords.left, top});
        // 블록 사이(글줄이 아닌 자리)는 건너뛴다.
        if (!found || found.pos === head || !state.doc.resolve(found.pos).parent.isTextblock) continue;
        const target = view.coordsAtPos(found.pos);
        const onThatLine = target.top - 1 <= top && top <= target.bottom + 1;
        const otherLine = dir < 0 ? target.bottom <= coords.top + 1 : target.top >= coords.bottom - 1;
        if (!onThatLine || !otherLine) continue;
        view.dispatch(state.tr.setSelection(TextSelection.near(state.doc.resolve(found.pos), dir)).scrollIntoView());
        return;
    }
    // 화면 밖(툴바 아래 등)이라 짚지 못하면 이웃 문단으로.
    const $head = state.selection.$head;
    const target = Selection.findFrom(state.doc.resolve(dir < 0 ? $head.before() : $head.after()), dir, true);
    if (target) view.dispatch(state.tr.setSelection(target).scrollIntoView());
}

export default function EditorKeyboardBar({editor}: { editor: Editor }) {
    const inset = useKeyboardInset();
    const touch = useTouchOnly();

    // shouldRerenderOnTransaction 이 꺼져 있어 필요한 값만 구독한다.
    const {focused, canIndent, canOutdent, canUndo, canRedo} = useEditorState({
        editor,
        selector: ({editor}) => {
            const inCode = editor.isActive("codeBlock");
            const type = listItemType(editor);
            return {
                focused: editor.isFocused,
                canIndent: inCode || editor.can().sinkListItem(type),
                canOutdent: inCode || editor.can().liftListItem(type),
                canUndo: editor.can().undo(),
                canRedo: editor.can().redo(),
            };
        },
    });

    if (!touch || !focused) return null;

    const key = (label: string, icon: React.ReactNode, run: () => void, enabled = true) => (
        <button type="button"
                aria-label={label}
                title={label}
                disabled={!enabled}
                onPointerDown={e => e.preventDefault()}
                onMouseDown={e => e.preventDefault()}
                onClick={run}
                className="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg text-foreground
                           active:bg-border disabled:text-subtle">
            {icon}
        </button>
    );
    const divider = <span aria-hidden className="shrink-0 w-px h-5 bg-border mx-0.5"/>;

    return (
        <div role="toolbar" aria-label="키보드 도구"
             style={{bottom: inset}}
             className="fixed left-0 right-0 z-40 flex items-center gap-0.5 px-1 h-11 overflow-x-auto scrollbar-none
                        bg-surface border-t border-border">
            {key("내어쓰기", <IndentDecrease size={20}/>, () => outdent(editor), canOutdent)}
            {key("들여쓰기", <IndentIncrease size={20}/>, () => indent(editor), canIndent)}
            {divider}
            {key("왼쪽으로", <ChevronLeft size={20}/>, () => moveSideways(editor, -1))}
            {key("위로", <ChevronUp size={20}/>, () => moveVertically(editor, -1))}
            {key("아래로", <ChevronDown size={20}/>, () => moveVertically(editor, 1))}
            {key("오른쪽으로", <ChevronRight size={20}/>, () => moveSideways(editor, 1))}
            {divider}
            {key("되돌리기", <Undo2 size={20}/>, () => editor.commands.undo(), canUndo)}
            {key("다시 하기", <Redo2 size={20}/>, () => editor.commands.redo(), canRedo)}
            <span className="flex-1"/>
            {key("키보드 내리기", <KeyboardOff size={20}/>, () => editor.commands.blur())}
        </div>
    );
}
