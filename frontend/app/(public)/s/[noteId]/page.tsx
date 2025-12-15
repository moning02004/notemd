"use client"

import {useEffect, useState} from "react";
import {FiX} from "react-icons/fi";
import {notFound, useParams} from "next/navigation";
import {apiRequest} from "@/lib/api";
import {MilkdownProvider} from "@milkdown/react";

import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";
import MarkdownEditor from "@/components/editor";
import {LoadingPage} from "@/components/loading";
import {useAuthStore} from "@/store/auth";


export default function Page() {
    const {token} = useAuthStore.getState();

    const [loadingStatus, setLoadingStatus] = useState("loading")
    const [isOpenedSetting, setOpenedSetting] = useState(false)
    const [isPublic, setIsPublic] = useState(false);
    const [isReadonly, setIsReadonly] = useState(!token);
    const {noteId} = useParams();

    const [title, setTitle] = useState<string | null>(null);
    const [content, setContent] = useState<string | null>(null);
    const [statusText, setStatusText] = useState<string>("");

    const handleContent = (values: {
        title: string | null;
        content: string | null;
    }) => {
        setStatusText("동기화 중")
        setTitle(values.title || "")
        setContent(values.content || "")
    }

    useEffect(() => {
        if (!token || loadingStatus == "loading") return

        const timer = setTimeout(async () => {
            await apiRequest.patch(`/notes/${noteId}`, {
                body: JSON.stringify({
                    title: title,
                    content: content,
                    is_public: isPublic,
                })
            }).then(() => {
                setStatusText("동기화 완료")
            }).catch(error => {
                setStatusText("서버 연결이 원활하지 않음")
            })
        }, 2000);

        return () => clearTimeout(timer);
    }, [title, content, isPublic, noteId, token, loadingStatus]);

    useEffect(() => {
        const fetchData = async () => {
            await apiRequest.get(`/notes/${noteId}`)
                .then(response => {
                    setTitle(response.title || "")
                    setContent(response.content || "")
                    setIsPublic(response.is_public)
                })
                .catch((e) => {
                    setLoadingStatus("404")
                })
        }
        fetchData()
    }, []);

    if (loadingStatus == "404") return notFound()
    if (title == null) return <LoadingPage/>

    return (
        <>
            <div className="flex w-full h-[100%]" onClick={() => {
                setIsReadonly(!token)
                setLoadingStatus("loaded")
            }}>
                <MilkdownProvider>
                    <MarkdownEditor onChange={handleContent}
                                    onClickMenu={() => setOpenedSetting(true)}
                                    isReadonly={isReadonly}
                                    paramsTitle={title}
                                    paramsContent={content}
                                    statusText={statusText}
                    />
                </MilkdownProvider>
            </div>

            <div className={`w-[25vw] bg-white fixed right-0 top-0 h-screen border-l border-[#ededed] shadow-xl
          transform transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
          ${isOpenedSetting ? "translate-x-0" : "translate-x-full"}`}>
                <div className="flex flex-col p-5 w-full">
                    <div className="flex flex-row justify-between mb-5">
                        <h5 className="font-bold">노트 설정</h5>
                        <button onClick={() => setOpenedSetting(false)}
                                className="my-auto text-center hover:bg-gray-100 cursor-pointer"><FiX size={22}/>
                        </button>
                    </div>
                </div>
                <div className="flex flex-row justify-between p-5 border-b border-[#ededed]">
                    <div className="font-bold px-2">외부 공개</div>

                    <div className="px-2 cursor-pointer select-none"
                         onClick={() => {
                             setStatusText("동기화 중")
                             setIsPublic(!isPublic)
                         }}>
                        <div className={`w-10 h-5 flex items-center rounded-full p-1 transition-all duration-300 
                            ${isPublic ? "bg-blue-500" : "bg-gray-300"}`}>
                            <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-all duration-300 
                                ${isPublic ? "translate-x-4" : "translate-x-0"}`}>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
}
