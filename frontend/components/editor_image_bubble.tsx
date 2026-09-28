"use client";

import React, {useRef} from "react";
import {Editor, useEditorState} from "@tiptap/react";
import {BubbleMenu} from "@tiptap/react/menus";
import {NodeSelection} from "@tiptap/pm/state";
import {AlignCenter, AlignLeft, AlignRight, Expand, RectangleHorizontal, WrapText} from "lucide-react";

import {ImageDisplay, imageDisplayOf, openImageViewer} from "@/lib/create_editor";

interface Props {
    editor: Editor;
    /** 에디터가 스크롤되는 요소. 말풍선이 이 스크롤을 따라 자리를 다시 잡는다. */
    scrollTarget?: HTMLElement | null;
}

const isImageSelected = (editor: Editor) => {
    const {selection} = editor.state;
    return selection instanceof NodeSelection && selection.node.type.name === "image";
};

/**
 * 이미지를 골랐을 때 뜨는 말풍선.
 *
 * - 블록: 한 줄을 혼자 쓴다. 크기를 바꿔도 주변 글자가 흔들리지 않고, 문단 정렬로 좌·중·우에 놓는다.
 * - 글자와 함께: 글자 사이에 흐른다. 아이콘·작은 그림처럼 문장 안에 넣을 때 쓴다.
 * 글자와 함께 둔 이미지를 크게 키우면 줄이 바뀌면서 이미지가 뛰어다니므로, 큰 이미지는 블록이 맞다.
 */
export default function EditorImageBubble({editor, scrollTarget}: Props) {
    // shouldRerenderOnTransaction 이 꺼져 있어 필요한 값만 구독한다.
    const {display, align} = useEditorState({
        editor,
        selector: ({editor}) => {
            const {selection} = editor.state;
            const node = selection instanceof NodeSelection ? selection.node : null;
            const parent = editor.state.selection.$from.parent;
            return {
                display: node ? imageDisplayOf(node.attrs) : "block",
                align: (parent.attrs.textAlign as string | undefined) ?? "left",
            };
        },
    });

    /*
     * 말풍선을 조각의 바깥 틀이 아니라 <img> 에 붙인다. 블록일 때 바깥 틀은 줄 전체 폭이라
     * 틀에 붙이면 블록↔글자와 함께를 오갈 때마다 줄 가운데와 이미지 가운데 사이를 오간다.
     */
    const imageElement = () => {
        const dom = editor.view.nodeDOM(editor.state.selection.from) as HTMLElement | null;
        return dom?.querySelector("img") ?? dom ?? null;
    };

    /*
     * 글자 사이에 있던 이미지는 표시 방식을 바꾸면 이미지 자체가 자리를 옮긴다(블록이면 다음 줄 맨 앞으로).
     * 말풍선이 따라가면 방금 누른 버튼이 손 아래에서 벗어나 번갈아 누를 수 없다.
     * 말풍선에서 바꿀 때 이미지가 옮겨 간 만큼을 기억해 두고 그만큼 되돌려 붙인다.
     * 다른 이미지를 고르면 다시 이미지에 딱 붙는다. 실제 이미지 위치에 차이만 더하므로 스크롤해도 맞다.
     */
    const shift = useRef({pos: -1, dx: 0, dy: 0});

    const getReferencedVirtualElement = () => {
        const img = imageElement();
        if (!img) return null;
        const pos = editor.state.selection.from;
        if (shift.current.pos !== pos) shift.current = {pos, dx: 0, dy: 0};
        const {dx, dy} = shift.current;
        return {
            getBoundingClientRect: () => {
                const rect = img.getBoundingClientRect();
                return new DOMRect(rect.x + dx, rect.y + dy, rect.width, rect.height);
            },
            getClientRects: () => [img.getBoundingClientRect()],
        };
    };

    const setDisplay = (value: ImageDisplay) => {
        const pos = editor.state.selection.from;
        const before = imageElement()?.getBoundingClientRect();
        // setNodeSelection 을 다시 걸어 두어 바꾼 뒤에도 말풍선이 그대로 떠 있게 한다.
        editor.chain().focus().updateAttributes("image", {display: value}).setNodeSelection(pos).run();
        const after = imageElement()?.getBoundingClientRect();
        if (before && after) {
            const base = shift.current.pos === pos ? shift.current : {dx: 0, dy: 0};
            shift.current = {pos, dx: base.dx + before.x - after.x, dy: base.dy + before.y - after.y};
        }
    };

    const setAlign = (value: "left" | "center" | "right") =>
        editor.chain().focus().setTextAlign(value).setNodeSelection(editor.state.selection.from).run();

    const buttonClass = (on: boolean) =>
        `flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer transition-colors duration-150
         ${on ? "bg-surface text-foreground" : "text-white hover:bg-surface/10"}`;

    return (
        <BubbleMenu
            editor={editor}
            pluginKey="imageBubbleMenu"
            shouldShow={({editor}) => editor.isEditable && isImageSelected(editor)}
            getReferencedVirtualElement={getReferencedVirtualElement}
            options={{placement: "top", offset: 8, scrollTarget: scrollTarget ?? undefined}}
            style={{zIndex: 9999}}
        >
            <div className="flex items-center gap-1 bg-foreground rounded-lg px-1.5 py-1 shadow-lg">
                <button className={buttonClass(display === "block")} title="한 줄을 혼자 쓰기"
                        onClick={() => setDisplay("block")}>
                    <RectangleHorizontal size={13}/> 블록
                </button>
                <button className={buttonClass(display === "inline")} title="글자 사이에 넣기"
                        onClick={() => setDisplay("inline")}>
                    <WrapText size={13}/> 글자와 함께
                </button>

                <div className="w-px h-4 bg-white/20 mx-0.5"/>
                {/* 두 번 눌러도 열리지만, 모바일은 두 번 누르기가 화면 확대와 겹친다. */}
                <button className={buttonClass(false)} title="크게 보기 (이미지를 두 번 눌러도 됩니다)"
                        onClick={() => openImageViewer(editor.view.dom, imageElement() as HTMLImageElement | null)}>
                    <Expand size={13}/>
                </button>

                {/* 정렬은 블록일 때만 뜻이 있지만 늘 그려 둔다. 나타났다 사라지면 말풍선 폭이 바뀌어
                    가운데 기준으로 뜨는 말풍선이 옆으로 밀리고, 방금 누른 버튼도 손 아래에서 벗어난다. */}
                <div className="w-px h-4 bg-white/20 mx-0.5"/>
                {([
                    ["left", "왼쪽", <AlignLeft key="l" size={13}/>],
                    ["center", "가운데", <AlignCenter key="c" size={13}/>],
                    ["right", "오른쪽", <AlignRight key="r" size={13}/>],
                ] as const).map(([value, label, icon]) => (
                    <button key={value}
                            className={`${buttonClass(display === "block" && align === value)}
                                        disabled:opacity-35 disabled:cursor-default disabled:hover:bg-transparent`}
                            title={display === "block" ? label : "블록일 때 정렬할 수 있습니다"}
                            disabled={display !== "block"}
                            onClick={() => setAlign(value)}>
                        {icon}
                    </button>
                ))}
            </div>
        </BubbleMenu>
    );
}
