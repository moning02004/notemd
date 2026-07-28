import {FiCopy, FiLayout, FiX} from "react-icons/fi";
import {apiRequest} from "@/lib/api";
import toast from "react-hot-toast";
import NoteTagInput from "@/components/note_tag_input";
import {TemplateManageModal} from "@/components/template/manage_modal";
import {Dispatch, SetStateAction, useState} from "react";
import {FaHistory} from "react-icons/fa";
import {NoteSnapshotManageModal} from "@/components/note_snapshot_manage_modal";
import {ToggleSwitch} from "@/components/ui/toggle_switch";
import {SettingsCard} from "@/components/ui/settings_card";
import SettingsWorkspaceInput from "@/components/settings_workspace_input";
import {NoteWorkspace} from "@/types/workspace";

interface SettingsProps {
    noteId: string,
    setOpenedSetting: (flag: boolean) => void;
    setStatusType: (flag: string) => void;
    setIsPublic: (flag: boolean) => void;
    setIsProtected: (flag: boolean) => void;
    setSelectedTags: (tag: string[]) => void;
    setIsEncrypted: (flag: boolean) => void;
    setNotePassword: (notePassword: string) => void;
    setEditorWidth: (editorWidth: number) => void;
    selectedWorkspaces: NoteWorkspace[];
    setSelectedWorkspaces: (workspace: NoteWorkspace[]) => void;

    selectedTags: string[];
    isProtected: boolean;
    isPublic: boolean;
    isEncrypted: boolean;
    notePassword: string;
    isOpenedSetting: boolean;
    editorWidth: number;

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
                                 setIsEncrypted,
                                 setNotePassword,
                                 setSelectedTags,
                                 selectedWorkspaces,
                                 editorWidth,

                                 selectedTags,
                                 setSelectedWorkspaces,
                                 isProtected,
                                 isPublic,
                                 isEncrypted,
                                 notePassword,
                                 isOpenedSetting,
                                 setEditorWidth,

                                 currentTitle,
                                 currentContent,
                                 afterApplyTemplate,
                                 setTitle,
                                 setContent,
                             }: SettingsProps) => {
    const [templateModalOpen, setTemplateModalOpen] = useState(false)
    const [noteSnapshotModalOpen, setNoteSnapshotModalOpen] = useState(false)
    const [passwordInput, setPasswordInput] = useState(false)
    const [password, setPassword] = useState<string | null>(notePassword)

    const deleteNote = async () => {
        await apiRequest.delete(`/notes/${noteId}`).then(() => {
            toast.success("노트가 삭제되었습니다.")
            window.location.href = "/"
        })
    }

    return (
        <>
            <div className={`w-full md:w-[420px] lg:w-[400px] bg-background fixed flex flex-col right-0 top-0 h-screen border-l border-border shadow-2xl overflow-y-auto
                transform transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] z-20
                ${isOpenedSetting ? "translate-x-0" : "translate-x-full"}`}>

                <div className="flex flex-col h-full">
                    {/* 헤더 */}
                    <div
                        className="flex flex-row justify-between items-center p-3 bg-surface/85 backdrop-blur border-b border-border sticky top-0 z-10">
                        <div className="text-lg font-serif text-foreground">노트 설정</div>
                        <button onClick={() => setOpenedSetting(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full text-muted hover:bg-accent-soft hover:text-accent transition-colors duration-200 cursor-pointer">
                            <FiX size={18}/>
                        </button>
                    </div>

                    <div className="flex flex-col gap-4 px-5 py-5 flex-1">

                        {/* 공유 및 보안 */}
                        <SettingsCard title="기본 설정">
                            <div className="flex flex-row justify-between items-center py-2">
                                <div className="pr-3">
                                    <p className="text-[15px] font-medium text-foreground">외부 공개</p>
                                    <p className="text-[13px] text-muted mt-0.5">
                                        링크가 있는 누구나 볼 수 있어요.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {isPublic && (
                                        <button
                                            className="w-8 h-8 flex items-center justify-center rounded-full bg-accent-soft text-accent hover:bg-accent-soft transition-colors duration-200 cursor-pointer"
                                            onClick={() => {
                                                navigator.clipboard.writeText(`${window.location.origin}/s/${noteId}`)
                                                toast('노트 링크가 복사되었습니다.');
                                            }}
                                        >
                                            <FiCopy size={14}/>
                                        </button>
                                    )}
                                    <ToggleSwitch checked={isPublic} activeColor="bg-accent" onClick={() => {
                                        setStatusType("loading")
                                        setIsPublic(!isPublic)
                                    }}/>
                                </div>
                            </div>

                            <div className="h-px bg-border my-1"/>

                            <div className="flex flex-row justify-between items-center py-2">
                                <div className="pr-3">
                                    <p className="text-[15px] font-medium text-foreground">노트 보호</p>
                                    <p className="text-[13px] text-muted mt-0.5">
                                        편집과 삭제가 제한됩니다.
                                    </p>
                                </div>
                                <ToggleSwitch checked={isProtected} activeColor="bg-accent" onClick={() => {
                                    setStatusType("loading")
                                    setIsProtected(!isProtected)
                                }}/>
                            </div>
                            <div className="h-px bg-border my-1"/>

                            <div className="flex flex-row justify-between items-center py-2">
                                <div className="pr-3">
                                    <p className="text-[15px] font-medium text-foreground">레이아웃</p>
                                    <p className="text-[13px] text-muted mt-0.5">
                                        편집기 영역의 너비를 조절할 수 있어요.
                                    </p>
                                </div>
                                <div className="cursor-pointer shrink-0">
                                    <select
                                        value={editorWidth}
                                        onChange={(e) => setEditorWidth(parseInt(e.target.value))}
                                        className="border border-border-strong rounded-lg px-3 py-1.5 text-[13px] font-medium text-accent bg-background cursor-pointer outline-none hover:border-accent focus:border-accent transition-colors duration-150 shrink-0"
                                    >
                                        <option value="100">100%</option>
                                        <option value="70">70%</option>
                                        <option value="50">50%</option>
                                    </select>
                                </div>
                            </div>
                        </SettingsCard>

                        {/* 노트 암호 */}
                        <SettingsCard title="노트 암호">

                            <div className="flex flex-row justify-between items-center py-2">
                                <div className="pr-3">
                                    <p className="text-[15px] font-medium text-foreground">암호화 저장</p>
                                    <p className="text-[13px] text-muted mt-0.5">
                                        노트가 암호화되어 저장되고, 검색에서 제외됩니다.
                                    </p>
                                </div>
                                <ToggleSwitch checked={isEncrypted} activeColor="bg-accent" onClick={() => {
                                    setStatusType("loading")
                                    setIsEncrypted(!isEncrypted)
                                }}/>
                            </div>

                            <div className="h-px bg-border my-1"/>

                            <div className="flex flex-col w-full">
                                <div className="flex flex-row justify-between items-center pt-2">
                                    <div className="pr-3">
                                        <p className="text-[15px] font-medium text-foreground">비밀번호 설정</p>
                                        <p className="text-[13px] text-muted mt-0.5">
                                            다른 사람이 노트를 열 때 비밀번호를 확인합니다.
                                        </p>
                                    </div>
                                    <ToggleSwitch checked={passwordInput} activeColor="bg-accent" onClick={() => {
                                        setStatusType("loading")
                                        setPasswordInput(!passwordInput)
                                    }}/>
                                </div>
                                {passwordInput &&
                                    <div className="flex flex-row w-full gap-2 mt-3 mb-1 pl-3">
                                        <input type="password"
                                               value={password}
                                               onChange={(e) => setPassword(e.target.value)}
                                               className="flex-1 border rounded border-border-strong py-1.5 px-2 text-sm outline-0"
                                               placeholder="노트 비밀번호를 입력해주세요"
                                        />
                                        <button onClick={() => setNotePassword(password)}
                                                className={`px-3 py-1.5 rounded bg-accent text-accent-soft text-sm
                                                 ${password == notePassword ? "cursor-disabled" : "cursor-pointer"}
                                                font-medium`}>저장
                                        </button>
                                    </div>
                                }
                            </div>
                        </SettingsCard>

                        {/* 분류 */}
                        <SettingsCard title="분류">
                            <NoteTagInput selectedTags={selectedTags} setSelectedTags={setSelectedTags}/>
                        </SettingsCard>

                        {/* 워크스페이스 */}
                        <SettingsCard title="워크스페이스">
                            <SettingsWorkspaceInput selectedWorkspaces={selectedWorkspaces}
                                                    setSelectedWorkspaces={setSelectedWorkspaces}/>
                        </SettingsCard>

                        {/* 관리 */}
                        <SettingsCard title="관리">
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setTemplateModalOpen(true)}
                                    className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl border border-border-strong bg-background text-muted hover:border-accent hover:bg-accent-soft hover:text-accent transition-colors duration-200 cursor-pointer"
                                >
                                    <FiLayout size={18} className="text-accent"/>
                                    <span className="text-[13px] font-medium">템플릿 관리</span>
                                </button>

                                <button
                                    onClick={() => setNoteSnapshotModalOpen(true)}
                                    className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl border border-border-strong bg-background text-muted hover:border-accent hover:bg-accent-soft hover:text-accent transition-colors duration-200 cursor-pointer"
                                >
                                    <FaHistory size={18} className="text-accent"/>
                                    <span className="text-[13px] font-medium">스냅샷 목록</span>
                                </button>
                            </div>
                        </SettingsCard>
                    </div>

                    {/* 삭제 */}
                    {!isProtected && (
                        <div className="px-5 pb-6 pt-3 border-t border-border bg-surface">
                            <button
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[0.9rem] text-subtle hover:text-danger hover:bg-danger-soft transition-colors duration-200 cursor-pointer"
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