import {FiCopy, FiLayout, FiX} from "react-icons/fi";
import {apiRequest} from "@/lib/api";
import toast from "react-hot-toast";
import NoteTagInput from "@/components/note_tag_input";
import {TemplateManageModal} from "@/components/template/manage_modal";
import {Dispatch, SetStateAction, useState} from "react";
import {FaHistory} from "react-icons/fa";
import {NoteSnapshotManageModal} from "@/components/note_snapshot_manage_modal";

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
    const [noteSnapshotModalOpen, setNoteSnapshotModalOpen] = useState(false)

    const deleteNote = async () => {
        await apiRequest.delete(`/notes/${noteId}`).then(() => {
            toast.success("노트가 삭제되었습니다.")
            window.location.href = "/"
        })
    }

    return (
        <>
            <div className={`w-full md:w-[50vw] sm:w-[7vw] lg:w-[25vw] bg-white fixed flex flex-col right-0 top-0 h-screen border-l border-[#ededed] shadow-xl overflow-y-auto
                transform transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] z-11
                ${isOpenedSetting ? "translate-x-0" : "translate-x-full"}`}>

                <div className="flex flex-col px-7 pt-7 h-screen">
                    <div className="flex flex-row justify-between items-center mb-7">
                        <h5 className="text-lg font-medium">노트 설정</h5>
                        <button onClick={() => setOpenedSetting(false)}
                                className="text-gray-500 hover:text-gray-700 cursor-pointer">
                            <FiX size={20}/>
                        </button>
                    </div>

                    {/* 공유 및 보안 */}
                    <p className="text-sm font-medium text-blue-600 tracking-wide mb-3">공유 및 보안</p>

                    <div className="flex flex-row justify-between items-center mb-4">
                        <div>
                            <p className="text-base font-medium">외부 공개</p>
                            <p className="text-sm text-gray-400 mt-1">
                                링크가 있는 누구나 볼 수 있어요.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {isPublic && (
                                <button
                                    className="text-gray-400 hover:text-gray-600 cursor-pointer"
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/s/${noteId}`)
                                        toast('노트 링크가 복사되었습니다.');
                                    }}
                                >
                                    <FiCopy size={16}/>
                                </button>
                            )}
                            <div className="cursor-pointer select-none"
                                 onClick={() => {
                                     setStatusType("loading")
                                     setIsPublic(!isPublic)
                                 }}>
                                <div className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-all duration-300
                                        ${isPublic ? "bg-blue-500" : "bg-gray-300"}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-all duration-300
                                            ${isPublic ? "translate-x-4" : "translate-x-0"}`}/>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-row justify-between items-center mb-7">
                        <div>
                            <p className="text-base font-medium">노트 보호</p>
                            <p className="text-sm text-gray-400 mt-1">
                                비밀번호로 접근을 제한해요.
                            </p>
                        </div>
                        <div className="cursor-pointer select-none"
                             onClick={() => {
                                 setStatusType("loading")
                                 setIsProtected(!isProtected)
                             }}>
                            <div className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-all duration-300
                                    ${isProtected ? "bg-blue-500" : "bg-gray-300"}`}>
                                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-all duration-300
                                        ${isProtected ? "translate-x-4" : "translate-x-0"}`}/>
                            </div>
                        </div>
                    </div>

                    {/* 분류 */}
                    <p className="text-sm font-medium text-blue-600 tracking-wide mb-3">분류</p>
                    <NoteTagInput selectedTags={selectedTags} setSelectedTags={setSelectedTags}/>

                    {/* 관리 */}
                    <p className="text-sm font-medium text-blue-600 tracking-wide mb-3">관리</p>
                    <div className="flex flex-col gap-2.5 mb-7">
                        <button
                            onClick={() => setTemplateModalOpen(true)}
                            className="w-full flex cursor-pointer items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-base text-gray-700 hover:bg-gray-50 transition-colors text-left"
                        >
                            <FiLayout size={16}/>
                            템플릿 관리
                        </button>

                        <button
                            onClick={() => setNoteSnapshotModalOpen(true)}
                            className="w-full flex cursor-pointer items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-base text-gray-700 hover:bg-gray-50 transition-colors text-left"
                        >
                            <FaHistory size={16}/>
                            스냅샷 목록
                        </button>
                    </div>

                    {/* 삭제 */}
                    {!isProtected && (
                        <div className="mt-auto pb-7">
                            <button
                                className="w-full bg-red-50 text-red-600 py-2.5 rounded-lg cursor-pointer hover:bg-red-100 transition-colors text-base font-medium"
                                onClick={deleteNote}
                            >
                                노트 삭제
                            </button>
                        </div>
                    )}
                </div>
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

            <NoteSnapshotManageModal
                noteHash={noteId}
                isOpen={noteSnapshotModalOpen}
                onClose={() => {
                    setNoteSnapshotModalOpen(false)
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