import StarterKit from "@tiptap/starter-kit"
import {useEditor} from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";

export function useEditorInstance({initialContent, setContent}: {
    initialContent: string,
    setContent: (value: string) => void
}) {

    return useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: "내용을 입력하세요...",
            }),
        ],
        content: initialContent,
        editorProps: {
            attributes: {
                class: "",
            },
        },
        onUpdate: ({editor}) => {
            setContent(editor.getHTML())
        }
    });
}