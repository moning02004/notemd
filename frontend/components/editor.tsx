"use client";

import React, {Dispatch, SetStateAction, useEffect, useState} from "react";
import {FiArrowLeft, FiMenu} from "react-icons/fi";
import {useRouter} from "next/navigation";

import {EditorContent} from "@tiptap/react";
import {useEditorInstance} from "@/lib/create_editor";
import MenuBar from "@/components/editor_menubar";
import {IoIosCheckmarkCircleOutline} from "react-icons/io";
import {Warning} from "@/components/icons";
import {apiRequest} from "@/lib/api";
import {CreateNoteImageResponse} from "@/types/note";
import {API_HOST} from "@/constants/api";
import toast from "react-hot-toast";
import {BubbleMenu} from "@tiptap/react/menus";

function LoadingSpinner() {
    return (
        <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin"></div>
    );
}

function Complete() {
    return (
        <IoIosCheckmarkCircleOutline size={22} className="text-green-500"/>
    );
}

interface EditorProps {
    setOpenedSetting: Dispatch<SetStateAction<boolean>>;
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
                                   setOpenedSetting,
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
    const titleRef = React.useRef<HTMLInputElement>(null);
    const router = useRouter();
    const status = (statusType == "loading") ? <LoadingSpinner/> :
        ((statusType == "complete") ? <Complete/> :
            ((statusType == "warning") ? <Warning/> :
                ""));
    const [tableMenuOpen, setTableMenuOpen] = useState(false)

    const editor = useEditorInstance({
        initialContent: content,
        setContent: setContent,
        uploadFile: async (file: File) => {
            const formData = new FormData();
            formData.append("file", file);
            try {
                const response = await apiRequest
                    .post<CreateNoteImageResponse>(`/notes/${paramsNoteId}/images`, {body: formData}, null)
                    .catch((err) => {
                        throw err;
                    });
                return `${API_HOST}${response.url}`
            } catch (err) {
                toast.error("이미지 업로드에 실패했습니다.")
                return ""
            }
        }
    })

    useEffect(() => {
        if (!editor) return
        if (editor.getHTML() === content) return

        editor.commands.setContent(content)
    }, [content])

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
        <div className="h-screen flex flex-col bg-white w-full overflow-y-auto">
            <div
                className="flex flex-row items-center bg-white border-b border-gray-200 px-3 transition-colors duration-300">
                {
                    isOwner &&
                    <div
                        className="my-auto p-1.5 rounded-lg cursor-pointer text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors duration-200"
                        onClick={goBack}>
                        <FiArrowLeft size={24}/>
                    </div>
                }
                <input type="text"
                       ref={titleRef}
                       onKeyUp={titleKeyup}
                       value={title || ''}
                       readOnly={isReadonly}
                       onChange={(e) => setTitle(e.currentTarget.value)}
                       className={`title-editor w-[100%] outline-none text-gray-900 ${isReadonly ? "cursor-text" : "cursor-text"}`}
                       placeholder="제목"
                />

                {
                    isOwner &&
                    <div
                        className="my-auto p-3 rounded-lg cursor-pointer text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors duration-200"
                        onClick={() => setOpenedSetting(true)}>
                        <FiMenu size={24}/>
                    </div>
                }
            </div>

            {
                !isReadonly &&
                <div className="pr-3 bg-editor sticky top-0 z-10 flex border-b border-gray-200 shadow-sm">
                    <div className="flex-1">
                        <MenuBar editor={editor} noteId={paramsNoteId}
                                 tableMenuOpen={tableMenuOpen}
                                 setTableMenuOpen={setTableMenuOpen}/>
                    </div>
                    <div className="mb-auto pt-3 md:p-0 md:my-auto text-right">{status}</div>
                </div>
            }
            {
                !isReadonly &&
                <BubbleMenu editor={editor} options={{placement: "top", offset: 8}} style={{
                    zIndex: 9999,
                }}>
                    <div className="flex items-center gap-1 bg-gray-900 rounded-lg px-1.5 py-1 shadow-lg z-20">
                        <button
                            onClick={() => editor.chain().focus().toggleBold().run()}
                            className={`px-2 py-1 rounded text-xs font-medium cursor-pointer transition-colors duration-150
                                ${editor.isActive("bold") ? "bg-white text-gray-900" : "text-white hover:bg-white/10"}`}>
                            B
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            className={`px-2 py-1 rounded text-xs italic cursor-pointer transition-colors duration-150
                                ${editor.isActive("italic") ? "bg-white text-gray-900" : "text-white hover:bg-white/10"}`}>
                            I
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleStrike().run()}
                            className={`px-2 py-1 rounded text-xs line-through cursor-pointer transition-colors duration-150
                                ${editor.isActive("strike") ? "bg-white text-gray-900" : "text-white hover:bg-white/10"}`}>
                            S
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleCode().run()}
                            className={`px-2 py-1 rounded text-xs font-mono cursor-pointer transition-colors duration-150
                                ${editor.isActive("code") ? "bg-white text-gray-900" : "text-white hover:bg-white/10"}`}>
                            {"</>"}
                        </button>
                    </div>
                </BubbleMenu>
            }

            <div className="flex-20 bg-white">
                <EditorContent editor={editor}
                               className="h-[100%]"
                               onClick={() => {
                                   setTableMenuOpen(false)
                                   setOpenedSetting(false)
                               }}/>
            </div>
        </div>
    );
}