"use client"

import React, {useState} from "react"
import DOMPurify from "dompurify"
import {X} from "lucide-react"

import {Modal} from "@/components/ui/modal"
import {previewText} from "@/lib/note"
import {ConflictChoice, MergeChunk} from "@/lib/note_merge"

export type NoteMergeView = {
    chunks: MergeChunk[]
    /** title: 겹치지 않았을 때 합친 제목 */
    title: { title: string, base: string, mine: string, theirs: string, theirsChanged: boolean, conflict: boolean }
}

interface Props {
    open: boolean
    merge: NoteMergeView | null
    /** 고르지 않고 닫는다. 자동 저장은 멈춘 채로 남고, 안내에서 다시 열 수 있다. */
    onClose: () => void
    onApply: (choices: Record<number, ConflictChoice>, titleChoice: ConflictChoice) => void
    onUseTheirs: () => void
    onKeepMine: () => void
}

const CHOICES: { value: ConflictChoice, label: string }[] = [
    {value: "theirs", label: "다른 곳 것"},
    {value: "mine", label: "내 것"},
    {value: "both", label: "둘 다"},
]

/** 블록 하나를 본문과 같은 모양으로 보여 준다. 빈 줄은 글자가 없어 보이지 않으므로 표시를 단다. */
function Block({html, tone}: { html: string, tone: "removed" | "added" | "plain" }) {
    const empty = !previewText(html) && !/<(img|table|hr)\b/i.test(html)
    const toneClass = tone === "removed"
        ? "bg-danger-soft/70 border-l-danger line-through decoration-danger/60 text-muted"
        : tone === "added" ? "bg-accent-soft border-l-accent" : "bg-background border-l-border-strong"
    return (
        <div className={`border-l-[3px] rounded-r-md px-3 py-1.5 overflow-x-auto ${toneClass}`}>
            {empty
                ? <span className="text-xs text-subtle italic">(빈 줄)</span>
                : <div className="ProseMirror note-diff-block"
                       dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(html)}}/>}
        </div>
    )
}

function ChoicePicker({value, onChange, label, allowBoth = true}: {
    value: ConflictChoice, onChange: (value: ConflictChoice) => void, label: string, allowBoth?: boolean
}) {
    return (
        <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-border p-0.5 bg-background">
            {CHOICES.filter(choice => allowBoth || choice.value !== "both").map(choice => (
                <button key={choice.value} type="button" role="radio" aria-checked={value === choice.value}
                        onClick={() => onChange(choice.value)}
                        className={`px-3 py-1.5 pointer-coarse:py-2 rounded-md text-xs font-medium cursor-pointer transition-colors
                                    ${value === choice.value ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"}`}>
                    {choice.label}
                </button>
            ))}
        </div>
    )
}

/** 바뀐 곳이 본문 어디쯤인지. 바로 앞의 그대로인 블록 첫머리를 보여 준다. */
function contextOf(chunks: MergeChunk[], index: number) {
    for (let i = index - 1; i >= 0; i--) {
        const chunk = chunks[i]
        if (chunk.kind !== "same") continue
        const text = previewText(chunk.blocks[chunk.blocks.length - 1])
        if (text) return `‘${text.length > 28 ? `${text.slice(0, 28)}…` : text}’ 다음`
    }
    return "맨 앞"
}

/**
 * 다른 곳에서 먼저 저장한 내용과 합치는 창.
 *
 * 다른 곳에서 바뀐 곳을 모두 보여 준다. 한쪽에서만 바꾼 곳은 이미 합쳐져 있고,
 * 같은 곳을 양쪽이 다르게 바꾼 곳만 고른다(기본은 둘 다 남기기 — 아무것도 잃지 않는다).
 */
export function NoteConflictModal({open, merge, onClose, onApply, onUseTheirs, onKeepMine}: Props) {
    const [choices, setChoices] = useState<Record<number, ConflictChoice>>({})
    const [titleChoice, setTitleChoice] = useState<ConflictChoice>("mine")

    // 새로 비교할 때마다 고른 것을 비운다(렌더 중에 앞 비교와 견줘 맞춘다).
    const [shownMerge, setShownMerge] = useState(merge)
    if (merge !== shownMerge) {
        setShownMerge(merge)
        setChoices({})
        setTitleChoice("mine")
    }

    if (!merge) return null

    const theirsCount = merge.chunks.filter(chunk => chunk.kind === "theirs").length + (merge.title.theirsChanged && !merge.title.conflict ? 1 : 0)
    const conflictCount = merge.chunks.filter(chunk => chunk.kind === "conflict").length + (merge.title.conflict ? 1 : 0)
    const mineCount = merge.chunks.filter(chunk => chunk.kind === "mine").length

    return (
        <Modal isOpen={open} onClose={onClose} variant="sheet"
               className="w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-2xl sm:rounded-xl">
            <div className="flex items-start gap-3 px-5 pt-5 pb-3 border-b border-border">
                <div className="flex-1">
                    {/* 전역 h2·h3 규칙(큰 글씨·밑줄)이 유틸리티보다 앞서서 제목 태그 대신 role 을 준다. */}
                    <p role="heading" aria-level={2} className="text-base font-semibold text-foreground">다른 곳에서 바뀐 내용</p>
                    <p className="mt-1 text-[13px] text-muted leading-relaxed">
                        이 노트를 다른 곳(다른 탭·기기·함께 쓰는 사람)에서 먼저 저장했어요.
                        {theirsCount > 0 && <> 겹치지 않게 바뀐 {theirsCount}곳은 합쳐 둡니다.</>}
                        {conflictCount > 0 && <> 같은 곳을 양쪽에서 고친 {conflictCount}곳은 남길 쪽을 골라 주세요.</>}
                        {mineCount > 0 && <> 여기서 고친 {mineCount}곳은 그대로 둡니다.</>}
                    </p>
                </div>
                <button type="button" onClick={onClose} aria-label="닫기"
                        className="p-1.5 -mr-1.5 rounded-lg text-muted hover:bg-background cursor-pointer">
                    <X size={18}/>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {(merge.title.theirsChanged) && (
                    <section className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p role="heading" aria-level={3} className="text-xs font-semibold text-subtle">
                                제목 · {merge.title.conflict ? "양쪽에서 고침" : "다른 곳에서 바꿈"}
                            </p>
                            {merge.title.conflict &&
                                <ChoicePicker value={titleChoice} onChange={setTitleChoice} label="남길 제목" allowBoth={false}/>}
                        </div>
                        {merge.title.conflict ? (
                            <div className="grid gap-2 sm:grid-cols-2">
                                <div className="space-y-1"><p className="text-[11px] text-subtle">다른 곳</p>
                                    <Block html={`<p>${escapeHtml(merge.title.theirs)}</p>`} tone="plain"/></div>
                                <div className="space-y-1"><p className="text-[11px] text-subtle">여기</p>
                                    <Block html={`<p>${escapeHtml(merge.title.mine)}</p>`} tone="plain"/></div>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                <Block html={`<p>${escapeHtml(merge.title.base)}</p>`} tone="removed"/>
                                <Block html={`<p>${escapeHtml(merge.title.theirs)}</p>`} tone="added"/>
                            </div>
                        )}
                    </section>
                )}

                {merge.chunks.map((chunk, index) => {
                    if (chunk.kind === "theirs") return (
                        <section key={index} className="space-y-1.5">
                            <p role="heading" aria-level={3} className="text-xs font-semibold text-subtle">
                                {contextOf(merge.chunks, index)} · 다른 곳에서 {chunk.theirs.length === 0 ? "지움" : chunk.base.length === 0 ? "더함" : "바꿈"}
                            </p>
                            <div className="space-y-1">
                                {chunk.base.map((block, i) => <Block key={`b${i}`} html={block} tone="removed"/>)}
                                {chunk.theirs.map((block, i) => <Block key={`t${i}`} html={block} tone="added"/>)}
                            </div>
                        </section>
                    )
                    if (chunk.kind === "conflict") return (
                        <section key={index} className="space-y-2 rounded-lg border border-chip-open/30 bg-chip-open-soft/40 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p role="heading" aria-level={3} className="text-xs font-semibold text-chip-open">
                                    {contextOf(merge.chunks, index)} · 양쪽에서 고침
                                </p>
                                <ChoicePicker value={choices[index] ?? "both"} label="남길 쪽"
                                              onChange={value => setChoices(prev => ({...prev, [index]: value}))}/>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <div className="space-y-1 min-w-0">
                                    <p className="text-[11px] text-subtle">다른 곳</p>
                                    {chunk.theirs.length
                                        ? chunk.theirs.map((block, i) => <Block key={i} html={block} tone="plain"/>)
                                        : <p className="text-xs text-subtle italic">(지움)</p>}
                                </div>
                                <div className="space-y-1 min-w-0">
                                    <p className="text-[11px] text-subtle">여기</p>
                                    {chunk.mine.length
                                        ? chunk.mine.map((block, i) => <Block key={i} html={block} tone="plain"/>)
                                        : <p className="text-xs text-subtle italic">(지움)</p>}
                                </div>
                            </div>
                        </section>
                    )
                    return null
                })}

                {theirsCount === 0 && conflictCount === 0 && (
                    <p className="text-sm text-muted">본문과 제목은 다른 곳에서 바뀐 것이 없어요.</p>
                )}
            </div>

            <div className="flex flex-col-reverse gap-2 px-5 py-3 border-t border-border sm:flex-row sm:items-center">
                <div className="flex gap-2 sm:mr-auto">
                    <button type="button" onClick={onUseTheirs} title="이 화면에서 고친 내용은 사라집니다"
                            className="flex-1 sm:flex-none rounded-lg border border-border px-3 py-2 text-[13px] text-foreground cursor-pointer hover:bg-background">
                        다른 곳 내용만 쓰기
                    </button>
                    <button type="button" onClick={onKeepMine} title="다른 곳에서 바꾼 내용은 사라집니다"
                            className="flex-1 sm:flex-none rounded-lg border border-border px-3 py-2 text-[13px] text-foreground cursor-pointer hover:bg-background">
                        내 내용으로 덮어쓰기
                    </button>
                </div>
                <button type="button" onClick={() => onApply(choices, titleChoice)}
                        className="rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-white cursor-pointer hover:bg-accent-hover">
                    합쳐서 적용
                </button>
            </div>
        </Modal>
    )
}

const escapeHtml = (text: string) =>
    text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
