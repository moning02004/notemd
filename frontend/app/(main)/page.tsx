"use client"

import {Suspense, useEffect, useState} from "react";
import {useAuthStore} from "@/store/auth";
import {FiPlus} from "react-icons/fi";
import {NoteCard, Tag} from "@/types/note";
import {apiRequest} from "@/lib/api";
import {useRouter} from "next/navigation";
import {Card} from "@/components/card";
import {gotoNote} from "@/lib/note";
import {LoadingPage} from "@/components/loading";
import NoteFilterBar from "@/components/note_filterbar";

export default function Page() {
    const router = useRouter()
    const {token} = useAuthStore.getState()
    const [notes, setNotes] = useState(Array<NoteCard>)
    const [tags, setTags] = useState(Array<Tag>)

    useEffect(() => {
        if (!token) {
            router.replace("/login")
            return
        }

        const fetchData = async () => {
            const noteData = await apiRequest.get<Array<NoteCard>>("/notes");
            setNotes(noteData);

            const tagData = await apiRequest.get<Array<Tag>>("/tags");
            setTags(tagData);
        };

        fetchData()
    }, []);

    if (!notes) return <LoadingPage/>;

    return (
        <Suspense fallback={<div>로딩 중...</div>}>
            <NoteFilterBar tags={tags}/>
            <div className={`min-h-[100%] pt-5 grid grid-cols-2 lg:grid-cols-4 md:grid-cols-3`}>
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
                        />
                    ))
                }
            </div>
            <div className="fixed right-0 bottom-[9vh] border m-6 mr-6 p-4 bg-white rounded-full shadow-lg
                        cursor-pointer hover:bg-gray-100 transition-all duration-200 hover:shadow-xl"
                 onClick={() => gotoNote({id: null, router: router})}>
                <FiPlus size={22}/>
            </div>
        </Suspense>
    )
}