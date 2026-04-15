import {useEditor} from "@tiptap/react";

import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import {createLowlight} from "lowlight";
import Text from '@tiptap/extension-text'

import Document from '@tiptap/extension-document'
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

import Blockquote from '@tiptap/extension-blockquote'
import History from '@tiptap/extension-history'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import HardBreak from '@tiptap/extension-hard-break'
import HorizontalRule from '@tiptap/extension-horizontal-rule'

// 마크
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Strike from '@tiptap/extension-strike'
import Code from '@tiptap/extension-code'

// 기능
import Gapcursor from '@tiptap/extension-gapcursor'

import 'highlight.js/styles/atom-one-dark.css'
import Image from '@tiptap/extension-image'
import TextAlign from "@tiptap/extension-text-align";
import {Dropcursor, Placeholder} from "@tiptap/extensions";
import {Table, TableCell, TableHeader, TableRow} from "@tiptap/extension-table";
import {TaskItem, TaskList} from "@tiptap/extension-list";
import FileHandler from "@tiptap/extension-file-handler";
import Paragraph from '@tiptap/extension-paragraph'
import Heading from "@tiptap/extension-heading";

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

const CustomTableCell = TableCell.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            backgroundColor: {
                default: null,
                renderHTML: (attrs) =>
                    attrs.backgroundColor
                        ? {style: `background-color: ${attrs.backgroundColor}`}
                        : {},
                parseHTML: (el) => el.style.backgroundColor || null,
            },
        };
    },
});

export function useEditorInstance({initialContent, setContent, uploadFile}: {
    initialContent: string,
    setContent: (value: string) => void,
    uploadFile: (file: File) => Promise<string>
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
            Image.configure({
                inline: true,
                resize: {
                    enabled: true,
                    alwaysPreserveAspectRatio: true,
                }
            }),

            Table.configure({resizable: true}),
            TableHeader,
            CustomTableCell,
            TableRow,
            TextAlign.configure({
                types: ["heading", "paragraph"],
            }),
            Dropcursor,
            TaskItem.configure({nested: true}),
            TaskList,
            Placeholder.configure({
                placeholder: "내용을 입력하세요...",
            }),
            CustomCodeBlock.configure({
                lowlight,
            }),

            FileHandler.configure({
                allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
                onDrop: (currentEditor, files, pos) => {
                    files.forEach(file => {
                        const fileReader = new FileReader()
                        uploadFile(file).then(url => {
                            currentEditor.chain().focus().setImage({src: url}).run()
                        })
                    })
                },
                onPaste: (currentEditor, files, htmlContent) => {
                    files.forEach(file => {
                        if (htmlContent) return false

                        const fileReader = new FileReader()
                        uploadFile(file).then(url => {
                            currentEditor.chain().focus().setImage({src: url}).run()
                        })
                    })
                },
            }),
            Document,
            Text,
            Paragraph,
            Heading,

            Blockquote,
            BulletList,
            OrderedList,
            ListItem,
            HardBreak,
            History,
            HorizontalRule,
            Bold,
            Italic,
            Strike,
            Code,
            Gapcursor,
        ],
        content: initialContent,
        onUpdate: ({editor}) => {
            setContent(editor.getHTML())
        },
    });
}