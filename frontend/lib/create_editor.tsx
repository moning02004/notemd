import {NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor} from "@tiptap/react";

import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import {createLowlight} from "lowlight";
import Text from '@tiptap/extension-text'

import {Editor, InputRule, JSONContent} from '@tiptap/core'
import {EditorView, NodeView} from '@tiptap/pm/view'
import {Plugin, PluginKey} from '@tiptap/pm/state'
import {useImageViewerStore} from "@/store/imageViewer";
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
import Link from '@tiptap/extension-link'

// 기능
import Gapcursor from '@tiptap/extension-gapcursor'

import 'highlight.js/styles/atom-one-dark.css'
import Image from '@tiptap/extension-image'
import TextAlign from "@tiptap/extension-text-align";
import {Dropcursor, Placeholder} from "@tiptap/extensions";
import {Table, TableRow} from "@tiptap/extension-table";
import {CustomTableCell, CustomTableHeader, TABLE_CELL_MIN_WIDTH} from "@/lib/table";
import {TaskItem, TaskList} from "@tiptap/extension-list";
import FileHandler from "@tiptap/extension-file-handler";
import Paragraph from '@tiptap/extension-paragraph'
import Heading from "@tiptap/extension-heading";
import {SlashCommand} from "@/lib/slash_command";
import {NoteLink} from "@/lib/note_link";
import {OpenLineOnGapTap} from "@/lib/open_line";
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

/** 커서가 이미 접기 안(요약이든 본문이든)에 있는지. */
function insideDetails($from: { depth: number, node: (depth: number) => { type: { name: string } } }): boolean {
    for (let depth = $from.depth; depth > 0; depth--) {
        if ($from.node(depth).type.name === 'details') return true
    }
    return false
}

export const CustomDetails = Details.extend({
    /*
     * 접기 안에서는 접기를 새로 만들지 않는다.
     *
     * 계단처럼 겹쳐 들어가면 어느 것을 접었는지 금세 헷갈리고, 접힌 안쪽은 찾을 길이
     * 없어진다. 막는 자리를 setDetails 한 곳으로 모아 둔다 — ">>" 입력 규칙, 툴바 버튼,
     * "/" 메뉴가 모두 이 명령을 거치므로 길마다 따로 검사할 필요가 없다.
     */
    addCommands() {
        const parent = this.parent?.()

        return {
            ...parent,
            setDetails: () => props => {
                if (insideDetails(props.state.selection.$from)) return false
                return parent?.setDetails?.()(props) ?? false
            },
        }
    },

    // open 어트리뷰트는 persist: true 일 때만 생기고 기본값이 false 라
    // 새로 만든 details 가 접힌 채로 시작한다. 펼친 상태로 시작하도록 기본값을 뒤집는다.
    // 저장은 getHTML() 로 하고 parseHTML 이 <details> 의 open 속성 유무를 읽으므로,
    // 이미 저장된 노트의 접힘/펼침 상태는 영향받지 않는다.
    addAttributes() {
        const parent = (this.parent?.() ?? {}) as Record<string, Record<string, unknown>>

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

                    // 접기 안에서는 위 setDetails 가 false 를 돌려주므로 can() 에서 이미 걸린다.

                    const blockRange = $from.blockRange($to)
                    if (!blockRange) return null

                    // ">> " 뒤에 이미 적혀 있던 내용.
                    // 기본 setDetails() 는 이걸 전부 본문으로 넣고 summary 를 비워두는데,
                    // 제목으로 쓰려던 텍스트일 때가 많으므로 summary 로 올린다.
                    const inline = doc.slice(range.to, $from.end()).toJSON()?.content ?? []

                    // detailsSummary 는 content 가 text* 라 텍스트 노드만 담을 수 있다.
                    // 앞쪽 연속된 텍스트까지만 제목으로 올리고, hardBreak 등 그 뒤는 본문에 남긴다.
                    const breakAt = inline.findIndex((node: JSONContent) => node.type !== 'text')
                    const summaryContent = breakAt === -1 ? inline : inline.slice(0, breakAt)
                    let bodyContent = breakAt === -1 ? [] : inline.slice(breakAt)

                    // 제목과 본문을 가르던 줄바꿈은 본문 맨 앞에 빈 줄로 남지 않게 버린다
                    if (bodyContent[0]?.type === 'hardBreak') bodyContent = bodyContent.slice(1)

                    const summaryLength = summaryContent
                        .reduce((sum: number, node: JSONContent) => sum + (node.text?.length ?? 0), 0)

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

/*
 * 리사이즈를 켠 이미지 확장의 노드뷰를 감싸 빈 곳을 메운다(표시 방식, 최대 폭도 여기서 다룬다).
 *
 * - 노드뷰는 이미지가 로드될 때까지 통째로 숨겨 두고(visibility: hidden) load 때만 드러낸다.
 *   주소가 깨지면 영영 숨은 채라 보이지도 않고 골라서 지울 수도 없다. error 때도 드러내고 표시를 붙인다.
 * - 속성이 바뀌어도(되돌리기 등) <img> 의 크기·주소를 다시 적용하지 않아, 리사이즈를 되돌려도
 *   화면은 그대로다. 바뀐 속성을 그때그때 옮겨 적는다.
 */
export type ImageDisplay = "block" | "inline"

/** 표시 방식을 정하지 않은 이미지(예전 노트 포함)는 한 줄을 혼자 쓰는 블록으로 본다. */
export const imageDisplayOf = (attrs: Record<string, unknown>): ImageDisplay =>
    attrs.display === "inline" ? "inline" : "block"

/** 리사이즈를 시작할 때 이미지가 놓인 줄의 안쪽 폭. 이보다 크게 키우면 보이는 크기와 저장되는 크기가 어긋난다. */
function lineWidthOf(container: HTMLElement): number | undefined {
    const line = container.parentElement?.closest("p, li, td, th, blockquote, .ProseMirror") as HTMLElement | null
    if (!line) return undefined
    const style = getComputedStyle(line)
    return line.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
}

/** 이 에디터 본문의 이미지들을 순서대로 뷰어에 넘기고, target 부터 보여준다. */
export function openImageViewer(root: HTMLElement, target: HTMLImageElement | null) {
    const images = [...root.querySelectorAll<HTMLImageElement>("[data-resize-container] img")]
    const sources = images.map(img => img.currentSrc || img.src).filter(Boolean)
    if (sources.length === 0) return
    const index = target ? Math.max(0, images.indexOf(target)) : 0
    useImageViewerStore.getState().open(sources, index)
}

const CustomImage = Image.extend({
    /*
     * 크게 보기. 편집 중에는 한 번 누르면 이미지가 골라지고(크기 조절·말풍선) 두 번 누르면 연다.
     * 읽기 전용(참조 패널·공개 보기)에서는 고를 일이 없으니 한 번 눌러 연다.
     * 모바일은 두 번 누르기가 화면 확대와 겹쳐, 말풍선의 '크게 보기' 버튼으로도 열 수 있다.
     */
    addProseMirrorPlugins() {
        const open = (view: EditorView, event: Event) => {
            const target = event.target as HTMLElement | null
            if (!target || target.closest("[data-resize-handle]")) return false
            const img = target.closest("[data-resize-container]")?.querySelector("img")
            if (!img || "imageBroken" in (img.closest("[data-resize-container]") as HTMLElement).dataset) return false
            event.preventDefault()
            openImageViewer(view.dom, img)
            return true
        }

        return [
            new Plugin({
                key: new PluginKey("imageViewerOpen"),
                props: {
                    handleDOMEvents: {
                        dblclick: (view, event) => open(view, event),
                        click: (view, event) => (view.editable ? false : open(view, event)),
                    },
                },
            }),
        ]
    },

    addAttributes() {
        return {
            ...this.parent?.(),
            // block: 한 줄을 혼자 쓴다(문단 정렬을 따른다) · inline: 글자 사이에 흐른다
            display: {
                default: null,
                parseHTML: element => element.getAttribute("data-display"),
                renderHTML: attributes => (attributes.display ? {"data-display": attributes.display} : {}),
            },
        }
    },

    addNodeView() {
        const renderer = this.parent?.()
        if (!renderer) return null

        return props => {
            const view = renderer(props) as NodeView & { dom: HTMLElement }
            const img = view.dom.querySelector("img")
            if (!img) return view

            view.dom.dataset.display = imageDisplayOf(props.node.attrs)

            // 손잡이를 잡는 순간(리사이즈가 시작되기 전) 최대 폭을 지금 줄 폭으로 맞춘다.
            // maxSize 는 ResizableNodeView 가 applyConstraints 에서 읽는 값이다.
            const capToLine = (event: Event) => {
                if (!(event.target as HTMLElement | null)?.closest("[data-resize-handle]")) return
                const width = lineWidthOf(view.dom)
                if (width) (view as unknown as { maxSize?: { width?: number } }).maxSize = {width}
            }
            view.dom.addEventListener("mousedown", capToLine, true)
            view.dom.addEventListener("touchstart", capToLine, true)

            img.addEventListener("error", () => {
                view.dom.style.visibility = ""
                view.dom.style.pointerEvents = ""
                view.dom.dataset.imageBroken = ""
            })
            img.addEventListener("load", () => {
                delete view.dom.dataset.imageBroken
            })

            const update = view.update?.bind(view)
            if (update) {
                view.update = (node, decorations, innerDecorations) => {
                    if (!update(node, decorations, innerDecorations)) return false
                    const {src, width, height} = node.attrs
                    img.style.width = width ? `${width}px` : ""
                    img.style.height = height ? `${height}px` : ""
                    if (src && img.getAttribute("src") !== src) img.src = src
                    view.dom.dataset.display = imageDisplayOf(node.attrs)
                    return true
                }
            }
            return view
        }
    },
})

/**
 * 파일들을 올린 뒤 고른 순서대로 한 번에 넣는다.
 *
 * 하나씩 올라오는 대로 넣으면 먼저 끝난 것부터 들어가 순서가 뒤섞인다.
 * 올리지 못한 파일은 빈 이미지로 넣지 않고 건너뛴다(실패 안내는 uploadFile 이 한다).
 */
async function insertUploadedImages(editor: Editor, files: File[], uploadFile: (file: File) => Promise<string>,
                                    pos?: number) {
    const urls = (await Promise.all(files.map(file => uploadFile(file).catch(() => "")))).filter(Boolean)
    if (urls.length === 0 || editor.isDestroyed) return

    const images = urls.map(src => ({type: "image", attrs: {src}}))
    if (pos === undefined) {
        editor.chain().focus().insertContent(images).run()
    } else {
        // 올리는 동안 문서가 줄었을 수 있다.
        editor.chain().focus().insertContentAt(Math.min(pos, editor.state.doc.content.size), images).run()
    }
}

// 링크 마크의 inclusive 기본값은 autolink 옵션을 그대로 따라간다(= autolink 켜면 true).
// 그러면 링크 끝에 커서를 두고 이어서 타이핑할 때 링크가 계속 늘어나므로 꺼둔다.
// 자동 링크는 "변경 범위가 공백으로 끝날 때" 단어 전체에 마크를 붙이는 방식이라
// inclusive 와 무관하게 그대로 동작한다.
export const CustomLink = Link.extend({
    inclusive: false,
})

export function useEditorInstance({initialContent, setContent, uploadFile, onPickNote, onOpenNote, editable = true}: {
    initialContent: string,
    setContent: (value: string) => void,
    uploadFile: (file: File) => Promise<string>,
    /** "/노트" 를 골랐을 때 노트 고르는 창을 여는 통로 */
    onPickNote?: () => void,
    /** 본문의 노트 링크를 눌렀을 때 부르는 통로(참조 패널 열기 등) */
    onOpenNote?: (noteId: string) => void,
    /** 처음부터 읽기 전용으로 만든다(참조 패널 등). 편집 화면은 setEditable 로 바꾼다. */
    editable?: boolean
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
        editable,
        immediatelyRender: false,
        shouldRerenderOnTransaction: false,
        extensions: [
            CustomImage.configure({
                inline: true,
                resize: {
                    enabled: true,
                    alwaysPreserveAspectRatio: true,
                }
            }),

            // 경계에서 이만큼 안쪽까지 잡힌다. 기본값(5px)은 너무 가늘어 잘 놓친다.
            Table.configure({resizable: true, handleWidth: 8, cellMinWidth: TABLE_CELL_MIN_WIDTH}),
            CustomTableHeader,
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
                // 놓은 자리에 넣는다. 커서가 다른 곳에 있어도 끌어다 놓은 곳이 기준이다.
                onDrop: (currentEditor, files, pos) => {
                    void insertUploadedImages(currentEditor, files, uploadFile, pos)
                },
                // 웹 페이지에서 복사한 이미지는 HTML 도 함께 온다. 그때는 HTML 붙여넣기에 맡긴다.
                // 파일까지 올리면 같은 이미지가 두 장 들어간다.
                onPaste: (currentEditor, files, htmlContent) => {
                    if (htmlContent) return
                    void insertUploadedImages(currentEditor, files, uploadFile)
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
            // openOnClick: false 여도 읽기 전용일 때는 클릭 핸들러가 빠지므로
            // 공유 화면에서는 링크가 그대로 열린다. 편집 중에는 열리지 않는다.
            CustomLink.configure({
                openOnClick: false,
                autolink: true,
                linkOnPaste: true,
                defaultProtocol: "https",
                protocols: ["http", "https", "mailto"],
                HTMLAttributes: {
                    target: "_blank",
                    rel: "noopener noreferrer nofollow",
                },
            }),
            Gapcursor,
            OpenLineOnGapTap,
            NoteLink.configure({onOpen: onOpenNote}),
            SlashCommand.configure({onPickNote}),
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