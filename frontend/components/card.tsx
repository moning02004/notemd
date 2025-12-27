import {RiExternalLinkLine} from "react-icons/ri";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {TemplateMenu} from "@/components/template_menu";
import {NoteMenu} from "@/components/note_menu";
import {Badge} from "@/components/badge";
import {DeletedMenu} from "@/components/deleted_menu";

export const Card = ({onClick, hashId, title, content, isPublic, created_at, noteMenu, templateMenu, deletedMenu, width}: {
    onClick?: React.MouseEventHandler<HTMLDivElement>
    hashId: string,
    title: string,
    content: string,
    isPublic?: boolean,
    created_at?: string,

    noteMenu?: boolean,
    templateMenu?: boolean,
    deletedMenu?: boolean,
    width: string,
}) => {

    return (
        <div className={`flex flex-col h-[17rem] mx-auto ${width} mb-8 group`}>
            <div className="relative flex-10 overflow-hidden p-3 hover:shadow-lg  hover:border-[#888888]  text-ellipsis rounded border  border-[#afafaf] whitespace-pre-line hover:bg-[#fafafa]
                            transition-all duration-200 ">
                {isPublic && <div className="absolute left-3 top-0 bg-white"><Badge text="공유됨" isPublic={true} /></div>}
                <div className="cursor-pointer h-[100%]" onClick={onClick}>
                    <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
                </div>
                {
                    noteMenu && <NoteMenu noteId={hashId}/>
                }
                {
                    templateMenu && <TemplateMenu/>
                }
                {
                    deletedMenu && <DeletedMenu noteId={hashId}/>
                }
            </div>
            <div className="font-bold truncate w-full text-center cursor-default">{title}</div>
            <small className="w-full pr-2 text-gray-500 text-center cursor-default">{created_at}</small>
        </div>
    )
}
