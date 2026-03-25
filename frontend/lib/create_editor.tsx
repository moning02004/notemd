import StarterKit from "@tiptap/starter-kit"
import {useEditor} from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import Image from '@tiptap/extension-image'
import {Dropcursor} from "@tiptap/extensions";
import TextAlign from "@tiptap/extension-text-align";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import {createLowlight} from "lowlight";
import javascript from 'highlight.js/lib/languages/javascript'
import python from 'highlight.js/lib/languages/python'
import 'highlight.js/styles/atom-one-dark.css'

export const CustomCodeBlock = CodeBlockLowlight.extend({
    addKeyboardShortcuts() {
        return {
            Tab: ({editor}) => {
                if (editor.isActive('codeBlock')) {
                    editor.commands.insertContent('  ') // 공백 2칸
                    return true
                }
                return false
            },

            'Shift-Tab': ({editor}) => {
                if (editor.isActive('codeBlock')) {
                    const {state, dispatch} = editor.view
                    const {from, to} = state.selection

                    const text = state.doc.textBetween(from - 2, from)
                    if (text === '  ') {
                        dispatch(
                            state.tr.delete(from - 2, from)
                        )
                    }

                    return true
                }
                return false
            },
        }
    },

    renderHTML({node, HTMLAttributes}) {
        const language = node.attrs.language || 'text'

        return [
            'pre',
            {
                'data-language': language,
            },
            [
                'code',
                {
                    ...HTMLAttributes,
                    class: `language-${language}`,
                },
                0,
            ],
        ]
    },
})


export function useEditorInstance({initialContent, setContent}: {
    initialContent: string,
    setContent: (value: string) => void
}) {
    const lowlight = createLowlight()
    lowlight.register('javascript', javascript)
    lowlight.register('python', python)


    return useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                codeBlock: false,
            }),
            Image.configure({
                resize: {
                    enabled: true,
                    alwaysPreserveAspectRatio: true,
                },
            }),
            TextAlign.configure({
                types: ["heading", "paragraph"],
            }),
            Dropcursor,
            Placeholder.configure({
                placeholder: "내용을 입력하세요...",
            }),
            CustomCodeBlock.configure({
                lowlight,
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