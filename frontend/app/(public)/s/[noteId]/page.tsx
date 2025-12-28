"use client"

import {useEffect, useState} from "react";
import {notFound, useParams} from "next/navigation";
import {apiRequest} from "@/lib/api";
import {MilkdownProvider} from "@milkdown/react";

import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";
import {MarkdownEditor} from "@/components/editor";
import {LoadingPage} from "@/components/loading";
import {useAuthStore} from "@/store/auth";
import {NoteSettings} from "@/components/note_settings";

interface NoteResponse {
    title: string | null
    content: string | null
    is_public: boolean
    is_protected: boolean
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

    const [title, setTitle] = useState<string | null>(null);
    const [content, setContent] = useState<string>("");
    const [statusText, setStatusText] = useState<string>("");

    useEffect(() => {
        if (!isOwner || loadingStatus == "loading") return

        setStatusText("동기화 중")
        const timer = setTimeout(async () => {
            await apiRequest.patch(`/notes/${noteId}`, {
                body: JSON.stringify({
                    title: title,
                    content: content,
                })
            }).then(() => {
                setStatusText("동기화 완료")
            }).catch(() => {
                setStatusText("서버 연결이 원활하지 않음")
            })
        }, 2000);

        return () => clearTimeout(timer);
    }, [title, content, noteId, token]);

    useEffect(() => {
        if (!isOwner || loadingStatus == "loading") return

        const patchRequest = async (data: Partial<{
            is_public: boolean
            is_protected: boolean
        }>) => {
            await apiRequest.patch(`/notes/${noteId}`, {
                body: JSON.stringify(data)
            }).then(() => {
                setStatusText("동기화 완료")
            }).catch(() => {
                setStatusText("서버 연결이 원활하지 않음")
            })
        }

        patchRequest({is_public: isPublic, is_protected: isProtected});
    }, [isPublic, isProtected]);

    useEffect(() => {
        const fetchData = async () => {
            await apiRequest.get<NoteResponse>(`/notes/${noteId}`)
                .then(response => {
                    setTitle(response.title || "")
                    setContent(response.content || "")
                    setIsPublic(response.is_public)
                    setIsProtected(response.is_protected)
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
                <MilkdownProvider>
                    <MarkdownEditor onClickMenu={() => setOpenedSetting(true)}
                                    isReadonly={isProtected || isReadonly}
                                    paramsNoteId={noteId}

                                    isOwner={isOwner}
                                    title={title}
                                    content={content}
                                    setTitle={setTitle}
                                    setContent={setContent}
                                    statusText={statusText}
                    />
                </MilkdownProvider>
            </div>

            <NoteSettings noteId={noteId}
                          setIsPublic={setIsPublic}
                          setOpenedSetting={setOpenedSetting}
                          setStatusText={setStatusText}
                          setIsProtected={setIsProtected}

                          isProtected={isProtected}
                          isPublic={isPublic}
                          isOpenedSetting={isOpenedSetting}/>
        </>
    );
}
