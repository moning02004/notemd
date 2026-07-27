"use client"

import {useEffect, useState} from "react";
import {notFound, useParams} from "next/navigation";
import {apiRequest} from "@/lib/api";

import {MarkdownEditor} from "@/components/editor";
import {LoadingPage} from "@/components/loading";
import {useAuthStore} from "@/store/auth";
import {NoteSettings} from "@/components/note_settings";
import {useNotePatch} from "@/hooks/useNotePatch";
import {NoteDetailResponse} from "@/types/note";
import {NoteWorkspace} from "@/types/workspace";

// Tailwind는 소스에 리터럴로 존재하는 클래스명만 인식하므로 `w-[${n}%]`처럼 동적으로
// 조합하면 CSS가 생성되지 않는다. note_settings.tsx의 <select> 옵션과 값을 맞춰야 함.
const EDITOR_WIDTH_CLASSES: Record<number, string> = {
    100: "w-[100%]",
    70: "w-[70%]",
    50: "w-[50%]",
}

export default function Page() {
    const {token, userHash} = useAuthStore.getState()

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
    const [selectedWorkspaces, setSelectedWorkspaces] = useState<NoteWorkspace[]>([]);
    const [editorWidth, setEditorWidth] = useState(100)

    const patchNote = useNotePatch(setStatusType)

    useEffect(() => {
        if (!isOwner || loadingStatus == "loading") return

        setStatusType("loading")
        const timer = setTimeout(() => {
            patchNote(noteId, {title, content})
        }, 300);

        return () => clearTimeout(timer);
    }, [title, content, noteId, token]);

    useEffect(() => {
        if (!isOwner || loadingStatus == "loading") return

        patchNote(noteId, {
            is_public: isPublic,
            is_protected: isProtected,
            tags: selectedTags,
            workspaces: selectedWorkspaces.map(x => x.hashId)
        });
    }, [isPublic, isProtected, selectedTags, selectedWorkspaces]);

    useEffect(() => {
        const fetchData = async () => {
            await apiRequest.get<NoteDetailResponse>(`/notes/${noteId}`)
                .then(response => {
                    setTitle(response.title || "")
                    setContent(response.content || "")
                    setIsPublic(response.is_public)
                    setIsProtected(response.is_protected)
                    setSelectedTags(response.tags)
                    setSelectedWorkspaces(response.workspaces)
                    setIsOwner(response.user_hash === userHash)
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
        <div className="relative w-full h-screen">
            <div className="flex w-full h-full"
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
                                widthClass={EDITOR_WIDTH_CLASSES[editorWidth] ?? EDITOR_WIDTH_CLASSES[100]}
                />
            </div>

            {isOpenedSetting &&
                <div
                    className="fixed inset-0 bg-foreground/25 backdrop-blur-[2px] z-10 transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    onClick={() => setOpenedSetting(false)}
                />
            }

            {token &&
                <NoteSettings noteId={noteId}
                              setIsPublic={setIsPublic}
                              setOpenedSetting={setOpenedSetting}
                              setStatusType={setStatusType}
                              setIsProtected={setIsProtected}
                              setSelectedTags={setSelectedTags}
                              selectedWorkspaces={selectedWorkspaces}
                              setSelectedWorkspaces={setSelectedWorkspaces}
                              setEditorWidth={setEditorWidth}

                              setTitle={setTitle}
                              setContent={setContent}
                              currentTitle={title}
                              currentContent={content}
                              afterApplyTemplate={() => setOpenedSetting(false)}

                              selectedTags={selectedTags}
                              editorWidth={editorWidth}
                              isProtected={isProtected}
                              isPublic={isPublic}
                              isOpenedSetting={isOpenedSetting}/>
            }
        </div>
    );
}