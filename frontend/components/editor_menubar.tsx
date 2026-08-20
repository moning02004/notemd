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
    Heading1,
    Heading2,
    Heading3,
    Italic,
    Link as LinkIcon,
    Quote,
    Strikethrough,
    Table as TableIcon,
    Trash2,
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
}

export default function MenuBar({editor, noteId, tableMenuOpen, setTableMenuOpen, openLinkModal}: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [tableRows, setTableRows] = useState(3);
    const [tableCols, setTableCols] = useState(3);

    const tableMenuRef = useClickOutside<HTMLDivElement>(() => setTableMenuOpen(false), tableMenuOpen);

    if (!editor) return null;

    const base =
        "p-2 rounded hover:bg-border transition flex items-center justify-center";
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

    const isSelectTable = editor.isActive("table");

    return (
        <div className="flex flex-wrap gap-1 p-2 w-[90%] relative">
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

            <div className="w-px h-6 bg-border-strong mx-1 my-auto"/>

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

            <div className="w-px h-6 bg-border-strong mx-1 my-auto"/>

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

            <div className="w-px h-6 bg-border-strong mx-1 my-auto"/>

            {/* ══ 테이블 드롭다운 ══════════════════════════════════════ */}
            <div className="relative" ref={tableMenuRef}>
                <button
                    onClick={() => {
                        setTableMenuOpen((v) => !v);
                    }}
                    className={`${base} gap-0.5 ${tableMenuOpen ? active : ""}`}
                    title="테이블"
                >
                    <TableIcon size={18}/>
                    <ChevronDown size={12}/>
                </button>

                {tableMenuOpen && (
                    <div
                        className="absolute top-full left-0 mt-1 w-52 bg-surface border border-border rounded-lg shadow-xl z-50 overflow-hidden">

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
                                        onChange={(e) => setTableRows(Math.max(1, Number(e.target.value)))}
                                        className="w-16 border border-border-strong rounded px-2 py-0.5 text-xs text-right"
                                    />
                                </label>
                                <label className="flex items-center justify-between text-xs text-muted">
                                    열
                                    <input
                                        type="number"
                                        min={1} max={20}
                                        value={tableCols}
                                        onChange={(e) => setTableCols(Math.max(1, Number(e.target.value)))}
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

                        {/* 편집 — 테이블 안에 커서가 없으면 흐리게 */}
                        <div
                            className={`p-3 transition-opacity ${isSelectTable ? "opacity-100" : "opacity-40 pointer-events-none select-none"}`}>
                            <p className="text-[11px] font-semibold text-subtle uppercase tracking-wide mb-1.5">
                                열 편집
                            </p>
                            <div className="flex gap-1 mb-1">
                                <button
                                    onClick={() => {
                                        editor.chain().focus().addColumnBefore().run();
                                        setTableMenuOpen(false);
                                    }}
                                    className="flex-1 text-xs py-1.5 rounded hover:bg-background border border-border transition"
                                >
                                    ← 왼쪽 추가
                                </button>
                                <button
                                    onClick={() => {
                                        editor.chain().focus().addColumnAfter().run();
                                        setTableMenuOpen(false);
                                    }}
                                    className="flex-1 text-xs py-1.5 rounded hover:bg-background border border-border transition"
                                >
                                    오른쪽 추가 →
                                </button>
                            </div>
                            <button
                                onClick={() => {
                                    editor.chain().focus().deleteColumn().run();
                                    setTableMenuOpen(false);
                                }}
                                className="w-full text-xs py-1.5 rounded hover:bg-danger-soft border border-border text-danger transition mb-3"
                            >
                                현재 열 삭제
                            </button>

                            <p className="text-[11px] font-semibold text-subtle uppercase tracking-wide mb-1.5">
                                행 편집
                            </p>
                            <div className="flex gap-1 mb-1">
                                <button
                                    onClick={() => {
                                        editor.chain().focus().addRowBefore().run();
                                        setTableMenuOpen(false);
                                    }}
                                    className="flex-1 text-xs py-1.5 rounded hover:bg-background border border-border transition"
                                >
                                    ↑ 위 추가
                                </button>
                                <button
                                    onClick={() => {
                                        editor.chain().focus().addRowAfter().run();
                                        setTableMenuOpen(false);
                                    }}
                                    className="flex-1 text-xs py-1.5 rounded hover:bg-background border border-border transition"
                                >
                                    아래 추가 ↓
                                </button>
                            </div>
                            <button
                                onClick={() => {
                                    editor.chain().focus().deleteRow().run();
                                    setTableMenuOpen(false);
                                }}
                                className="w-full text-xs py-1.5 rounded hover:bg-danger-soft border border-border text-danger transition mb-3"
                            >
                                현재 행 삭제
                            </button>

                            <div className="border-t border-border pt-2">
                                <button
                                    onClick={() => {
                                        editor.chain().focus().deleteTable().run();
                                        setTableMenuOpen(false);
                                    }}
                                    className="w-full flex items-center justify-center gap-1.5 text-xs py-1.5 rounded hover:bg-danger-soft text-danger transition"
                                >
                                    <Trash2 size={12}/> 테이블 삭제
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
