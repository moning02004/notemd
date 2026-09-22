"use client"

import {FiChevronRight, FiFolder, FiInbox} from "react-icons/fi"
import {useMoveSheetStore} from "@/store/moveSheet"
import {NoteFolder} from "@/types/folder"

/**
 * 에디터 제목 아래 붙는 현재 위치.
 *
 * 검색이나 링크로 바로 들어오면 이 노트가 어디에 있는지 알 방법이 없다.
 * 보여주기만 하지 않고 눌러서 바로 옮길 수 있게 해서, 설정 패널까지 들어가지 않아도 되게 했다.
 */
export function NoteFolderChip({folder, noteId, editable, onMoved}: {
    folder: NoteFolder | null
    noteId: string
    editable: boolean
    onMoved: (folder: NoteFolder | null) => void
}) {
    const openSheet = useMoveSheetStore(state => state.openSheet)

    const label = folder?.name ?? "미분류"
    const Icon = folder ? FiFolder : FiInbox

    if (!editable) {
        return (
            <div className="flex items-center gap-1.5 px-4 md:px-5 h-9 border-b border-border bg-surface
                            text-[12px] text-subtle">
                <Icon size={12} className="shrink-0"/>
                <span className="truncate">{label}</span>
            </div>
        )
    }

    return (
        <button
            onClick={() => openSheet([noteId], folder?.hashId ?? null,
                moved => onMoved(moved ? {hashId: moved.hashId, name: moved.name} : null))}
            aria-label={`폴더 바꾸기. 현재 ${label}`}
            className="group flex items-center gap-1.5 w-full px-4 md:px-5 h-11 md:h-9 border-b border-border
                       bg-surface text-[12.5px] md:text-[12px] cursor-pointer text-muted
                       hover:text-accent hover:bg-background active:bg-background transition-colors duration-150"
        >
            <Icon size={13} className="shrink-0"/>
            <span className="truncate">{label}</span>
            <FiChevronRight size={12} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"/>
            <span className="ml-auto shrink-0 text-[11px] text-subtle">폴더 바꾸기</span>
        </button>
    )
}
