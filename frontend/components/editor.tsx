"use client";

import {useCreateBlockNote} from "@blocknote/react";
import {BlockNoteView} from "@blocknote/ariakit";

import "@blocknote/ariakit/style.css";
import {useEffect, useState} from "react";
import {FiArrowLeft, FiMenu} from "react-icons/fi";
import {PartialBlock} from "@blocknote/core";

interface EditorProps {
    onChange: (values: { title: string; content: PartialBlock<any, any, any>[] }) => void;
    onClickMenu: () => void;
    isEditable: boolean;

    paramsGroup: string;
    paramsTitle: string;
    paramsContent: PartialBlock<any, any, any>[];
}

export default function Editor({
                                   onChange,
                                   onClickMenu,
                                   isEditable,
                                   paramsGroup,
                                   paramsTitle,
                                   paramsContent
                               }: EditorProps) {
    const params: {
        initialContent?: PartialBlock<any, any, any>[];
    } = {}
    if (paramsContent.length) {
        params.initialContent = paramsContent
    }
    const editor = useCreateBlockNote(params);
    const [title, setTitle] = useState(paramsTitle);
    const [contents, setContents] = useState(paramsContent);

    useEffect(() => {
        onChange({title: title, content: contents})
    }, [title, contents])

    useEffect(() => {
        if (isEditable) {
            editor.focus()
        }
    }, [isEditable])

    const clickMenu = () => {
        console.log("click menu")
        onClickMenu();
    }
    const titleKeyup = (e: any) => {
        if (e.key == "Enter") {
            editor.focus()
        }
    }
    const goBack = () => {
        window.location.href = `/groups/${paramsGroup}`
    }
    return (
        <div className="w-full mx-auto">
            <div className="group flex flex-row bg-white border-b border-editor-line px-3">
                <div className="my-auto cursor-pointer"
                     onClick={goBack}>
                    <FiArrowLeft size={24}/>
                </div>
                <input type="text" onChange={(e) => setTitle(e.currentTarget.value)} onKeyUp={titleKeyup}
                       className="title-editor w-[100%] outline-none" placeholder="제목"/>
                <div className="my-auto p-3 cursor-pointer"
                     onClick={clickMenu}>
                    <FiMenu size={24}/>
                </div>
            </div>
            <div
                className="body-editor h-[90%]"
                onClick={() => editor.focus()}>
                <BlockNoteView editor={editor}
                               theme="light"
                               onChange={(updatedEditor) => setContents(updatedEditor.document)}
                               editable={isEditable}
                />
            </div>
        </div>
    );

};