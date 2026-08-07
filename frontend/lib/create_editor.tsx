import {NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor} from "@tiptap/react";

import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import {createLowlight} from "lowlight";
import Text from '@tiptap/extension-text'

import {InputRule} from '@tiptap/core'
import {Details, DetailsContent, DetailsSummary} from '@tiptap/extension-details'

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
import {useState} from "react";

// 버튼 컴포넌트
const CodeBlockComponent = ({node}) => {
    const [copied, setCopied] = useState(false)
    const language = node.attrs.language || 'text'

    const handleCopy = () => {
        const code = node.textContent
        navigator.clipboard.writeText(code).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1000)
        })
    }

    return (
        <NodeViewWrapper>
            <pre data-language={language}>
                <button className="copy-code-btn" onClick={handleCopy} contentEditable={false}>
                    {copied ? 'Copied!' : 'Copy'}
                </button>
                <NodeViewContent className={`language-${language}`}/>
            </pre>
        </NodeViewWrapper>
    )
}

export const CustomDetails = Details.extend({
    // open 어트리뷰트는 persist: true 일 때만 생기고 기본값이 false 라
    // 새로 만든 details 가 접힌 채로 시작한다. 펼친 상태로 시작하도록 기본값을 뒤집는다.
    // 저장은 getHTML() 로 하고 parseHTML 이 <details> 의 open 속성 유무를 읽으므로,
    // 이미 저장된 노트의 접힘/펼침 상태는 영향받지 않는다.
    addAttributes() {
        const parent = (this.parent?.() ?? {}) as Record<string, any>

        return {
            ...parent,
            open: {
                ...parent.open,
                default: true,
            },
        }
    },
    addInputRules() {
        return [
            new InputRule({
                // 줄 시작에서 ">>" + 공백
                find: /^\s*>>\s$/,
                handler: ({chain, range, state, can}) => {
                    if (!can().setDetails()) return null

                    const {doc, selection} = state
                    const {$from, $to} = selection

                    // summary 안에서 또 >> 를 치는 경우는 무시
                    if ($from.parent.type.name === 'detailsSummary') return null

                    const blockRange = $from.blockRange($to)
                    if (!blockRange) return null

                    // ">> " 뒤에 이미 적혀 있던 내용.
                    // 기본 setDetails() 는 이걸 전부 본문으로 넣고 summary 를 비워두는데,
                    // 제목으로 쓰려던 텍스트일 때가 많으므로 summary 로 올린다.
                    const inline = doc.slice(range.to, $from.end()).toJSON()?.content ?? []

                    // detailsSummary 는 content 가 text* 라 텍스트 노드만 담을 수 있다.
                    // 앞쪽 연속된 텍스트까지만 제목으로 올리고, hardBreak 등 그 뒤는 본문에 남긴다.
                    const breakAt = inline.findIndex((node: any) => node.type !== 'text')
                    const summaryContent = breakAt === -1 ? inline : inline.slice(0, breakAt)
                    let bodyContent = breakAt === -1 ? [] : inline.slice(breakAt)

                    // 제목과 본문을 가르던 줄바꿈은 본문 맨 앞에 빈 줄로 남지 않게 버린다
                    if (bodyContent[0]?.type === 'hardBreak') bodyContent = bodyContent.slice(1)

                    const summaryLength = summaryContent
                        .reduce((sum: number, node: any) => sum + (node.text?.length ?? 0), 0)

                    chain()
                        .insertContentAt(
                            {from: blockRange.start, to: blockRange.end},
                            {
                                type: this.name,
                                content: [
                                    {type: 'detailsSummary', content: summaryContent},
                                    {
                                        type: 'detailsContent',
                                        content: [{type: 'paragraph', content: bodyContent}],
                                    },
                                ],
                            },
                        )
                        // details(+1) > detailsSummary(+1) 안쪽이 제목 시작점
                        .setTextSelection(blockRange.start + 2 + summaryLength)
                        .run()
                },
            }),
        ]
    },
})

export const CustomCodeBlock = CodeBlockLowlight.extend({
    addKeyboardShortcuts() {
        return {
            Tab: ({editor}) => {
                if (editor.isActive('codeBlock')) {
                    editor.commands.insertContent('    ')
                    return true
                }
                return false
            },

            'Shift-Tab': ({editor}) => {
                if (editor.isActive('codeBlock')) {
                    const {state, dispatch} = editor.view
                    const {from} = state.selection

                    const text = state.doc.textBetween(from - 4, from)
                    if (text === '    ') {
                        dispatch(state.tr.delete(from - 4, from))
                    }

                    return true
                }
                return false
            },

            ArrowUp: ({editor}) => {
                const {selection} = editor.state
                const {$anchor, empty} = selection

                // 코드블록 안에 있고, 커서가 첫 줄일 때만 처리
                if (!empty || $anchor.parent.type.name !== this.name) {
                    return false
                }

                // 코드블록의 첫 줄인지 확인 (여러 줄일 수 있으므로 줄바꿈 이전인지 체크)
                const textBefore = $anchor.parent.textBetween(0, $anchor.parentOffset)
                if (textBefore.includes('\n')) {
                    return false // 코드블록 내부에서 위로 이동 가능하면 기본 동작 유지
                }

                const codeBlockPos = $anchor.before($anchor.depth)
                const $before = editor.state.doc.resolve(codeBlockPos)
                const nodeBefore = $before.nodeBefore

                // 문서 맨 앞이거나, 바로 앞이 코드블록인 경우 빈 문단 삽입
                if (codeBlockPos === 0 || (nodeBefore && nodeBefore.type.name === this.name)) {
                    return editor
                        .chain()
                        .insertContentAt(codeBlockPos, {type: 'paragraph'})
                        .focus(codeBlockPos)
                        .run()
                }

                return false
            },
        }
    },

    addNodeView() {
        return ReactNodeViewRenderer(CodeBlockComponent)
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
            CustomDetails.configure({
                persist: true,                      // 열림/닫힘 상태를 문서에 저장
                HTMLAttributes: {class: 'details'},
            }),
            DetailsSummary,
            DetailsContent,
        ],
        content: initialContent,
        onUpdate: ({editor}) => {
            setContent(editor.getHTML())
        },
    });
}