"use client";

import React, {useEffect} from "react";
import {FiArrowLeft, FiMenu} from "react-icons/fi";
import {useRouter} from "next/navigation";

import {EditorContent} from "@tiptap/react";
import {useEditorInstance} from "@/lib/create_editor";
import MenuBar from "@/components/editor_menubar";
import {IoIosCheckmarkCircleOutline} from "react-icons/io";
import {Warning} from "@/components/icons";

function LoadingSpinner() {
    return (
        <div className="ml-auto w-5 h-5 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin"></div>
    );
}

function Complete() {
    return (
        <IoIosCheckmarkCircleOutline size={22} className="text-green-500"/>
    );
}

interface EditorProps {
    onClickMenu: () => void;
    isReadonly: boolean;
    isOwner: boolean;
    title: string;
    content: string;
    setTitle: (value: string) => void;
    setContent: (value: string) => void;
    paramsNoteId: string;
    statusType: string;
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
                                   statusType
                               }: EditorProps
) {
    const router = useRouter();
    const status = (statusType == "loading") ? <LoadingSpinner/> :
        ((statusType == "complete") ? <Complete/> :
            ((statusType == "warning") ? <Warning /> :
                ""));

    const editor = useEditorInstance({
        initialContent: content,
        setContent: setContent
    })

    useEffect(() => {
        editor?.setEditable(!isReadonly);
    }, [editor, isReadonly]);

    const titleKeyup = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key == "Enter") {
            editor.commands.focus("start")
        }
    }
    const goBack = () => {
        if (statusType == "loading") {
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
                         onClick={onClickMenu}>
                        <FiMenu size={24}/>
                    </div>
                }
            </div>
            {
                !isReadonly &&
                <div className="pr-3 bg-editor sticky top-0 z-10 flex border-b border-gray-300">
                    <div className="flex-1">
                        <MenuBar editor={editor} noteId={paramsNoteId}/>
                    </div>
                    <div className="my-auto text-right">{status}</div>
                </div>
            }
            <div className="flex-20 bg-editor">
                <EditorContent editor={editor} className="h-[100%]"/>
            </div>
        </div>
    );
}