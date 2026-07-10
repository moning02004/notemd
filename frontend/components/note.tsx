import {NoteMenu} from "@/components/note_menu"
import {DeletedMenu} from "@/components/deleted_menu"
import DOMPurify from "dompurify"
import {FiCheck} from "react-icons/fi"
import {LuEllipsisVertical} from "react-icons/lu"
import {FaLink, FaLock} from "react-icons/fa";
import {MdWorkspacesFilled} from "react-icons/md";

type NoteType = {
    onClick?: React.MouseEventHandler<HTMLDivElement>
    hashId: string
    title: string
    content: string
    ownerName?: string
    isPublic?: boolean
    isProtected?: boolean
    isShared?: boolean
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
                         created_at,
                         noteMenu,
                         deletedMenu,
                         selectable,
                         selected,
                         onSelect,
                         viewMode = "card",
                     }: NoteType) => {
    const cleanContent = DOMPurify.sanitize(content)
    const icons = [
        isPublic && <FaLink size={14}/>,
        isProtected && <FaLock size={14}/>,
        isShared && <MdWorkspacesFilled size={15}/>,
    ].filter(Boolean)
    console.log(icons)

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
                    flex items-center gap-3 px-3 py-2.5 border-b border-[#ededed]
                    transition-colors cursor-pointer
                    ${selected
                    ? "bg-emerald-50"
                    : selectable
                        ? "hover:bg-gray-50"
                        : "hover:bg-emerald-50/60"
                }
                `}
            >
                {selectable && (
                    <div className={`
                        shrink-0 w-5 h-5 rounded-full flex items-center justify-center
                        transition-all duration-150
                        ${selected
                        ? "bg-emerald-500"
                        : "border border-gray-300 bg-white"
                    }
                    `}>
                        {selected && <FiCheck size={11} className="text-white stroke-[3]"/>}
                    </div>
                )}

                <span className="flex-1 min-w-0 truncate font-medium text-sm text-[#23241F]">
                    {title}
                </span>

                <span className="shrink-0 w-20 sm:w-28 truncate text-right text-xs text-gray-400">
                    {ownerName ?? "-"}
                </span>

                <span className="shrink-0 w-20 sm:w-24 text-right text-xs text-gray-400">
                    {created_at}
                </span>

                {!selectable && (noteMenu || deletedMenu) && (
                    <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                        {noteMenu && (
                            <NoteMenu
                                noteId={hashId}
                                canDelete={!isProtected}
                                trigger={
                                    <button className="p-1 rounded hover:bg-gray-200 text-gray-500 cursor-pointer">
                                        <LuEllipsisVertical size={16}/>
                                    </button>
                                }
                            />
                        )}
                        {deletedMenu && (
                            <DeletedMenu
                                noteId={hashId}
                                trigger={
                                    <button className="p-1 rounded hover:bg-gray-200 text-gray-500 cursor-pointer">
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
        <div className="flex-1 flex flex-col h-[14rem] mx-auto mb-8 group w-[90%]" data-note-id={hashId}>
            <div
                className={`
                    relative bg-white flex-10 overflow-hidden p-3
                    text-ellipsis rounded border whitespace-pre-line
                    transition-all duration-200 cursor-pointer
                    ${selected
                    ? "border-emerald-500 ring-2 ring-emerald-200 bg-emerald-50"
                    : selectable
                        ? "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                        : "border-[#afafaf] hover:shadow-lg hover:border-[#888888] hover:bg-emerald-50"
                }
                `}
            >
                {/* 선택 체크 오버레이 */}
                {selectable && (
                    <div className={`
                        absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center
                        transition-all duration-150 z-10
                        ${selected
                        ? "bg-emerald-500 scale-100 opacity-100"
                        : "border border-gray-300 bg-white scale-90 opacity-60"
                    }
                    `}>
                        {selected && <FiCheck size={11} className="text-white stroke-[3]"/>}
                    </div>
                )}

                <div
                    onClick={handleClick}
                    className="text-sm h-[100%] overflow-hidden"
                    dangerouslySetInnerHTML={{__html: cleanContent}}
                />

                {!selectable && noteMenu && <NoteMenu noteId={hashId} canDelete={!isProtected}/>}
                {!selectable && deletedMenu && <DeletedMenu noteId={hashId}/>}
            </div>

            <div className="flex font-bold truncate cursor-default mt-1">
                <div className="flex flex-row gap-2 mx-auto">
                    {icons.map(x => (
                        <div className="my-auto">{x}</div>
                    ))}
                    <div className="w-full">{title}</div>
                </div>
            </div>
            <small className="w-full text-gray-500 text-center cursor-default">{ownerName}</small>
            <small className="w-full text-gray-500 text-center cursor-default">{created_at}</small>
        </div>
    )
}