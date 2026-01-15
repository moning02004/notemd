"use client"

import {useEffect, useState} from "react";
import {useAuthStore} from "@/store/auth";
import {FiPlus} from "react-icons/fi";
import {NoteCard} from "@/types/note";
import {apiRequest} from "@/lib/api";
import {useRouter} from "next/navigation";
import {useMenuStore} from "@/store/menu";
import {Card} from "@/components/card";
import {gotoNote} from "@/lib/note";
import {LoadingPage} from "@/components/loading";
import {IoGridOutline, IoList} from "react-icons/io5";

export default function Page() {
    const router = useRouter()
    const {token} = useAuthStore.getState()
    const [notes, setNotes] = useState(Array<NoteCard>)
    const isOpen = useMenuStore((state) => state.isOpen)

    useEffect(() => {
        if (!token) {
            router.replace("/login")
            return
        }

        const fetchData = async () => {
            try {
                const res = await apiRequest.get<Array<NoteCard>>("/notes");
                setNotes(res);
            } catch (error) {
                alert("서버를 확인해주세요.");
            }
        };
        fetchData()
    }, []);

    if (!notes) return <LoadingPage />;

    return (
        <>
            <main className="bg-white flex-1 overflow-auto ">
                {/*<div className="flex p-2 border-b border-[#dedede] text-gray-600 gap-3">*/}
                    {/*<div className="my-auto">총: {notes.length}개</div>*/}
                    {/*<div className="ml-auto my-auto"><IoGridOutline size={22} /></div>*/}
                    {/*<div className="my-auto"><IoList size={22} /></div>*/}
                {/*</div>*/}

                <div className={` h-[100%] mx-auto grid 
                        ${isOpen ? "grid-cols-1" : "grid-cols-2"} pt-5
                        md:grid-cols-3 lg:grid-cols-4 
                        content-start`}>
                    {
                        notes.map((note) => (
                            <Card key={note.hash_id}
                                  hashId={note.hash_id}
                                  onClick={() => gotoNote({id: note.hash_id, router: router})}
                                  title={note.title || "제목 없음"}
                                  content={note.content}
                                  isPublic={note.is_public}
                                  isProtected={note.is_protected}
                                  created_at={note.created_at}
                                  noteMenu={true}
                                  width={isOpen ? "w-[50vw] md:w-[25vw] lg:w-[20vw]" : "w-[37vw] md:w-[29vw] lg:w-[21vw]"}
                            />
                        ))
                    }
                </div>
            </main>
            <div className="fixed right-0 bottom-[10vh] md:bottom-0 border m-6 mr-6 p-4 bg-white rounded-full shadow-lg
                        cursor-pointer hover:bg-gray-100 transition-all duration-200 hover:shadow-xl"
                 onClick={() => gotoNote({id: null, router: router})}>
                <FiPlus size={22}/>
            </div>
        </>
    )
}