"use client";

import React, {useEffect} from "react";
import {FiArrowLeft, FiMenu} from "react-icons/fi";
import {useRouter} from "next/navigation";

import {EditorContent} from "@tiptap/react";
import {useEditorInstance} from "@/lib/create_editor";
import MenuBar from "@/components/editor_menubar";

interface EditorProps {
    onClickMenu: () => void;
    isReadonly: boolean;
    isOwner: boolean;
    title: string;
    content: string;
    setTitle: (value: string) => void;
    setContent: (value: string) => void;
    paramsNoteId: string;
    statusText: string;
}

export function MarkdownEditor({
                                   onClickMenu,
                                   paramsNoteId,
                                   title,
                                   content,
                                   isOwner,
                                   setTitle,
                                   setContent,
                                   isReadonly,
                                   statusText
                               }: EditorProps
) {
    const router = useRouter();

    const editor = useEditorInstance({
        initialContent: content,
        setContent: setContent
    })

    useEffect(() => {
        if (editor) {
            editor.setEditable(!isReadonly);
        }
    }, [editor, isReadonly]);

    const clickMenu = () => {
        onClickMenu();
    }

    const titleKeyup = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key == "Enter") {
            editor.commands.focus("start")
        }
    }
    const goBack = () => {
        if (statusText == "동기화 중") {
            alert("동기화가 완료되지 않았습니다. 잠시 후 다시 시도해주세요.")
            return
        }
        router.back()
    }

    if (!editor) return <div></div>;
    return (
        <div className="h-screen flex flex-col bg-editor w-full  overflow-y-auto">
            <div className="group flex-1 flex flex-row bg-editor border-b border-editor-line px-3">
                {
                    isOwner &&
                    <div className="my-auto cursor-pointer"
                         onClick={goBack}>
                        <FiArrowLeft size={24}/>
                    </div>
                }
                <input type="text"
                       onKeyUp={titleKeyup}
                       value={title || ''}
                       readOnly={isReadonly}
                       onChange={(e) => setTitle(e.currentTarget.value)}
                       className={`title-editor w-[100%] outline-none  ${isReadonly ? "cursor-text" : "cursor-text"}`}
                       placeholder="제목"
                />

                {
                    isOwner &&
                    <div className="my-auto p-3 cursor-pointer"
                         onClick={clickMenu}>
                        <FiMenu size={24}/>
                    </div>
                }
            </div>
            {
                !isReadonly &&
                <div className="pr-3 bg-editor sticky top-0 z-10 flex border-b border-gray-300">
                    <div className="flex-11">
                        <MenuBar editor={editor}/>
                    </div>
                    <div className="flex-3 my-auto text-right">{statusText}</div>
                </div>
            }
            <div className="flex-20 bg-editor">
                <EditorContent editor={editor} className="h-[100%]"/>
            </div>
        </div>
    );
}