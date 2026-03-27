"use client";

import React, {useRef} from "react";
import {Editor} from "@tiptap/react";
import {
    AlignCenter,
    AlignLeft,
    AlignRight,
    Bold,
    CheckSquare,
    Code2,
    Heading1,
    Heading2,
    Italic,
    List,
    ListOrdered,
    Quote,
    Redo2,
    Strikethrough,
    Undo2
} from "lucide-react";
import {FiImage} from "react-icons/fi";
import {apiRequest} from "@/lib/api";
import {CreateNoteImageResponse} from "@/types/note";
import {API_HOST} from "@/constants/api";

type Props = {
    editor: Editor;
    noteId: string;
};

export default function MenuBar({editor, noteId}: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleImageClick = () => {
        fileInputRef.current?.click();
    };

    const handleImageUpload = async (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await apiRequest.post<CreateNoteImageResponse>(`/notes/${noteId}/images`, {
                body: formData,
            }, null).catch(error => {
                throw error
            })

            editor
                .chain()
                .focus()
                .setImage({src: `${API_HOST}${response.url}`})
                .run();

        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="flex flex-wrap gap-1 p-2 w-[90%]">
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

            <div className="w-px h-6 bg-gray-300 mx-1  my-auto"/>

            {button(
                () => editor.chain().focus().setTextAlign("left").run(),
                editor.isActive({textAlign: "left"}),
                <AlignLeft size={18}/>
            )}

            {button(
                () => editor.chain().focus().setTextAlign("center").run(),
                editor.isActive({textAlign: "center"}),
                <AlignCenter size={18}/>
            )}

            {button(
                () => editor.chain().focus().setTextAlign("right").run(),
                editor.isActive({textAlign: "right"}),
                <AlignRight size={18}/>
            )}

            <div className="w-px h-6 bg-gray-300 mx-1  my-auto"/>
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

            {button(handleImageClick, false, <FiImage size={18}/>)}
            <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={handleImageUpload}
            />

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