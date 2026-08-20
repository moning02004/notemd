"use client";

import React from "react";
import {Editor, useEditorState} from "@tiptap/react";
import {BubbleMenu} from "@tiptap/react/menus";
import {ExternalLink, Pencil, Unlink} from "lucide-react";

interface Props {
    editor: Editor;
    onEdit: () => void;
}

/**
 * 편집 중에 링크를 클릭하면 뜨는 말풍선.
 *
 * 편집 모드에서는 링크를 눌러도 바로 이동하지 않고(openOnClick: false) 커서만 옮겨간다.
 * 이 말풍선에서 이동할지, 고칠지, 링크만 뗄지 고른다.
 * 읽기 전용일 때는 익스텐션이 클릭 핸들러를 건너뛰므로 예전처럼 바로 이동한다.
 */
export default function EditorLinkBubble({editor, onEdit}: Props) {
    // shouldRerenderOnTransaction 이 꺼져 있어서, 커서를 옮겨도 이 컴포넌트는 다시 그려지지 않는다.
    // 필요한 값만 구독해 링크 사이를 오갈 때도 최신 href 가 보이게 한다.
    const {href, isLink} = useEditorState({
        editor,
        selector: ({editor}) => ({
            href: (editor.getAttributes("link").href as string) ?? "",
            isLink: editor.isActive("link"),
        }),
    });

    // 캐럿이 아니라 <a> 전체를 기준으로 말풍선을 띄운다
    const getLinkElement = () => {
        const {view, state} = editor;
        const dom = view.domAtPos(state.selection.from).node;
        const element = dom.nodeType === Node.TEXT_NODE ? dom.parentElement : (dom as HTMLElement);
        return element?.closest("a") ?? null;
    };

    const openLink = () => {
        if (!href) return;
        window.open(href, "_blank", "noopener,noreferrer");
    };

    const buttonClass =
        "flex items-center gap-1 px-2 py-1 rounded text-xs text-white cursor-pointer transition-colors duration-150 hover:bg-surface/10";

    return (
        <BubbleMenu
            editor={editor}
            pluginKey="linkBubbleMenu"
            // 선택 영역이 있을 때는 기존 서식 말풍선이 뜨므로, 커서만 놓인 경우로 한정한다
            shouldShow={({state}) => editor.isEditable && state.selection.empty && editor.isActive("link")}
            getReferencedVirtualElement={getLinkElement}
            options={{placement: "bottom", offset: 8}}
            style={{zIndex: 9999}}
        >
            {isLink && (
                <div className="flex items-center gap-1 bg-foreground rounded-lg px-1.5 py-1 shadow-lg">
                    <button
                        onClick={openLink}
                        title={href}
                        className={`${buttonClass} max-w-[200px]`}
                    >
                        <ExternalLink size={12} className="shrink-0"/>
                        <span className="truncate">{href}</span>
                    </button>

                    <div className="w-px h-4 bg-white/20"/>

                    <button onClick={onEdit} title="링크 편집" className={buttonClass}>
                        <Pencil size={12}/>
                    </button>
                    <button
                        onClick={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()}
                        title="링크 제거"
                        className={buttonClass}
                    >
                        <Unlink size={12}/>
                    </button>
                </div>
            )}
        </BubbleMenu>
    );
}