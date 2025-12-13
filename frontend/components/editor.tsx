"use client";

import {useEffect, useState} from "react";
import {Milkdown, useEditor} from "@milkdown/react";
import {FiArrowLeft, FiMenu} from "react-icons/fi";
import {useRouter} from "next/navigation";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";
import {Crepe} from "@milkdown/crepe";
import {editorViewCtx, editorViewOptionsCtx} from "@milkdown/core";

interface EditorProps {
    onChange: (values: { title: string; content: string }) => void;
    onClickMenu: () => void;
    isReadonly: boolean;
    paramsTitle: string;
    paramsContent: string;
    statusText: string;
}

export default function MarkdownEditor({
                                           onChange,
                                           onClickMenu,
                                           paramsTitle,
                                           paramsContent,
                                           isReadonly,
                                           statusText
                                       }: EditorProps
) {
    const router = useRouter();
    const [title, setTitle] = useState(paramsTitle);
    const [content, setContent] = useState(paramsContent);

    useEffect(() => {
        onChange({title: title, content: content})
    }, [title, content])

    const editor = useEditor((root) => {
        const crepe = new Crepe({
            root: root,
            defaultValue: paramsContent,
        })
        // crepe.setReadonly(!isReadonly)
        crepe.editor.config((ctx) => {
            // Add attributes to the editor container
            ctx.update(editorViewOptionsCtx, (prev) => ({
                ...prev,
                attributes: {
                    class: "!px-[3.5rem] !py-[1rem]",
                },
            }))
        })

        crepe.on((listener) => {
            listener.markdownUpdated((ctx, markdown, prevMarkdown) => {
                setContent(markdown)
            })
        })
        return crepe
    }, []);

    const clickMenu = () => {
        console.log("click menu")
        onClickMenu();
    }
    const focusEditor = () => {
        const editorGet = editor.get()
        editorGet?.action(ctx => {
            const view = ctx.get(editorViewCtx)
            view.focus()
        })
    }
    const titleKeyup = (e) => {
        if (e.key == "Enter") {
            focusEditor()
        }
    }
    const goBack = () => {
        if (statusText == "동기화 중" && !confirm("저장이 완료되지 않았습니다. 계속 하시겠습니까?")) return
        router.back()
    }

    return (
        <div className="w-full mx-auto flex flex-col bg-editor">
            <div className="group flex-1 flex flex-row bg-editor border-b border-editor-line px-3">
                <div className="my-auto cursor-pointer"
                     onClick={goBack}>
                    <FiArrowLeft size={24}/>
                </div>
                <input type="text"
                       onKeyUp={titleKeyup}
                       value={title || ''}
                       onChange={(e) => setTitle(e.currentTarget.value)}
                       className="title-editor w-[100%] outline-none" placeholder="제목"
                />
                <div className="my-auto p-3 cursor-pointer"
                     onClick={clickMenu}>
                    <FiMenu size={24}/>
                </div>
            </div>
            <div className="pr-3 text-right bg-editor">
                {statusText}
            </div>
            <div
                className={`${isReadonly ? "" : ""}  flex-20 bg-editor`}
                onClick={focusEditor}>
                <Milkdown/>
            </div>
        </div>
    );
};