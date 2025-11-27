"use client";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/ariakit";

import "@blocknote/ariakit/style.css";
import { useRef, useState } from "react";

export default function Editor ({ onChange }: 
  {
    onChange: (markdown: object) => void,
 }) {
  const editor = useCreateBlockNote();
  const titleRef = useRef(null)

  return (
    <div className="w-full mx-auto">
      <div className="">
        <input type="text" ref={titleRef} onChange={(e) => onChange({title: titleRef.current.value, content: editor.document})} className="title-editor border-b border-editor-line w-[100%] outline-none" placeholder="제목" />
      </div>
      <div
        className="body-editor h-[90%]"
        onClick={() => editor.focus()}>
        <BlockNoteView editor={editor} theme="light" onChange={() => onChange({title: titleRef.current.value, content: editor.document})} />
      </div>
    </div>
  );

};