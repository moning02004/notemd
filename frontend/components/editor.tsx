"use client";

import React, {Dispatch, SetStateAction, useEffect, useState} from "react";
import {FiArrowLeft, FiMenu} from "react-icons/fi";
import {useRouter} from "next/navigation";

import {EditorContent} from "@tiptap/react";
import {useEditorInstance} from "@/lib/create_editor";
import MenuBar from "@/components/editor_menubar";
import {Complete, LoadingSpinner, Warning} from "@/components/icons";
import {apiRequest} from "@/lib/api";
import {CreateNoteImageResponse} from "@/types/note";
import {API_HOST} from "@/constants/api";
import toast from "react-hot-toast";
import {BubbleMenu} from "@tiptap/react/menus";
import {useAuthStore} from "@/store/auth";
import EditorLinkModal from "@/components/editor_link_modal";
import EditorLinkBubble from "@/components/editor_link_bubble";
import {Link as LinkIcon} from "lucide-react";
import {MdWorkspacesFilled} from "react-icons/md";

interface EditorProps {
    setOpenedSetting: Dispatch<SetStateAction<boolean>>;
    isReadonly: boolean;
    isOwner: boolean;
    isEditable: boolean;
    title: string;
    content: string;
    setTitle: (value: string) => void;
    setContent: (value: string) => void;
    paramsNoteId: string;
    statusType: string;
    widthClass: string;
}

export function MarkdownEditor({
                                   setOpenedSetting,
                                   paramsNoteId,
                                   title,
                                   content,
                                   isOwner,
                                   isEditable,
                                   setTitle,
                                   setContent,
                                   isReadonly,
                                   statusType,
                                   widthClass
                               }: EditorProps
) {
    const titleRef = React.useRef<HTMLInputElement>(null);
    const router = useRouter();
    const status = (statusType == "loading") ? <LoadingSpinner/> :
        ((statusType == "complete") ? <Complete/> :
            ((statusType == "warning") ? <Warning/> :
                ""));
    const [tableMenuOpen, setTableMenuOpen] = useState(false)
    const [linkModalOpen, setLinkModalOpen] = useState(false)
    const {token} = useAuthStore.getState();

    const editor = useEditorInstance({
        initialContent: content,
        setContent: setContent,
        uploadFile: async (file: File) => {
            const formData = new FormData();
            formData.append("file", file);
            try {
                const response = await apiRequest
                    .post<CreateNoteImageResponse>(`/notes/${paramsNoteId}/images`, {body: formData}, {isMime: true})
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
        <div className="h-screen flex flex-col bg-surface w-full overflow-y-auto">
            <div
                className="flex flex-row items-center bg-surface border-b border-border px-3 transition-colors duration-300">
                {
                    token &&
                    <div
                        className="my-auto p-1.5 rounded-lg cursor-pointer text-muted hover:bg-background hover:text-foreground transition-colors duration-200"
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
                       className={`title-editor w-[100%] outline-none text-foreground ${isReadonly ? "cursor-text" : "cursor-text"}`}
                       placeholder="제목"
                />

                {
                    isOwner ?
                        <div
                            className="my-auto p-3 rounded-lg cursor-pointer text-muted hover:bg-background hover:text-foreground transition-colors duration-200"
                            onClick={() => setOpenedSetting(true)}>
                            <FiMenu size={24}/>
                        </div> : !isReadonly ? <div className="text-sm"><MdWorkspacesFilled/></div> : <div></div>
                }
            </div>

            {
                !isReadonly &&
                <div className="pr-3 bg-editor sticky top-0 z-10 flex shadow-sm">
                    <div className="flex-1">
                        <MenuBar editor={editor} noteId={paramsNoteId}
                                 tableMenuOpen={tableMenuOpen}
                                 setTableMenuOpen={setTableMenuOpen}
                                 openLinkModal={() => setLinkModalOpen(true)}/>
                    </div>
                    <div className="mb-auto pt-3 md:p-0 md:my-auto text-right">{status}</div>
                </div>
            }
            {
                /* 버블 메뉴의 z-index 가 모달보다 높아서, 링크 모달이 떠 있는 동안에는 감춘다 */
                !isReadonly && !linkModalOpen &&
                <BubbleMenu editor={editor} options={{placement: "top", offset: 8}} style={{
                    zIndex: 9999,
                }}>
                    <div className="flex items-center gap-1 bg-foreground rounded-lg px-1.5 py-1 shadow-lg z-20">
                        <button
                            onClick={() => editor.chain().focus().toggleBold().run()}
                            className={`px-2 py-1 rounded text-xs font-medium cursor-pointer transition-colors duration-150
                                ${editor.isActive("bold") ? "bg-surface text-foreground" : "text-white hover:bg-surface/10"}`}>
                            B
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            className={`px-2 py-1 rounded text-xs italic cursor-pointer transition-colors duration-150
                                ${editor.isActive("italic") ? "bg-surface text-foreground" : "text-white hover:bg-surface/10"}`}>
                            I
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleStrike().run()}
                            className={`px-2 py-1 rounded text-xs line-through cursor-pointer transition-colors duration-150
                                ${editor.isActive("strike") ? "bg-surface text-foreground" : "text-white hover:bg-surface/10"}`}>
                            S
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleCode().run()}
                            className={`px-2 py-1 rounded text-xs font-mono cursor-pointer transition-colors duration-150
                                ${editor.isActive("code") ? "bg-surface text-foreground" : "text-white hover:bg-surface/10"}`}>
                            {"</>"}
                        </button>
                        <button
                            onClick={() => setLinkModalOpen(true)}
                            title="링크"
                            className={`px-2 py-1 rounded cursor-pointer transition-colors duration-150
                                ${editor.isActive("link") ? "bg-surface text-foreground" : "text-white hover:bg-surface/10"}`}>
                            <LinkIcon size={14}/>
                        </button>
                    </div>
                </BubbleMenu>
            }

            {
                !isReadonly && !linkModalOpen &&
                <EditorLinkBubble
                    editor={editor}
                    onEdit={() => setLinkModalOpen(true)}/>
            }

            {
                !isReadonly &&
                <EditorLinkModal
                    editor={editor}
                    open={linkModalOpen}
                    onClose={() => setLinkModalOpen(false)}/>
            }

            <div className={`flex-20 bg-surface ${widthClass} mx-auto`}>
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