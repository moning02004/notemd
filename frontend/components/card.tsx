import {TemplateMenu} from "@/components/template_menu";
import {NoteMenu} from "@/components/note_menu";
import {Badge} from "@/components/badge";
import {DeletedMenu} from "@/components/deleted_menu";
import DOMPurify from 'dompurify';

export const Card = ({
                         onClick,
                         hashId,
                         title,
                         content,
                         isPublic,
                         isProtected,
                         created_at,
                         noteMenu,
                         templateMenu,
                         deletedMenu
                     }: {
    onClick?: React.MouseEventHandler<HTMLDivElement>
    hashId: string,
    title: string,
    content: string,
    isPublic?: boolean,
    isProtected?: boolean,
    created_at?: string,

    noteMenu?: boolean,
    templateMenu?: boolean,
    deletedMenu?: boolean,
}) => {
    const cleanContent = DOMPurify.sanitize(content);

    const texts = [
        isPublic ? "공유됨" : "",
        isProtected ? "보호됨" : ""
    ]
    return (
        <div className={`flex-1 flex flex-col h-[17rem] mx-auto mb-8 group w-[90%]`}>
            <div className="relative bg-white flex-10 overflow-hidden p-3 hover:shadow-lg  hover:border-[#888888]  text-ellipsis rounded border  border-[#afafaf] whitespace-pre-line hover:bg-emerald-50
                            transition-all duration-200 ">
                <div className="absolute left-3 top-0 bg-white">
                    <Badge texts={texts.join(":")} isPublic={true}/>
                </div>

                <div className="cursor-pointer h-[100%]" onClick={onClick}>
                    <div dangerouslySetInnerHTML={{__html: cleanContent}}/>
                </div>
                {
                    noteMenu && <NoteMenu noteId={hashId} canDelete={!isProtected}/>
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
