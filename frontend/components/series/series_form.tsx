"use client"

import {useState} from "react"
import {FiArrowDown, FiArrowUp, FiX} from "react-icons/fi"
import {RxDragHandleDots2} from "react-icons/rx"
import {Spinner} from "@/components/icons"
import {SeriesInput, SeriesNote} from "@/types/series"

interface Props {
    initialTitle?: string
    initialDescription?: string
    notes: SeriesNote[]
    onNotesChange: (notes: SeriesNote[]) => void
    submitLabel: string
    busy?: boolean
    onSubmit: (input: SeriesInput) => void
    onCancel: () => void
}

/**
 * 시리즈의 제목·설명과 노트 순서를 정하는 폼. 만들 때와 고칠 때 같이 쓴다.
 *
 * 순서는 끌어서도, 화살표로도 바꾼다. 끌기는 터치 화면에서 되지 않으므로(HTML 끌어 놓기)
 * 휴대폰에서는 화살표가 유일한 길이라 늘 보이게 둔다.
 */
export function SeriesForm({
                               initialTitle = "",
                               initialDescription = "",
                               notes,
                               onNotesChange,
                               submitLabel,
                               busy,
                               onSubmit,
                               onCancel,
                           }: Props) {
    const [title, setTitle] = useState(initialTitle)
    const [description, setDescription] = useState(initialDescription)
    const [dragging, setDragging] = useState<number | null>(null)

    const move = (from: number, to: number) => {
        if (to < 0 || to >= notes.length || from === to) return
        const next = [...notes]
        next.splice(to, 0, ...next.splice(from, 1))
        onNotesChange(next)
    }

    const canSubmit = title.trim().length > 0 && notes.length > 0 && !busy

    return (
        <form
            className="flex flex-col min-h-0 flex-1"
            onSubmit={event => {
                event.preventDefault()
                if (canSubmit) onSubmit({title: title.trim(), description: description.trim(), noteHashes: notes.map(note => note.hash_id)})
            }}
        >
            <div className="flex flex-col gap-3 px-4 pt-4">
                <label className="flex flex-col gap-1">
                    <span className="text-[12px] font-medium text-muted">
                        시리즈 제목 <span className="text-danger">*</span>
                    </span>
                    <input
                        id="series-title"
                        value={title}
                        onChange={event => setTitle(event.target.value)}
                        placeholder="예: 파이썬 입문"
                        maxLength={100}
                        autoComplete="off"
                        className="border border-border-strong rounded-lg px-3 h-10 text-[14px] text-foreground
                                   bg-surface outline-none focus:border-accent"
                    />
                </label>
                <label className="flex flex-col gap-1">
                    <span className="text-[12px] font-medium text-muted">설명 <span className="text-subtle">(선택)</span></span>
                    <textarea
                        id="series-description"
                        value={description}
                        onChange={event => setDescription(event.target.value)}
                        placeholder="어떤 시리즈인지 한두 줄로"
                        rows={2}
                        maxLength={500}
                        className="border border-border-strong rounded-lg px-3 py-2 text-[14px] text-foreground
                                   bg-surface outline-none focus:border-accent resize-none"
                    />
                </label>
                <p className="text-[12px] font-medium text-muted">
                    노트 순서 <span className="tabular-nums text-subtle">{notes.length}</span>
                </p>
            </div>

            <ol className="flex-1 min-h-24 overflow-y-auto px-2 pb-2">
                {notes.map((note, index) => (
                    <li
                        key={note.hash_id}
                        draggable
                        onDragStart={event => {
                            event.dataTransfer.effectAllowed = "move"
                            setDragging(index)
                        }}
                        onDragOver={event => {
                            event.preventDefault()
                            // 지나가는 자리로 바로 옮겨 보여준다. 놓았을 때 어디에 들어갈지 따로 그리지 않아도 된다.
                            if (dragging !== null && dragging !== index) {
                                move(dragging, index)
                                setDragging(index)
                            }
                        }}
                        onDragEnd={() => setDragging(null)}
                        className={`flex items-center gap-1.5 px-2 min-h-12 md:min-h-10 rounded-lg
                                    ${dragging === index ? "bg-accent-soft" : "hover:bg-background"}`}
                    >
                        <RxDragHandleDots2 size={14} className="hidden md:block shrink-0 text-subtle cursor-grab"/>
                        <span className="w-6 shrink-0 text-right text-[12px] tabular-nums text-subtle">{index + 1}.</span>
                        <span className={`flex-1 min-w-0 truncate text-[14px] ${note.title.trim() ? "text-foreground" : "text-subtle"}`}>
                            {note.title.trim() || "제목 없음"}
                        </span>
                        <IconButton label="위로" disabled={index === 0} onClick={() => move(index, index - 1)}>
                            <FiArrowUp size={15}/>
                        </IconButton>
                        <IconButton label="아래로" disabled={index === notes.length - 1} onClick={() => move(index, index + 1)}>
                            <FiArrowDown size={15}/>
                        </IconButton>
                        <IconButton label="시리즈에서 빼기"
                                    onClick={() => onNotesChange(notes.filter(item => item.hash_id !== note.hash_id))}>
                            <FiX size={15}/>
                        </IconButton>
                    </li>
                ))}
                {notes.length === 0 && (
                    <li className="py-6 text-center text-[13px] text-subtle">시리즈에 담을 노트가 없습니다.</li>
                )}
            </ol>

            <div className="flex gap-2 px-4 py-3 border-t border-border">
                <button type="button" onClick={onCancel}
                        className="flex-1 h-10 rounded-lg border border-border text-[14px] font-medium text-muted
                                   cursor-pointer hover:bg-background">
                    취소
                </button>
                <button type="submit" disabled={!canSubmit}
                        className="flex-1 h-10 rounded-lg bg-accent text-white text-[14px] font-semibold cursor-pointer
                                   hover:bg-accent-hover flex items-center justify-center gap-1.5
                                   disabled:opacity-40 disabled:cursor-not-allowed">
                    {busy && <Spinner size={15}/>}
                    {submitLabel}
                </button>
            </div>
        </form>
    )
}

function IconButton({label, disabled, onClick, children}: {
    label: string
    disabled?: boolean
    onClick: () => void
    children: React.ReactNode
}) {
    return (
        <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick}
                className="shrink-0 w-9 h-9 md:w-7 md:h-7 flex items-center justify-center rounded-md text-muted
                           cursor-pointer hover:bg-border hover:text-foreground
                           disabled:opacity-25 disabled:cursor-default disabled:hover:bg-transparent">
            {children}
        </button>
    )
}
