"use client"

import {useEffect, useState} from "react";
import {notFound, useParams} from "next/navigation";
import {apiRequest} from "@/lib/api";

import {MarkdownEditor} from "@/components/editor";
import {LoadingPage} from "@/components/loading";
import {useAuthStore} from "@/store/auth";
import {NoteSettings} from "@/components/note_settings";

interface NoteResponse {
    title: string | null
    content: string | null
    is_public: boolean
    is_protected: boolean
    tags: string[]
    user_id: number
}

export default function Page() {
    const {token, userId} = useAuthStore.getState();

    const [loadingStatus, setLoadingStatus] = useState("loading")
    const [isOpenedSetting, setOpenedSetting] = useState(false)
    const [isPublic, setIsPublic] = useState<boolean>(false);
    const [isProtected, setIsProtected] = useState<boolean>(false);
    const [isReadonly, setIsReadonly] = useState<boolean>(!token);
    const [isOwner, setIsOwner] = useState(false);
    const {noteId} = useParams() as { noteId: string };
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    const [title, setTitle] = useState<string | null>(null);
    const [content, setContent] = useState<string>("");
    const [statusType, setStatusType] = useState<string>("");

    useEffect(() => {
        if (!isOwner || loadingStatus == "loading") return

        setStatusType("loading")
        const timer = setTimeout(async () => {
            await apiRequest.patch(`/notes/${noteId}`, {
                body: JSON.stringify({
                    title: title,
                    content: content,
                })
            }).then(() => {
                setStatusType("complete")
            }).catch(() => {
                setStatusType("warning")
            })
        }, 300);

        return () => clearTimeout(timer);
    }, [title, content, noteId, token]);

    useEffect(() => {
        if (!isOwner || loadingStatus == "loading") return

        const patchRequest = async (data: Partial<{
            is_public: boolean
            is_protected: boolean
            tags: string[]
        }>) => {
            await apiRequest.patch(`/notes/${noteId}`, {
                body: JSON.stringify(data)
            }).then(() => {
                setStatusType("complete")
            }).catch(() => {
                setStatusType("warning")
            })
        }

        patchRequest({is_public: isPublic, is_protected: isProtected, tags: selectedTags});
    }, [isPublic, isProtected, selectedTags]);

    useEffect(() => {
        const fetchData = async () => {
            await apiRequest.get<NoteResponse>(`/notes/${noteId}`)
                .then(response => {
                    setTitle(response.title || "")
                    setContent(response.content || "")
                    setIsPublic(response.is_public)
                    setIsProtected(response.is_protected)
                    setSelectedTags(response.tags)
                    setIsOwner(response.user_id === userId)
                })
                .catch(() => {
                    setLoadingStatus("404")
                })
        }
        fetchData()
    }, []);

    if (loadingStatus == "404") return notFound()
    if (title == null) return <LoadingPage/>

    return (
        <>
            <div className="flex w-full h-[100%]"
                 onClick={() => {
                     setIsReadonly(!token)
                     setLoadingStatus("loaded")
                 }}>
                <MarkdownEditor setOpenedSetting={setOpenedSetting}
                                isReadonly={isProtected || isReadonly}
                                paramsNoteId={noteId}

                                isOwner={isOwner}
                                title={title}
                                content={content}
                                setTitle={setTitle}
                                setContent={setContent}
                                statusType={statusType}
                />
            </div>
            {token &&
                <NoteSettings noteId={noteId}
                              setIsPublic={setIsPublic}
                              setOpenedSetting={setOpenedSetting}
                              setStatusType={setStatusType}
                              setIsProtected={setIsProtected}
                              setSelectedTags={setSelectedTags}

                              setTitle={setTitle}
                              setContent={setContent}
                              currentTitle={title}
                              currentContent={content}
                              afterApplyTemplate={() => setOpenedSetting(false)}

                              selectedTags={selectedTags}
                              isProtected={isProtected}
                              isPublic={isPublic}
                              isOpenedSetting={isOpenedSetting}/>
            }

        </>
    );
}
