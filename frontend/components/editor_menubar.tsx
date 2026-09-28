"use client";

import React, {Dispatch, SetStateAction, useRef, useState} from "react";
import {Editor} from "@tiptap/react";
import {
    AlignCenter,
    AlignLeft,
    AlignRight,
    Bold,
    ChevronDown,
    Code2,
    FileSymlink,
    Heading1,
    Heading2,
    Heading3,
    Italic,
    Link as LinkIcon,
    Quote,
    Strikethrough,
    Table as TableIcon,
} from "lucide-react";
import {FiImage} from "react-icons/fi";
import {apiRequest} from "@/lib/api";
import {CreateNoteImageResponse} from "@/types/note";
import {API_HOST} from "@/constants/api";
import {GoListOrdered, GoListUnordered, GoTasklist} from "react-icons/go";
import {useClickOutside} from "@/hooks/useClickOutside";
import {FaAnglesRight} from "react-icons/fa6";

interface Props {
    editor: Editor;
    noteId: string;
    tableMenuOpen: boolean;
    setTableMenuOpen: Dispatch<SetStateAction<boolean>>;
    openLinkModal: () => void;
    /** 다른 노트를 골라 본문에 넣는 창. 모바일 키보드에서는 "/노트" 보다 버튼이 가깝다. */
    openNotePicker: () => void;
}

export default function MenuBar({editor, noteId, tableMenuOpen, setTableMenuOpen, openLinkModal, openNotePicker}: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [tableRows, setTableRows] = useState(3);
    const [tableCols, setTableCols] = useState(3);
    const [tableMenuAt, setTableMenuAt] = useState({top: 0, left: 0});

    const tableMenuRef = useClickOutside<HTMLDivElement>(() => setTableMenuOpen(false), tableMenuOpen);

    if (!editor) return null;

    // shrink-0: 모바일에서는 한 줄로 늘어서 옆으로 밀어 보므로 단추가 눌려 찌그러지면 안 된다.
    const base =
        "shrink-0 p-2 rounded hover:bg-border transition flex items-center justify-center";
    const active = "bg-border-strong";

    const button = (
        onClick: () => void,
        isActive: boolean,
        icon: React.ReactNode,
        title?: string
    ) => (
        <button
            onClick={onClick}
            className={`${base} ${isActive ? active : ""}`}
            title={title}
        >
            {icon}
        </button>
    );

    // ── 이미지 업로드 ──────────────────────────────────────────────
    const handleImageClick = () => fileInputRef.current?.click();

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append("file", file);
        try {
            const response = await apiRequest
                .post<CreateNoteImageResponse>(`/notes/${noteId}/images`, {body: formData}, {isMime: true})
                .catch((err) => {
                    throw err;
                });
            editor.chain().focus().setImage({src: `${API_HOST}${response.url}`}).run();
        } catch (err) {
            console.error(err);
        }
    };

    // ── 테이블 삽입 ────────────────────────────────────────────────
    const insertTable = () => {
        editor
            .chain()
            .focus()
            .insertTable({rows: tableRows, cols: tableCols, withHeaderRow: true})
            .run();
        setTableMenuOpen(false);
    };

    return (
        /*
         * 모바일은 단추를 한 줄로 두고 옆으로 밀어 본다. 줄바꿈하면 세 줄까지 쌓여, 키보드가 올라온 좁은 화면에서
         * 본문 자리를 크게 먹는다. 오른쪽 끝에 옅은 막을 얹어 더 있다는 걸 알리고, 끝까지 밀면 마지막 단추가
         * 막을 벗어나도록 오른쪽 안쪽 여백을 둔다. 데스크톱은 전처럼 줄바꿈한다.
         * (mask-image 로 흐리면 아래로 펼친 표 메뉴까지 가려져 막을 따로 둔다.)
         */
        <div className="relative md:w-[90%]">
            <div onScroll={() => setTableMenuOpen(false)}
                 className="flex gap-1 p-2 pr-8 overflow-x-auto scrollbar-none
                            md:flex-wrap md:pr-2 md:overflow-visible">
                {/* ── 텍스트 서식 ── */}
                {button(
                    () => editor.chain().focus().toggleBold().run(),
                    editor.isActive("bold"),
                    <Bold size={18}/>,
                    "굵게"
                )}
                {button(
                    () => editor.chain().focus().toggleItalic().run(),
                    editor.isActive("italic"),
                    <Italic size={18}/>,
                    "기울임"
                )}
                {button(
                    () => editor.chain().focus().toggleStrike().run(),
                    editor.isActive("strike"),
                    <Strikethrough size={18}/>,
                    "취소선"
                )}
                {button(
                    openLinkModal,
                    editor.isActive("link"),
                    <LinkIcon size={18}/>,
                    "링크"
                )}
                {button(
                    // 에디터에 포커스를 주지 않는다. 창의 검색칸이 포커스를 받아야 하고,
                    // 넣을 자리는 에디터가 들고 있는 선택 영역 그대로 남는다.
                    openNotePicker,
                    false,
                    <FileSymlink size={18}/>,
                    "노트 가져오기"
                )}

                <div className="shrink-0 w-px h-6 bg-border-strong mx-1 my-auto"/>

                {/* ── 정렬 ── */}
                {button(
                    () => editor.chain().focus().setTextAlign("left").run(),
                    editor.isActive({textAlign: "left"}),
                    <AlignLeft size={18}/>,
                    "왼쪽 정렬"
                )}
                {button(
                    () => editor.chain().focus().setTextAlign("center").run(),
                    editor.isActive({textAlign: "center"}),
                    <AlignCenter size={18}/>,
                    "가운데 정렬"
                )}
                {button(
                    () => editor.chain().focus().setTextAlign("right").run(),
                    editor.isActive({textAlign: "right"}),
                    <AlignRight size={18}/>,
                    "오른쪽 정렬"
                )}

                <div className="shrink-0 w-px h-6 bg-border-strong mx-1 my-auto"/>

                {/* ── 블록 요소 ── */}
                {button(
                    () => editor.chain().focus().toggleHeading({level: 1}).run(),
                    editor.isActive("heading", {level: 1}),
                    <Heading1 size={18}/>,
                    "제목 1"
                )}
                {button(
                    () => editor.chain().focus().toggleHeading({level: 2}).run(),
                    editor.isActive("heading", {level: 2}),
                    <Heading2 size={18}/>,
                    "제목 2"
                )}
                {button(
                    () => editor.chain().focus().toggleHeading({level: 3}).run(),
                    editor.isActive("heading", {level: 3}),
                    <Heading3 size={18}/>,
                    "제목 3"
                )}
                {button(
                    () => editor.isActive("details")
                        ? editor.chain().focus().unsetDetails().run()
                        : editor.chain().focus().setDetails().run(),
                    editor.isActive("details"),
                    <FaAnglesRight size={15}/>,
                    "세부정보 블록"
                )}
                {button(
                    () => editor.chain().focus().toggleOrderedList().run(),
                    editor.isActive("orderedList"),
                    <GoListOrdered size={18}/>,
                    "순서 있는 목록"
                )}
                {button(
                    () => editor.chain().focus().toggleBulletList().run(),
                    editor.isActive("bulletList"),
                    <GoListUnordered size={18}/>,
                    "순서 없는 목록"
                )}
                {button(
                    () => editor.chain().focus().toggleTaskList().run(),
                    editor.isActive("taskList"),
                    <GoTasklist size={18}/>,
                    "체크리스트"
                )}
                {button(
                    () => editor.chain().focus().toggleCodeBlock().run(),
                    editor.isActive("codeBlock"),
                    <Code2 size={18}/>,
                    "코드 블록"
                )}
                {button(
                    () => editor.chain().focus().toggleBlockquote().run(),
                    editor.isActive("blockquote"),
                    <Quote size={18}/>,
                    "인용구"
                )}

                {/* ── 이미지 ── */}
                {button(handleImageClick, false, <FiImage size={18}/>, "이미지 삽입")}
                <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleImageUpload}
                />

                <div className="shrink-0 w-px h-6 bg-border-strong mx-1 my-auto"/>

                {/* ══ 테이블 드롭다운 ══════════════════════════════════════ */}
                <div className="relative" ref={tableMenuRef}>
                    <button
                        onClick={(event) => {
                            // 가로로 밀리는 툴바 안에서는 아래로 펼친 메뉴가 잘린다. 화면 기준(fixed)으로 띄운다.
                            const rect = event.currentTarget.getBoundingClientRect();
                            const width = 208; // w-52
                            setTableMenuAt({
                                top: rect.bottom + 4,
                                left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
                            });
                            setTableMenuOpen((v) => !v);
                        }}
                        className={`${base} gap-0.5 ${tableMenuOpen ? active : ""}`}
                        title="테이블"
                    >
                        <TableIcon size={18}/>
                        <ChevronDown size={12}/>
                    </button>

                    {tableMenuOpen && (
                        <div style={tableMenuAt}
                            className="fixed w-52 bg-surface border border-border rounded-lg shadow-xl z-50 overflow-hidden">

                            {/* 삽입 */}
                            <div className="p-3 border-b border-border">
                                <p className="text-[11px] font-semibold text-subtle uppercase tracking-wide mb-2">
                                    테이블 삽입
                                </p>
                                <div className="flex flex-col gap-2 mb-3">
                                    <label className="flex items-center justify-between text-xs text-muted">
                                        행
                                        <input
                                            type="number"
                                            min={1} max={20}
                                            value={tableRows}
                                            onChange={(e) => setTableRows(Math.min(20, Math.max(1, Number(e.target.value))))}
                                            className="w-16 border border-border-strong rounded px-2 py-0.5 text-xs text-right"
                                        />
                                    </label>
                                    <label className="flex items-center justify-between text-xs text-muted">
                                        열
                                        <input
                                            type="number"
                                            min={1} max={20}
                                            value={tableCols}
                                            onChange={(e) => setTableCols(Math.min(20, Math.max(1, Number(e.target.value))))}
                                            className="w-16 border border-border-strong rounded px-2 py-0.5 text-xs text-right"
                                        />
                                    </label>
                                </div>
                                <button
                                    onClick={insertTable}
                                    className="w-full bg-foreground text-white text-xs py-1.5 rounded hover:bg-muted transition font-medium"
                                >
                                    삽입
                                </button>
                            </div>

                            {/* 넣은 뒤의 편집(행·열·정렬·색)은 표 안을 누르면 뜨는 말풍선에서 한다. */}
                            <p className="px-3 py-2 text-[11px] text-subtle leading-relaxed">
                                표 안을 누르면 행·열, 정렬, 배경색을 고칠 수 있어요.
                            </p>
                        </div>
                    )}
                </div>
            </div>
            <div aria-hidden
                 className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-editor to-transparent md:hidden"/>
        </div>
    );
}
