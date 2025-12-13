"use client"

import {useEffect, useState} from "react";
import {useAuthStore} from "@/store/auth";
import {FiPlus} from "react-icons/fi";
import {Topbar} from "@/components/topbar";
import {GroupNoteCard} from "@/types/group_note";
import {apiRequest} from "@/lib/api";
import {useRouter} from "next/navigation";
import {Sidebar} from "@/components/sidebar";
import {useMenuStore} from "@/store/menu";

export default function Page() {
    const router = useRouter()
    const {token} = useAuthStore.getState()
    const [notes, setNotes] = useState(Array<GroupNoteCard>)
    const isOpen = useMenuStore((state) => state.isOpen)

    useEffect(() => {
        if (!token) {
            router.replace("/login")
            return
        }

        const fetchData = async () => {
            try {
                const res = await apiRequest.get("/notes");
                setNotes(res);
            } catch (error) {
                alert("서버를 확인해주세요.");
            }
        };
        fetchData()
    }, []);

    const gotoNote = async (id: string | null) => {
        if (id === null) {
            const res = await apiRequest.post("/notes");
            id = res.hash_id
        }

        router.push(`/s/${id}`)
    }
    const Card = ({onClick, title, content, created_at}: {
        onClick?: React.MouseEventHandler<HTMLDivElement>
        title: string,
        content: string,
        created_at: string
    }) => {
        return (
            <div className={`flex flex-col cursor-pointer h-[17rem] mx-auto
                    ${isOpen ? "w-[50vw] md:w-[25vw] lg:w-[20vw]" : "w-[37vw] md:w-[29vw] lg:w-[21vw]"} mb-8`}
                 onClick={onClick}>
                <div className="flex-10 overflow-hidden p-3 hover:shadow-lg hover:border-[#888888]  text-ellipsis rounded border  border-[#afafaf] whitespace-pre-line hover:bg-[#fafafa]
                            transition-all duration-200 ">{content}</div>
                <div className="font-bold truncate w-full text-center">{title}</div>
                <small className="w-full pr-2 text-gray-500 text-center">{created_at}</small>
            </div>
        )
    }

    if (!notes) return <div>Loading...</div>;

    return (
        <>
            <div className="flex flex-row">
                <Sidebar/>
                <div className="flex flex-col flex-1">

                    <Topbar/>
                    <main className="mt-2 flex-1 overflow-auto bg-white">
                        <div className={`bg-white h-[100%] mx-auto grid 
                        ${isOpen ? "grid-cols-1" : "grid-cols-2"} pt-5
                        md:grid-cols-3 lg:grid-cols-4 
                        content-start`}>
                            {
                                notes.map((note) => (
                                    <Card key={note.hash_id} onClick={() => gotoNote(note.hash_id)}
                                          title={note.title || "제목 없음"}
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
                </div>
            </div>
        </>
    )
}