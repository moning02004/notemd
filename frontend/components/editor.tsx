"use client";

import React, {Dispatch, SetStateAction, useCallback, useEffect, useState} from "react";
import {FiArrowLeft, FiMenu} from "react-icons/fi";
import {useProgressRouter} from "@/hooks/useProgressRouter";

import {Editor, EditorContent} from "@tiptap/react";
import {EditorState, NodeSelection, TextSelection} from "@tiptap/pm/state";
import {EditorView} from "@tiptap/pm/view";
import {useEditorInstance} from "@/lib/create_editor";
import MenuBar from "@/components/editor_menubar";
import {Complete, LoadingSpinner, Warning} from "@/components/icons";
import {apiRequest} from "@/lib/api";
import {CreateNoteImageResponse} from "@/types/note";
import {API_HOST} from "@/constants/api";
import toast from "react-hot-toast";
import {BubbleMenu} from "@tiptap/react/menus";
import {useAuthStore} from "@/store/auth";
import EditorLinkModal from "@/components/editor_link_modal";
import {NotePickerModal} from "@/components/note/note_picker_modal";
import {NotePeekPanel} from "@/components/note/note_peek_panel";
import EditorLinkBubble from "@/components/editor_link_bubble";
import EditorImageBubble from "@/components/editor_image_bubble";
import EditorTableBubble from "@/components/editor_table_bubble";
import {CellSelection} from "@tiptap/pm/tables";
import {openLineAt, startsWithGap} from "@/lib/open_line";
import {Link as LinkIcon} from "lucide-react";
import {MdWorkspacesFilled} from "react-icons/md";

interface EditorProps {
    setOpenedSetting: Dispatch<SetStateAction<boolean>>;
    isReadonly: boolean;
    isOwner: boolean;
    title: string;
    content: string;
    setTitle: (value: string) => void;
    setContent: (value: string) => void;
    paramsNoteId: string;
    statusType: string;
    widthClass: string;
    /** 제목줄 바로 아래에 띄울 안내(휴지통에 있는 노트 등) */
    notice?: React.ReactNode;
}

export function MarkdownEditor({
                                   setOpenedSetting,
                                   paramsNoteId,
                                   title,
                                   content,
                                   isOwner,
                                   setTitle,
                                   setContent,
                                   isReadonly,
                                   statusType,
                                   widthClass,
                                   notice
                               }: EditorProps
) {
    const titleRef = React.useRef<HTMLInputElement>(null);
    const router = useProgressRouter();
    const status = (statusType == "loading") ? <LoadingSpinner/> :
        ((statusType == "complete") ? <Complete/> :
            ((statusType == "warning") ? <Warning/> :
                ""));
    const [tableMenuOpen, setTableMenuOpen] = useState(false)
    const [linkModalOpen, setLinkModalOpen] = useState(false)
    const [notePickerOpen, setNotePickerOpen] = useState(false)
    // 본문의 노트 링크를 누르면 옮겨 가지 않고 오른쪽 패널에 펼친다.
    const [peekNoteId, setPeekNoteId] = useState<string | null>(null)
    // 이 화면은 창이 아니라 아래 div 가 스크롤된다. 말풍선들은 기본으로 창의 스크롤만 지켜봐서,
    // 알려 주지 않으면 스크롤해도 제자리에 떠 있다가 글자나 이미지를 덮는다.
    // 말풍선(BubbleMenu)은 만들어진 직후의 옵션 변경을 한 번 건너뛰므로, 이 div 가 잡힌 뒤에 만든다.
    const [scroller, setScroller] = useState<HTMLDivElement | null>(null)
    const {token} = useAuthStore.getState();

    const editor = useEditorInstance({
        initialContent: content,
        setContent: setContent,
        onPickNote: () => setNotePickerOpen(true),
        onOpenNote: setPeekNoteId,
        uploadFile: async (file: File) => {
            const formData = new FormData();
            formData.append("file", file);
            try {
                const response = await apiRequest
                    .post<CreateNoteImageResponse>(`/notes/${paramsNoteId}/images`, {body: formData}, {isMime: true})
                    .catch((err) => {
                        throw err;
                    });
                return `${API_HOST}${response.url}`
            } catch {
                toast.error("이미지 업로드에 실패했습니다.")
                return ""
            }
        }
    })

    useEffect(() => {
        if (!editor) return
        if (editor.getHTML() === content) return

        editor.commands.setContent(content)
    }, [content, editor])

    useEffect(() => {
        editor?.setEditable(!isReadonly);
    }, [editor, isReadonly]);

    const closePeek = useCallback(() => setPeekNoteId(null), [])

    // 기본 조건(포커스가 있고 글자가 골라져 있을 때)에 더해, 이미지·노트 링크처럼 조각 하나가 통째로
    // 골라진 경우는 뺀다. 거기에는 굵게·기울임이 소용없고, 버블이 이미지나 옆에 펼친 패널을 가린다.
    // 표 칸을 여러 개 고른 경우도 뺀다. 그때는 표 말풍선(합치기·색칠)이 같은 자리에 뜬다.
    const shouldShowFormatBubble = useCallback(({editor, view, state, element}: {
        editor: Editor, view: EditorView, state: EditorState, element: HTMLElement
    }) => {
        const {selection} = state
        if (selection instanceof NodeSelection || selection instanceof CellSelection) return false

        const hasFocus = view.hasFocus() || element.contains(document.activeElement)
        const isEmptyTextBlock = !state.doc.textBetween(selection.from, selection.to).length
            && selection instanceof TextSelection
        return hasFocus && !selection.empty && !isEmptyTextBlock && editor.isEditable
    }, [])

    const titleKeyup = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key == "Enter") {
            // 본문이 표 등으로 시작하면 첫 칸으로 들어가는 대신 그 위에 쓸 줄을 연다.
            // 모바일에서는 표 위로 커서를 옮길 다른 방법이 마땅치 않다.
            if (startsWithGap(editor.view)) openLineAt(editor.view, 0)
            else editor.commands.focus("start")
        }
    }
    const goBack = () => {
        if (statusType == "loading") {
            alert("동기화가 완료되지 않았습니다. 잠시 후 다시 시도해주세요.")
            return
        }
        router.back()
    }

    if (!editor) return <div></div>;

    return (
        <div ref={setScroller}
             className={`h-screen flex flex-col bg-surface w-full overflow-y-auto
                        ${peekNoteId ? "md:pr-[var(--note-peek-width)]" : ""}`}>
            <div
                className="flex flex-row items-center bg-surface border-b border-border px-3 transition-colors duration-300">
                {
                    token &&
                    <div
                        className="my-auto p-1.5 rounded-lg cursor-pointer text-muted hover:bg-background hover:text-foreground transition-colors duration-200"
                        onClick={goBack}>
                        <FiArrowLeft size={24}/>
                    </div>
                }
                <input type="text"
                       ref={titleRef}
                       onKeyUp={titleKeyup}
                       value={title || ''}
                       readOnly={isReadonly}
                       onChange={(e) => setTitle(e.currentTarget.value)}
                       className={`title-editor w-[100%] outline-none text-foreground ${isReadonly ? "cursor-text" : "cursor-text"}`}
                       placeholder="제목"
                />

                {
                    isOwner ?
                        <div
                            className="my-auto p-3 rounded-lg cursor-pointer text-muted hover:bg-background hover:text-foreground transition-colors duration-200"
                            onClick={() => setOpenedSetting(true)}>
                            <FiMenu size={24}/>
                        </div> : !isReadonly ? <div className="text-sm"><MdWorkspacesFilled/></div> : <div></div>
                }
            </div>

            {notice}

            {
                !isReadonly &&
                <div className="pr-3 bg-editor sticky top-0 z-10 flex shadow-sm">
                    {/* min-w-0: 툴바가 제 폭보다 좁아져야 모바일에서 옆으로 밀 수 있다 */}
                    <div className="flex-1 min-w-0">
                        <MenuBar editor={editor} noteId={paramsNoteId}
                                 tableMenuOpen={tableMenuOpen}
                                 setTableMenuOpen={setTableMenuOpen}
                                 openLinkModal={() => setLinkModalOpen(true)}
                                 openNotePicker={() => setNotePickerOpen(true)}/>
                    </div>
                    <div className="shrink-0 my-auto text-right">{status}</div>
                </div>
            }
            {
                /* 버블 메뉴의 z-index 가 모달보다 높아서, 링크 모달이 떠 있는 동안에는 감춘다 */
                !isReadonly && !linkModalOpen && scroller &&
                <BubbleMenu editor={editor} options={{placement: "top", offset: 8, scrollTarget: scroller}}
                            shouldShow={shouldShowFormatBubble}
                            style={{
                    zIndex: 9999,
                }}>
                    <div className="flex items-center gap-1 bg-foreground rounded-lg px-1.5 py-1 shadow-lg z-20">
                        <button
                            onClick={() => editor.chain().focus().toggleBold().run()}
                            className={`px-2 py-1 rounded text-xs font-medium cursor-pointer transition-colors duration-150
                                ${editor.isActive("bold") ? "bg-surface text-foreground" : "text-white hover:bg-surface/10"}`}>
                            B
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            className={`px-2 py-1 rounded text-xs italic cursor-pointer transition-colors duration-150
                                ${editor.isActive("italic") ? "bg-surface text-foreground" : "text-white hover:bg-surface/10"}`}>
                            I
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleStrike().run()}
                            className={`px-2 py-1 rounded text-xs line-through cursor-pointer transition-colors duration-150
                                ${editor.isActive("strike") ? "bg-surface text-foreground" : "text-white hover:bg-surface/10"}`}>
                            S
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleCode().run()}
                            className={`px-2 py-1 rounded text-xs font-mono cursor-pointer transition-colors duration-150
                                ${editor.isActive("code") ? "bg-surface text-foreground" : "text-white hover:bg-surface/10"}`}>
                            {"</>"}
                        </button>
                        <button
                            onClick={() => setLinkModalOpen(true)}
                            title="링크"
                            className={`px-2 py-1 rounded cursor-pointer transition-colors duration-150
                                ${editor.isActive("link") ? "bg-surface text-foreground" : "text-white hover:bg-surface/10"}`}>
                            <LinkIcon size={14}/>
                        </button>
                    </div>
                </BubbleMenu>
            }

            {!isReadonly && scroller && <EditorImageBubble editor={editor} scrollTarget={scroller}/>}

            {!isReadonly && !linkModalOpen && scroller && <EditorTableBubble editor={editor} scrollTarget={scroller}/>}

            {
                !isReadonly && !linkModalOpen && scroller &&
                <EditorLinkBubble
                    editor={editor}
                    scrollTarget={scroller}
                    onEdit={() => setLinkModalOpen(true)}/>
            }

            {
                !isReadonly &&
                <EditorLinkModal
                    editor={editor}
                    open={linkModalOpen}
                    onClose={() => setLinkModalOpen(false)}/>
            }

            <NotePeekPanel
                noteId={peekNoteId}
                onClose={closePeek}
                onNavigate={setPeekNoteId}
                onOpenFull={noteId => router.push(`/s/${noteId}`)}/>

            {
                !isReadonly &&
                <NotePickerModal
                    open={notePickerOpen}
                    excludeId={paramsNoteId}
                    onClose={() => {
                        setNotePickerOpen(false)
                        editor.commands.focus()
                    }}
                    onPick={note => {
                        setNotePickerOpen(false)
                        editor.chain().focus()
                            .insertContent([
                                {type: "noteLink", attrs: {noteId: note.hashId, title: note.title}},
                                // 링크 바로 뒤에서 계속 쓸 수 있도록 공백 한 칸을 둔다.
                                {type: "text", text: " "},
                            ])
                            .run()
                    }}/>
            }

            <div className={`flex-20 bg-surface ${widthClass} mx-auto`}>
                <EditorContent editor={editor}
                               className="h-[100%]"
                               onClick={() => {
                                   setTableMenuOpen(false)
                                   setOpenedSetting(false)
                               }}/>
            </div>
        </div>
    );
}