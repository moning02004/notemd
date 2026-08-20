"use client";

import React, {useEffect, useRef, useState} from "react";
import {Editor} from "@tiptap/react";
import {Modal} from "@/components/ui/modal";
import {Link as LinkIcon} from "lucide-react";

/**
 * 입력값을 href 로 다듬는다.
 *   - 프로토콜이 있으면 그대로
 *   - 메일 주소 모양이면 mailto:
 *   - 그 외에는 https:// 를 붙인다
 */
export function normalizeHref(raw: string) {
    const value = raw.trim();
    if (!value) return "";
    if (/^(https?:\/\/|mailto:)/i.test(value)) return value;
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `mailto:${value}`;
    return `https://${value}`;
}

interface Props {
    editor: Editor;
    open: boolean;
    onClose: () => void;
}

export default function EditorLinkModal({editor, open, onClose}: Props) {
    const [url, setUrl] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    // 모달이 열린 순간의 에디터 상태를 읽는다.
    // 버튼을 눌러 에디터가 blur 돼도 ProseMirror 는 선택 영역을 그대로 들고 있다.
    const isLinkActive = open && editor.isActive("link");
    const selectedText = open
        ? editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, " ")
        : "";

    useEffect(() => {
        if (!open) return;

        setUrl(editor.getAttributes("link").href ?? "");
        // 모달이 그려진 뒤에 포커스를 줘야 한다
        const raf = requestAnimationFrame(() => {
            inputRef.current?.focus();
            inputRef.current?.select();
        });

        const handleEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", handleEsc);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("keydown", handleEsc);
        };
    }, [open, editor, onClose]);

    if (!open) return null;

    const applyLink = () => {
        const href = normalizeHref(url);
        if (!href) return;

        // extendMarkRange 로 커서만 링크 안에 있어도 링크 전체가 대상이 된다
        const chain = editor.chain().focus().extendMarkRange("link");

        if (editor.state.selection.empty && !isLinkActive) {
            // 선택한 텍스트가 없으면 주소 자체를 링크 텍스트로 넣는다
            chain
                .insertContent({type: "text", text: href, marks: [{type: "link", attrs: {href}}]})
                .run();
        } else {
            chain.setLink({href}).run();
            // 적용 후에도 텍스트가 선택된 채로 남으면 이어서 타이핑할 때 덮어쓰게 된다.
            // 링크 끝으로 커서를 옮겨 바로 이어 쓸 수 있게 한다.
            editor.commands.setTextSelection(editor.state.selection.to);
        }

        onClose();
    };

    const removeLink = () => {
        editor.chain().focus().extendMarkRange("link").unsetLink().run();
        onClose();
    };

    return (
        <Modal isOpen={open} onClose={onClose} className="w-full max-w-sm mx-4 rounded-xl px-4 py-4">
            <div className="flex items-center gap-2 text-foreground">
                <LinkIcon size={16}/>
                <span className="text-base font-semibold">링크</span>
            </div>

            {selectedText && (
                <p className="mt-2 text-xs text-subtle truncate">
                    선택한 텍스트: <span className="text-muted">{selectedText}</span>
                </p>
            )}

            <input
                ref={inputRef}
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyLink()}
                placeholder="https://example.com"
                className="mt-3 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />

            <div className="mt-4 flex gap-2">
                {isLinkActive && (
                    <button
                        type="button"
                        onClick={removeLink}
                        className="rounded-lg border border-border px-3 py-2 text-sm text-danger transition cursor-pointer hover:bg-danger-soft"
                    >
                        제거
                    </button>
                )}
                <button
                    type="button"
                    onClick={onClose}
                    className="ml-auto rounded-lg border border-border px-3 py-2 text-sm text-muted transition cursor-pointer hover:bg-background"
                >
                    취소
                </button>
                <button
                    type="button"
                    onClick={applyLink}
                    disabled={!url.trim()}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition cursor-pointer hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                    확인
                </button>
            </div>
        </Modal>
    );
}