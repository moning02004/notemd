"use client"

import {Suspense, useEffect, useState} from "react";
import {useRouter, useSearchParams} from "next/navigation";
import {FiPlus} from "react-icons/fi";
import {useAuthStore} from "@/store/auth";
import {NoteCard, Tag} from "@/types/note";
import {apiRequest} from "@/lib/api";
import {gotoNote} from "@/lib/note";
import {Note} from "@/components/note";
import {LoadingPage} from "@/components/loading";
import NoteFilterBar from "@/components/note_filterbar";

function NoteListContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const {token} = useAuthStore.getState()

    const [notes, setNotes] = useState<NoteCard[]>([])
    const [tags, setTags] = useState<Tag[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (!token) {
            router.replace("/login")
            return
        }
        fetchTagData()
    }, [])

    useEffect(() => {
        if (!token) return
        fetchNoteData(searchParams.toString() ? `?${searchParams.toString()}` : "")
    }, [searchParams])

    const fetchNoteData = async (params = "") => {
        setIsLoading(true)
        const data = await apiRequest.get<NoteCard[]>(`/notes${params}`)
        setNotes(data)
        setIsLoading(false)
    }

    const fetchTagData = async () => {
        const data = await apiRequest.get<Tag[]>("/tags")
        setTags(data)
    }

    if (!token) return <LoadingPage/>

    return (
        <>
            <NoteFilterBar tags={tags}/>

            <div className="min-h-full pt-5 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5">
                {isLoading
                    ? <SkeletonCards/>
                    : notes.map(note => (
                        <Note
                            key={note.hash_id}
                            hashId={note.hash_id}
                            onClick={() => gotoNote({id: note.hash_id, router})}
                            title={note.title || "제목 없음"}
                            content={note.content}
                            ownerName={note.owner_name}
                            isPublic={note.is_public}
                            isProtected={note.is_protected}
                            created_at={note.created_at}
                            noteMenu
                        />
                    ))
                }
            </div>

            <button
                onClick={() => gotoNote({id: null, router})}
                className="fixed right-0 bottom-[9vh] m-6 p-4 bg-white border rounded-full shadow-lg
                           hover:bg-gray-100 hover:shadow-xl transition-all duration-200"
            >
                <FiPlus size={22}/>
            </button>
        </>
    )
}

function SkeletonCards() {
    return (
        <>
            {Array.from({length: 8}).map((_, i) => (
                <div key={i} className="mx-3 rounded w-[90%] h-[7rem] md:h-[17rem] bg-gray-200 animate-pulse"/>
            ))}
        </>
    )
}

export default function Page() {
    return (
        <Suspense fallback={<LoadingPage/>}>
            <NoteListContent/>
        </Suspense>
    )
}