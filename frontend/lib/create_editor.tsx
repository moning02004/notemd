import {useEditor} from "@tiptap/react";

import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import {createLowlight} from "lowlight";

import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import yaml from 'highlight.js/lib/languages/yaml'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import sql from 'highlight.js/lib/languages/sql'
import markdown from 'highlight.js/lib/languages/markdown'
import dockerfile from 'highlight.js/lib/languages/dockerfile'
import nginx from 'highlight.js/lib/languages/nginx'
import go from 'highlight.js/lib/languages/go'
import java from 'highlight.js/lib/languages/java'

import 'highlight.js/styles/atom-one-dark.css'
import {TaskItem, TaskList} from "@tiptap/extension-list";
import Image from '@tiptap/extension-image'
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import {Dropcursor, Placeholder} from "@tiptap/extensions";

export const CustomCodeBlock = CodeBlockLowlight.extend({
    addKeyboardShortcuts() {
        return {
            Tab: ({editor}) => {
                if (editor.isActive('codeBlock')) {
                    editor.commands.insertContent('    ') // 공백 2칸
                    return true
                }
                return false
            },

            'Shift-Tab': ({editor}) => {
                if (editor.isActive('codeBlock')) {
                    const {state, dispatch} = editor.view
                    const {from, to} = state.selection

                    const text = state.doc.textBetween(from - 4, from)
                    if (text === '    ') {
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
    lowlight.register('js', javascript)

    lowlight.register('typescript', typescript)
    lowlight.register('ts', typescript)

    lowlight.register('python', python)
    lowlight.register('py', python)

    lowlight.register('bash', bash)
    lowlight.register('sh', bash)
    lowlight.register('shell', bash)

    lowlight.register('json', json)
    lowlight.register('yaml', yaml)
    lowlight.register('yml', yaml)

    lowlight.register('html', xml)
    lowlight.register('xml', xml)

    lowlight.register('css', css)

    lowlight.register('sql', sql)

    lowlight.register('markdown', markdown)
    lowlight.register('md', markdown)

    lowlight.register('dockerfile', dockerfile)
    lowlight.register('docker', dockerfile)

    lowlight.register('nginx', nginx)

    lowlight.register('go', go)

    lowlight.register('java', java)

    return useEditor({
        immediatelyRender: false,
        shouldRerenderOnTransaction: false,
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
        onUpdate: ({editor}) => {
            setContent(editor.getHTML())
        }
    });
}