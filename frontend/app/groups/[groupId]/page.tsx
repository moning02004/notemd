"use client"

import {useEffect, useState} from "react";
import {useAuthStore} from "@/store/auth";
import {useParams} from "next/navigation";
import {FiPlus} from "react-icons/fi";
import {Topbar} from "@/components/topbar";
import {GroupNoteCard} from "@/types/group_note";

export default function Page() {
    const {token} = useAuthStore.getState()
    const {groupId} = useParams();
    const [notes, setNotes] = useState(Array<GroupNoteCard>)

    useEffect(() => {
        console.log(token, groupId)
        setNotes([
            {
                title: "블로그 개발 2",
                hash_id: "ddcdefghijklmnopqrstuvwxyzABCDEF",
                content: "ABCDE ㄹ매ㅑㅓㅈ대ㅑ러 faowiejfo; ㄹ매ㅑㅈ덜;맺덜; faojewofijaw;eiofjalwkefj ojoafwejofiajwe",
                created_at: "2025-01-01 13:59"
            },
            {
                title: "블로그 개발 2",
                hash_id: "abcdefghijklmnopqrstuvwxyzABCDEF",
                content: "ABCDE ㄹ매ㅑㅓㅈ대ㅑ러 faowiejfo; ㄹ매ㅑㅈ덜;맺덜; faojewofijaw;eiofjalwkefj ojoafwejofiajwe",
                created_at: "2025-01-01 13:59"
            },
            {
                title: "블로그 개발 2",
                hash_id: "abcdefghijklmnopqrstuvwxyzABC123",
                content: "ABCDE ㄹ매ㅑㅓㅈ대ㅑ러 faowiejfo; ㄹ매ㅑㅈ덜;맺덜; faojewofijaw;eiofjalwkefj ojoafwejofiajwe",
                created_at: "2025-01-01 13:59"
            },
            {
                title: "블로그 개발 2",
                hash_id: "123abcdefghijklmnopqrstuvwxyzABC",
                content: "ABCDE ㄹ매ㅑㅓㅈ대ㅑ러 faowiejfo; ㄹ매ㅑㅈ덜;맺덜; faojewofijaw;eiofjalwkefj ojoafwejofiajwe",
                created_at: "2025-01-01 13:59"
            },
        ])
    }, [groupId]);

    const gotoNote = (id: string | null) => {
        id = id ?? "new"
        window.location.href = `/s/${id}`
    }
    const Card = ({onClick, title, content, created_at}: {
        onClick?: React.MouseEventHandler<HTMLDivElement>
        title: string,
        content: string,
        created_at: string
    }) => {
        return (
            <div className="flex flex-col p-3 w-[29vw] md:w-[24vw] h-[18rem]" onClick={onClick}>
                <div className="flex flex-col p-3 rounded border bg-white border-[#afafaf] cursor-pointer h-[15rem]
                    hover:shadow-lg hover:border-[#888888] hover:bg-[#fafafa] transition-all duration-200">
                    <div className="overflow-hidden text-ellipsis h-[100%]">{content}</div>
                </div>
                <div className="mx-auto font-bold">{title}</div>
                <small className="mx-auto pr-2 text-gray-500 w-[100%] text-center">{created_at}</small>
            </div>
        )
    }

    return (
        <>
            <Topbar/>
            <main className="mt-2 flex-1 overflow-auto min-h-screen bg-white">
                <div className="bg-white h-[100%] mx-auto p-3 grid grid-cols-3 md:grid-cols-4 content-start gap-3">
                    {
                        notes.map((note) => (
                            <Card key={note.hash_id} onClick={() => gotoNote(note.hash_id)} title={note.title}
                                  content={note.content} created_at={note.created_at}/>
                        ))
                    }
                </div>
            </main>
            <div className="fixed right-0 bottom-0 border m-6 mr-6 p-4 bg-white rounded-full shadow-lg
                cursor-pointer hover:bg-gray-100 transition-all duration-200 hover:shadow-xl"
                 onClick={() => gotoNote(null)}>
                <FiPlus size={22}/>
            </div>
        </>
    )
}