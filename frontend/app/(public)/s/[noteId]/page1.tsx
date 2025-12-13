"use client"

import dynamic from "next/dynamic";
import {useEffect, useState} from "react";
import {FiX} from "react-icons/fi";
import {PartialBlock} from "@blocknote/core";
import {useParams} from "next/navigation";
import {apiRequest} from "@/lib/api";


const Editor = dynamic(() => import("@/components/editor"), {
    ssr: false,
});

export default function Page() {
    const [isOpenedSetting, setOpenedSetting] = useState(false)
    const [isPublic, setIsPublic] = useState(false);
    const [editable, setEditable] = useState(false);
    const {noteId} = useParams();

    const [title, setTitle] = useState<string | null>(null);
    const [contents, setContents] = useState([] as PartialBlock[]);

    const handleContent = (values: {
        title: string | null;
        content: PartialBlock[]
    }) => {
        setTitle(values.title)
        setContents(values.content)
    }

    useEffect(() => {
        if (!editable) return;

        const timer = setTimeout(async () => {
            const data = await apiRequest.patch(`/notes/${noteId}`, {
                body: JSON.stringify({
                    title: title,
                    content: contents,
                    is_public: false,
                })
            }).catch(error => {
                console.log(error)
            })
            console.log(data)
        }, 2000);

        return () => clearTimeout(timer);
    }, [title, contents]);

    useEffect(() => {
        const fetchData = async () => {
            const data = await apiRequest.get(`/notes/${noteId}`)
            setTitle(data.title || "")
            setContents(data.content && JSON.parse(data.content))
        }
        fetchData()
    }, []);

    if (title === null) return "..."

    return (
        <>
            <div className="flex w-full h-[100%]" onClick={() => setEditable(true)}>
                <Editor onChange={handleContent}
                        onClickMenu={() => setOpenedSetting(true)}
                        isEditable={editable}
                        paramsTitle={title}
                        paramsContent={contents}
                />
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
                         onClick={() => setIsPublic(!isPublic)}>
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
