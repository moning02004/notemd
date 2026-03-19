"use client"

import {useEffect, useState} from "react";
import {useAuthStore} from "@/store/auth";
import {NoteCard} from "@/types/note";
import {apiRequest} from "@/lib/api";
import {useRouter} from "next/navigation";
import {useMenuStore} from "@/store/menu";
import {Card} from "@/components/card";
import {LoadingPage} from "@/components/loading";

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
                const res = await apiRequest.get<Array<NoteCard>>("/notes?is_deleted=1");
                setNotes(res);
            } catch (error) {
                alert("서버를 확인해주세요.");
            }
        };
        fetchData()
    }, []);

    if (!notes) return <LoadingPage/>;

    return (
        <>
            <main className="bg-white flex-1 overflow-auto ">
                <div className={` h-[100%] mx-auto grid 
                        ${isOpen ? "grid-cols-1" : "grid-cols-2"} pt-5
                        md:grid-cols-3 lg:grid-cols-4 
                        content-start`}>
                    {
                        notes.map((note) => (
                            <Card key={note.hash_id}
                                  hashId={note.hash_id}
                                  title={note.title || "제목 없음"}
                                  content={note.content}
                                  isPublic={note.is_public}
                                  created_at={note.created_at}
                                  deletedMenu={true}
                            />
                        ))
                    }
                </div>
            </main>
        </>
    )
}