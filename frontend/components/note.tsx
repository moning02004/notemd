import {NoteMenu} from "@/components/note_menu"
import {DeletedMenu} from "@/components/deleted_menu"
import DOMPurify from "dompurify"
import {FiCheck} from "react-icons/fi"
import {LuEllipsisVertical} from "react-icons/lu"
import {FaLink, FaLock} from "react-icons/fa";
import {MdOutlineSecurity, MdWorkspacesFilled} from "react-icons/md";
import {TbLockPassword} from "react-icons/tb";

type NoteType = {
    onClick?: React.MouseEventHandler<HTMLDivElement>
    hashId: string
    title: string
    content: string
    ownerName?: string
    isPublic?: boolean
    isProtected?: boolean
    isShared?: boolean
    isEncrypted?: boolean
    isPassword?: boolean
    created_at?: string
    noteMenu?: boolean
    deletedMenu?: boolean
    selectable?: boolean
    selected?: boolean
    onSelect?: (id: string) => void
    viewMode?: "card" | "list"
}

export const Note = ({
                         onClick,
                         hashId,
                         title,
                         content,
                         ownerName,
                         isPublic,
                         isProtected,
                         isShared,
                         isEncrypted,
                         isPassword,
                         created_at,
                         noteMenu,
                         deletedMenu,
                         selectable,
                         selected,
                         onSelect,
                         viewMode = "card",
                     }: NoteType) => {
    const isUntitled = !title?.trim()
    const displayTitle = isUntitled ? "제목 없음" : title

    // 미리보기는 서식 없이 본문 텍스트만 보여준다
    const preview = DOMPurify.sanitize(content ?? "", {ALLOWED_TAGS: [], ALLOWED_ATTR: []})
        .replace(/\s+/g, " ")
        .trim()

    const icons = [
        isPublic && <FaLink size={12} key="public"/>,
        isProtected && <FaLock size={12} key="protected"/>,
        isShared && <MdWorkspacesFilled size={13} key="shared"/>,
        isEncrypted && <MdOutlineSecurity size={13} key="shared"/>,
        isPassword && <TbLockPassword size={13} key="password"/>,
    ].filter(Boolean)

    function handleClick(e: React.MouseEvent<HTMLDivElement>) {
        if (selectable) {
            onSelect?.(hashId)
        } else {
            onClick?.(e)
        }
    }

    if (viewMode === "list") {
        return (
            <div
                data-note-id={hashId}
                onClick={handleClick}
                className={`
                    flex items-center gap-3 px-3 py-2.5 border-b border-border
                    transition-colors cursor-pointer
                    ${selected ? "bg-accent-soft" : "hover:bg-background"}
                `}
            >
                {selectable && (
                    <div className={`
                        shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-150
                        ${selected ? "bg-accent" : "border border-border-strong bg-surface"}
                    `}>
                        {selected && <FiCheck size={11} className="text-white stroke-[3]"/>}
                    </div>
                )}

                {icons.length > 0 && (
                    <div className="shrink-0 flex items-center gap-1.5 text-accent">{icons}</div>
                )}

                <div className="flex-1 min-w-0">
                    <p className={`truncate text-sm font-medium ${isUntitled ? "text-subtle" : "text-foreground"}`}>
                        {displayTitle}
                    </p>
                    <p className="truncate text-xs text-subtle">
                        {preview || "아직 아무것도 쓰지 않았어요"}
                    </p>
                </div>

                {ownerName && (
                    <span className="shrink-0 hidden sm:block w-24 truncate text-right text-xs text-subtle">
                        {ownerName}
                    </span>
                )}

                <span className="shrink-0 w-20 sm:w-24 text-right text-xs text-subtle">
                    {created_at}
                </span>

                {!selectable && (noteMenu || deletedMenu) && (
                    <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                        {noteMenu && (
                            <NoteMenu
                                noteId={hashId}
                                canDelete={!isProtected}
                                trigger={
                                    <button
                                        className="p-1 rounded hover:bg-accent-soft text-accent sm:text-muted cursor-pointer">
                                        <LuEllipsisVertical size={13}/>
                                    </button>
                                }
                            />
                        )}
                        {deletedMenu && (
                            <DeletedMenu
                                noteId={hashId}
                                trigger={
                                    <button className="p-1 rounded hover:bg-accent-soft text-muted cursor-pointer">
                                        <LuEllipsisVertical size={16}/>
                                    </button>
                                }
                            />
                        )}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div
            data-note-id={hashId}
            onClick={handleClick}
            className={`
                group relative flex flex-col min-h-[11.5rem] p-3.5 rounded-xl border bg-surface
                transition-all duration-150 cursor-pointer
                ${selected
                ? "border-accent bg-accent-soft"
                : "border-border hover:border-border-strong hover:shadow-[0_8px_18px_-12px_rgba(0,0,0,0.25)]"
            }
            `}
        >
            {selected && (
                <div className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r bg-accent"/>
            )}

            {selectable && (
                <div className={`
                    absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center
                    transition-all duration-150 z-10
                    ${selected ? "bg-accent" : "border border-border-strong bg-surface"}
                `}>
                    {selected && <FiCheck size={11} className="text-white stroke-[3]"/>}
                </div>
            )}

            <div className="flex items-start gap-1.5 mb-1.5 pr-5">
                {icons.length > 0 && (
                    <div className="shrink-0 flex items-center gap-1.5 mt-0.5 text-accent">{icons}</div>
                )}
                <p className={`text-sm font-medium leading-snug line-clamp-2 ${isUntitled ? "text-subtle" : "text-foreground"}`}>
                    {displayTitle}
                </p>
            </div>

            <p className={`flex-1 text-xs leading-relaxed line-clamp-4 ${preview ? "text-muted" : "text-subtle italic"}`}>
                {preview || "아직 아무것도 쓰지 않았어요"}
            </p>

            <div className="flex items-center gap-2 mt-3">
                {ownerName && (
                    <span className="text-[11px] text-subtle truncate max-w-[7rem]">{ownerName}</span>
                )}
                <span className="ml-auto text-[11px] text-subtle shrink-0">{created_at}</span>
            </div>

            {!selectable && (
                <div onClick={(e) => e.stopPropagation()}
                     className="absolute top-1.5 right-1.5 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    {noteMenu ? <NoteMenu noteId={hashId} canDelete={!isProtected}/> : deletedMenu ?
                        <DeletedMenu noteId={hashId}/> : ""}
                </div>
            )}
        </div>
    )
}
