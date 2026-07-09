import {TemplateMenu} from "@/components/template_menu"
import {NoteMenu} from "@/components/note_menu"
import {Badge} from "@/components/badge"
import {DeletedMenu} from "@/components/deleted_menu"
import DOMPurify from "dompurify"
import {FiCheck} from "react-icons/fi"

type NoteType = {
    onClick?: React.MouseEventHandler<HTMLDivElement>
    hashId: string
    title: string
    content: string
    ownerName?: string
    isPublic?: boolean
    isProtected?: boolean
    created_at?: string
    noteMenu?: boolean
    templateMenu?: boolean
    deletedMenu?: boolean
    selectable?: boolean
    selected?: boolean
    onSelect?: (id: string) => void
}
export const Note = ({
                         onClick,
                         hashId,
                         title,
                         content,
                         ownerName,
                         isPublic,
                         isProtected,
                         created_at,
                         noteMenu,
                         templateMenu,
                         deletedMenu,
                         selectable,
                         selected,
                         onSelect,
                     }: NoteType) => {
    const cleanContent = DOMPurify.sanitize(content)
    const texts = [
        isPublic ? "공유됨" : "",
        isProtected ? "보호됨" : "",
    ].filter(Boolean)

    function handleClick(e: React.MouseEvent<HTMLDivElement>) {
        if (selectable) {
            onSelect?.(hashId)
        } else {
            onClick?.(e)
        }
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

                <div className="absolute left-3 top-0 bg-white">
                    <Badge texts={texts.join(":")}/>
                </div>

                <div
                    onClick={handleClick}
                    className={`${texts.length ? "pt-3" : ""} text-sm h-[100%] overflow-hidden`}
                    dangerouslySetInnerHTML={{__html: cleanContent}}
                />

                {!selectable && noteMenu && <NoteMenu noteId={hashId} canDelete={!isProtected}/>}
                {!selectable && templateMenu && <TemplateMenu/>}
                {!selectable && deletedMenu && <DeletedMenu noteId={hashId}/>}
            </div>

            <div className="font-bold truncate w-full text-center cursor-default mt-1">{title}</div>
            <small className="w-full text-gray-500 text-center cursor-default">{created_at}</small>
        </div>
    )
}