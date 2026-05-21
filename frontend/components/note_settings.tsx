import {FiCopy, FiLayout, FiX} from "react-icons/fi";
import {apiRequest} from "@/lib/api";
import toast from "react-hot-toast";
import NoteTagInput from "@/components/note_tag_input";
import {TemplateManageModal} from "@/components/template/manage_modal";
import {Dispatch, SetStateAction, useState} from "react";

interface SettingsProps {
    noteId: string,
    setOpenedSetting: (flag: boolean) => void;
    setStatusType: (flag: string) => void;
    setIsPublic: (flag: boolean) => void;
    setIsProtected: (flag: boolean) => void;
    setSelectedTags: (tag: string[]) => void;

    selectedTags: string[];
    isProtected: boolean;
    isPublic: boolean;
    isOpenedSetting: boolean;

    setTitle: Dispatch<SetStateAction<string>>;
    setContent: Dispatch<SetStateAction<string>>;
    currentTitle: string;
    currentContent: string;
    afterApplyTemplate: () => void
}

export const NoteSettings = ({
                                 noteId,
                                 setOpenedSetting,
                                 setStatusType,
                                 setIsPublic,
                                 setIsProtected,
                                 setSelectedTags,

                                 selectedTags,
                                 isProtected,
                                 isPublic,
                                 isOpenedSetting,

                                 currentTitle,
                                 currentContent,
                                 afterApplyTemplate,
                                 setTitle,
                                 setContent,
                             }: SettingsProps) => {
    const [templateModalOpen, setTemplateModalOpen] = useState(false)

    const deleteNote = async () => {
        await apiRequest.delete(`/notes/${noteId}`).then(() => {
            toast.success("노트가 삭제되었습니다.")
            window.location.href = "/"
        })
    }

    return (
        <>
            <div className={`w-full md:w-[50vw] sm:w-[7vw] lg:w-[25vw] bg-white fixed flex flex-col right-0 top-0 h-screen border-l border-[#ededed] shadow-xl
                transform transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] z-11
                ${isOpenedSetting ? "translate-x-0" : "translate-x-full"}`}>
                <div className="flex flex-col p-5 w-full">
                    <div className="flex flex-row justify-between mb-5">
                        <h5 className="font-bold">노트 설정</h5>
                        <button onClick={() => setOpenedSetting(false)}
                                className="my-auto text-center hover:bg-gray-100 cursor-pointer">
                            <FiX size={22}/>
                        </button>
                    </div>
                </div>

                {/* 템플릿 관리 */}
                <div className="p-5 border-y border-[#ededed]">
                    <button
                        onClick={() => setTemplateModalOpen(true)}
                        className="w-full flex cursor-pointer items-center justify-center gap-2 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <FiLayout size={16}/>
                        템플릿 관리
                    </button>
                </div>

                {/* 외부 공개 */}
                <div className="flex flex-row justify-between p-5 border-b border-[#ededed]">
                    <div className="flex font-bold px-2 gap-3">
                        <div className="my-auto">외부 공개</div>
                        {isPublic && (
                            <button
                                className="my-auto cursor-pointer"
                                onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/s/${noteId}`)
                                    toast('노트 링크가 복사되었습니다.');
                                }}
                            >
                                <FiCopy size={22}/>
                            </button>
                        )}
                    </div>
                    <div className="px-2 cursor-pointer select-none my-auto"
                         onClick={() => {
                             setStatusType("loading")
                             setIsPublic(!isPublic)
                         }}>
                        <div className={`w-10 h-5 flex items-center rounded-full p-1 transition-all duration-300
                                ${isPublic ? "bg-blue-500" : "bg-gray-300"}`}>
                            <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-all duration-300
                                    ${isPublic ? "translate-x-4" : "translate-x-0"}`}/>
                        </div>
                    </div>
                </div>

                {/* 노트 보호 */}
                <div className="flex flex-row justify-between p-5 border-b border-[#ededed]">
                    <div className="font-bold px-2">노트 보호</div>
                    <div className="px-2 cursor-pointer select-none"
                         onClick={() => {
                             setStatusType("loading")
                             setIsProtected(!isProtected)
                         }}>
                        <div className={`w-10 h-5 flex items-center rounded-full p-1 transition-all duration-300
                                ${isProtected ? "bg-blue-500" : "bg-gray-300"}`}>
                            <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-all duration-300
                                    ${isProtected ? "translate-x-4" : "translate-x-0"}`}/>
                        </div>
                    </div>
                </div>

                {/* 태그 */}
                <NoteTagInput selectedTags={selectedTags} setSelectedTags={setSelectedTags}/>

                {/* 회원 공개 */}
                {/*<NoteTagInput selectedTags={selectedTags} setSelectedTags={setSelectedTags}/>*/}

                {/* 삭제 */}
                {!isProtected && (
                    <div className="mt-auto flex flex-row justify-between p-5 border-b border-[#ededed]">
                        <button
                            className="w-full bg-[#fa0000] py-2 rounded cursor-pointer hover:bg-[#ff2222] text-white"
                            onClick={deleteNote}
                        >
                            삭제
                        </button>
                    </div>
                )}
            </div>

            <TemplateManageModal
                isOpen={templateModalOpen}
                onClose={() => {
                    setTemplateModalOpen(false)
                }}
                afterApplyTemplate={afterApplyTemplate}
                currentTitle={currentTitle}
                currentContent={currentContent}

                setTitle={setTitle}
                setContent={setContent}
            />
        </>
    )
}