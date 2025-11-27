"use client";

import {useCreateBlockNote} from "@blocknote/react";
import {BlockNoteView} from "@blocknote/ariakit";

import "@blocknote/ariakit/style.css";
import {useRef} from "react";

interface EditorProps {
    onChange: (values: { title: string; content: unknown }) => void;
}

export default function Editor({onChange}: EditorProps) {
    const editor = useCreateBlockNote();
    const titleRef = useRef<HTMLInputElement>(null)

    const handleChange = () => {
        const title = titleRef.current;
        if (!title) return;

        onChange({title: title.value, content: editor.document})
    }
    return (
        <div className="w-full mx-auto">
            <div className="">
                <input type="text" ref={titleRef} onChange={handleChange}
                       className="title-editor border-b border-editor-line w-[100%] outline-none" placeholder="제목"/>
            </div>
            <div
                className="body-editor h-[90%]"
                onClick={() => editor.focus()}>
                <BlockNoteView editor={editor} theme="light"
                               onChange={handleChange}/>
            </div>
        </div>
    );

};