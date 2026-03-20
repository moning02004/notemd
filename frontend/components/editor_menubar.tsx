"use client";

import React from "react";
import {Editor} from "@tiptap/react";
import {
    Bold,
    Italic,
    Strikethrough,
    Heading1,
    Heading2,
    List,
    ListOrdered,
    Code2,
    Quote,
    Undo2,
    Redo2,
} from "lucide-react";

type Props = {
    editor: Editor;
};

export default function MenuBar({editor}: Props) {
    if (!editor) return null;

    const base =
        "p-2 rounded hover:bg-gray-200 transition flex items-center justify-center";

    const active = "bg-gray-300";

    const button = (
        onClick: () => void,
        isActive: boolean,
        icon: React.ReactNode
    ) => (
        <button
            onClick={onClick}
            className={`${base} ${isActive ? active : ""}`}
        >
            {icon}
        </button>
    );

    return (
        <div className="flex flex-wrap gap-1 p-2">
            {button(
                () => editor.chain().focus().toggleBold().run(),
                editor.isActive("bold"),
                <Bold size={18}/>
            )}

            {button(
                () => editor.chain().focus().toggleItalic().run(),
                editor.isActive("italic"),
                <Italic size={18}/>
            )}

            {button(
                () => editor.chain().focus().toggleStrike().run(),
                editor.isActive("strike"),
                <Strikethrough size={18}/>
            )}

            {button(
                () =>
                    editor.chain().focus().toggleHeading({level: 1}).run(),
                editor.isActive("heading", {level: 1}),
                <Heading1 size={18}/>
            )}

            {button(
                () =>
                    editor.chain().focus().toggleHeading({level: 2}).run(),
                editor.isActive("heading", {level: 2}),
                <Heading2 size={18}/>
            )}

            {button(
                () => editor.chain().focus().toggleBulletList().run(),
                editor.isActive("bulletList"),
                <List size={18}/>
            )}

            {button(
                () => editor.chain().focus().toggleOrderedList().run(),
                editor.isActive("orderedList"),
                <ListOrdered size={18}/>
            )}

            {button(
                () => editor.chain().focus().toggleCodeBlock().run(),
                editor.isActive("codeBlock"),
                <Code2 size={18}/>
            )}

            {button(
                () => editor.chain().focus().toggleBlockquote().run(),
                editor.isActive("blockquote"),
                <Quote size={18}/>
            )}

            <div className="w-px h-6 bg-gray-300 mx-1  my-auto"/>

            {button(
                () => editor.chain().focus().undo().run(),
                false,
                <Undo2 size={18}/>
            )}

            {button(
                () => editor.chain().focus().redo().run(),
                false,
                <Redo2 size={18}/>
            )}
        </div>
    );
}