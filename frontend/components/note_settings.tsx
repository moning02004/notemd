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
            <div className={`w-full md:w-[420px] sm:w-[7vw] lg:w-[400px] bg-[#FAFAF7] fixed flex flex-col right-0 top-0 h-screen border-l border-[#E8E5DD] shadow-2xl overflow-y-auto
                transform transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] z-20
                ${isOpenedSetting ? "translate-x-0" : "translate-x-full"}`}>

                <div className="flex flex-col h-full">
                    {/* 헤더 */}
                    <div className="flex flex-row justify-between items-center p-3 bg-white/80 backdrop-blur border-b border-[#E8E5DD] sticky top-0 z-10">
                        <div className="text-lg font-serif text-[#23241F]">노트 설정</div>
                        <button onClick={() => setOpenedSetting(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full text-[#6B6A63] hover:bg-[#E8E5DD]/60 hover:text-[#23241F] transition-colors duration-200 cursor-pointer">
                            <FiX size={18}/>
                        </button>
                    </div>

                    <div className="flex flex-col gap-4 px-5 py-5 flex-1">

                        {/* 공유 및 보안 */}
                        <div className="bg-white rounded-2xl border border-[#E8E5DD] p-4">
                            <p className="text-[11px] font-medium text-[#6B6A63] tracking-widest uppercase mb-3">공유 및 보안</p>

                            <div className="flex flex-row justify-between items-center py-2">
                                <div className="pr-3">
                                    <p className="text-[15px] font-medium text-[#23241F]">외부 공개</p>
                                    <p className="text-[13px] text-[#6B6A63] mt-0.5">
                                        링크가 있는 누구나 볼 수 있어요.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {isPublic && (
                                        <button
                                            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#EAF1EC] text-[#3F6C51] hover:bg-[#DCEAE2] transition-colors duration-200 cursor-pointer"
                                            onClick={() => {
                                                navigator.clipboard.writeText(`${window.location.origin}/s/${noteId}`)
                                                toast('노트 링크가 복사되었습니다.');
                                            }}
                                        >
                                            <FiCopy size={14}/>
                                        </button>
                                    )}
                                    <div className="cursor-pointer select-none"
                                         onClick={() => {
                                             setStatusType("loading")
                                             setIsPublic(!isPublic)
                                         }}>
                                        <div className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors duration-300
                                                ${isPublic ? "bg-[#3F6C51]" : "bg-[#E8E5DD]"}`}>
                                            <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-300
                                                    ${isPublic ? "translate-x-5" : "translate-x-0"}`}/>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-[#E8E5DD] my-1"/>

                            <div className="flex flex-row justify-between items-center py-2">
                                <div className="pr-3">
                                    <p className="text-[15px] font-medium text-[#23241F]">노트 보호</p>
                                    <p className="text-[13px] text-[#6B6A63] mt-0.5">
                                        비밀번호로 접근을 제한해요.
                                    </p>
                                </div>
                                <div className="cursor-pointer select-none shrink-0"
                                     onClick={() => {
                                         setStatusType("loading")
                                         setIsProtected(!isProtected)
                                     }}>
                                    <div className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors duration-300
                                            ${isProtected ? "bg-[#B45309]" : "bg-[#E8E5DD]"}`}>
                                        <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-300
                                                ${isProtected ? "translate-x-5" : "translate-x-0"}`}/>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 분류 */}
                        <div className="bg-white rounded-2xl border border-[#E8E5DD] p-4">
                            <p className="text-[11px] font-medium text-[#6B6A63] tracking-widest uppercase mb-3">분류</p>
                            <NoteTagInput selectedTags={selectedTags} setSelectedTags={setSelectedTags}/>
                        </div>

                        {/* 관리 */}
                        <div className="bg-white rounded-2xl border border-[#E8E5DD] p-4">
                            <p className="text-[11px] font-medium text-[#6B6A63] tracking-widest uppercase mb-3">관리</p>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setTemplateModalOpen(true)}
                                    className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl border border-[#E8E5DD] text-[#23241F] hover:border-[#3F6C51] hover:bg-[#EAF1EC] transition-colors duration-200 cursor-pointer"
                                >
                                    <FiLayout size={18} className="text-[#3F6C51]"/>
                                    <span className="text-[13px] font-medium">템플릿 관리</span>
                                </button>

                                <button
                                    onClick={() => setNoteSnapshotModalOpen(true)}
                                    className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl border border-[#E8E5DD] text-[#23241F] hover:border-[#3F6C51] hover:bg-[#EAF1EC] transition-colors duration-200 cursor-pointer"
                                >
                                    <FaHistory size={18} className="text-[#3F6C51]"/>
                                    <span className="text-[13px] font-medium">스냅샷 목록</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 삭제 */}
                    {!isProtected && (
                        <div className="px-5 pb-6 pt-3 border-t border-[#E8E5DD]">
                            <button
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[0.9rem] text-[#6B6A63] hover:text-[#B3261E] hover:bg-[#FBEAE9] transition-colors duration-200 cursor-pointer"
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