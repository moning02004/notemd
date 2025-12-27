"use client";

import React, {KeyboardEventHandler, useEffect, useRef, useState} from "react";
import {Milkdown, useEditor} from "@milkdown/react";
import {FiArrowLeft, FiMenu} from "react-icons/fi";
import {useRouter} from "next/navigation";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";
import {Crepe} from "@milkdown/crepe";
import {editorViewCtx, editorViewOptionsCtx} from "@milkdown/core";
import {apiRequest} from "@/lib/api";
import {API_HOST} from "@/constants/api";

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
    const crepeRef = useRef<Crepe | null>(null)

    useEffect(() => {
        if (!crepeRef.current) return;
        crepeRef.current.setReadonly(isReadonly);
    }, [isReadonly]);

    const editor = useEditor((root) => {
        const crepe = new Crepe({
            root: root,
            defaultValue: content,
            features: {
                [Crepe.Feature.ImageBlock]: true,
            },
            featureConfigs: {
                [Crepe.Feature.ImageBlock]: {
                    blockCaptionPlaceholderText: 'Add image caption...',
                    onUpload: async (file) => {
                        const formData = new FormData();
                        formData.append("file", file);

                        const response = await apiRequest.post(`/notes/${paramsNoteId}/images`, {
                            body: formData,
                        }, null).catch(error => {
                            console.log(error)
                        })
                        return `${API_HOST}${response.url}`
                    },
                },
            },
        })
        crepe.setReadonly(isReadonly)
        crepe.editor.config((ctx) => {
            ctx.update(editorViewOptionsCtx, (prev) => ({
                ...prev,
                attributes: {
                    class: "!px-[3.5rem] !py-[1rem] editor-font",
                },
            }))
        })

        crepe.on((listener) => {
            listener.markdownUpdated((ctx, markdown) => {
                setContent(markdown)
            })
        })

        crepeRef.current = crepe;
        return crepe
    }, []);

    const clickMenu = () => {
        onClickMenu();
    }

    const focusEditor = () => {
        const editorGet = editor.get()
        editorGet?.action(ctx => {
            const view = ctx.get(editorViewCtx)
            view.focus()
        })
    }

    const titleKeyup = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key == "Enter") {
            focusEditor()
        }
    }
    const goBack = () => {
        if (statusText == "동기화 중") {
            alert("동기화가 완료되지 않았습니다. 잠시 후 다시 시도해주세요.")
            return
        }
        router.back()
    }

    return (
        <div className="w-full mx-auto flex flex-col bg-editor">
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
            <div className="pr-3 text-right bg-editor min-h-[1.5rem]">
                {statusText}
            </div>
            <div
                className={`${isReadonly ? "" : ""}  flex-20 bg-editor`}
                onClick={focusEditor}>
                <Milkdown/>
                <div className="h-[10rem]"
                     onClick={focusEditor}></div>
            </div>
        </div>
    );
}