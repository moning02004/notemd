import {FiCopy, FiFileText, FiLayout, FiX} from "react-icons/fi";
import {apiRequest} from "@/lib/api";
import toast from "react-hot-toast";
import NoteTagInput from "@/components/note_tag_input";
import {TemplateManageModal} from "@/components/template/manage_modal";
import {useState} from "react";
import {FaHistory} from "react-icons/fa";
import {NoteSnapshotManageModal} from "@/components/note_snapshot_manage_modal";
import {ToggleSwitch} from "@/components/ui/toggle_switch";
import {SettingsCard} from "@/components/ui/settings_card";
import SettingsWorkspaceInput from "@/components/settings_workspace_input";
import {NoteWorkspace} from "@/types/workspace";
import {downloadNoteRequest} from "@/lib/note";
import {Spinner} from "@/components/icons";
import {EDITOR_WIDTHS, EditorWidth} from "@/hooks/useEditorWidth";

interface SettingsProps {
    noteId: string,
    setOpenedSetting: (flag: boolean) => void;
    setStatusType: (flag: string) => void;
    setIsPublic: (flag: boolean) => void;
    setIsProtected: (flag: boolean) => void;
    setSelectedTags: (tag: string[]) => void;
    setIsEncrypted: (flag: boolean) => void;
    setNotePassword: (notePassword: string | null) => void;
    setEditorWidth: (editorWidth: EditorWidth) => void;
    selectedWorkspaces: NoteWorkspace[];
    setSelectedWorkspaces: (workspace: NoteWorkspace[]) => void;

    selectedTags: string[];
    isProtected: boolean;
    isPublic: boolean;
    isEncrypted: boolean;
    notePassword: string;
    isOpenedSetting: boolean;
    editorWidth: EditorWidth;

    setTitle: (value: string) => void;
    setContent: (value: string) => void;
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
    const [password, setPassword] = useState<string | null>(notePassword)
    const [passwordInput, setPasswordInput] = useState(notePassword !== "")

    const [isExporting, setIsExporting] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const exportPdf = async () => {
        setIsExporting(true)
        try {
            await downloadNoteRequest([noteId], "pdf")
        } catch {
            toast.error("PDF 내보내기에 실패했습니다.")
        } finally {
            setIsExporting(false)
        }
    }

    const deleteNote = async () => {
        if (isDeleting) return
        // 삭제 후 목록으로 나가기까지 시간이 걸린다. 그동안 버튼을 잠그고 진행을 보여준다.
        setIsDeleting(true)
        try {
            await apiRequest.delete(`/notes/${noteId}`)
            toast.success("노트가 삭제되었습니다.")
            window.location.href = "/"
        } catch {
            setIsDeleting(false)
            toast.error("노트를 삭제하지 못했습니다.")
        }
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

                        {/* 내보내기 */}
                        <SettingsCard title="내보내기">
                            <button
                                onClick={exportPdf}
                                disabled={isExporting}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border-strong bg-background text-muted hover:border-accent hover:bg-accent-soft hover:text-accent transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-border-strong disabled:hover:bg-background disabled:hover:text-muted"
                            >
                                {isExporting
                                    ? <Spinner size={18} className="text-accent"/>
                                    : <FiFileText size={18} className="text-accent"/>}
                                <span className="text-[13px] font-medium">
                                    {isExporting ? "PDF 만드는 중..." : "PDF로 내보내기"}
                                </span>
                            </button>
                        </SettingsCard>

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

                            <div className="py-2">
                                <p className="text-[15px] font-medium text-foreground">본문 너비</p>
                                <p className="text-[13px] text-muted mt-0.5">
                                    글이 놓이는 폭을 고릅니다. 모든 노트에 적용되고 다른 기기에서도 같습니다.
                                </p>
                                <EditorWidthPicker value={editorWidth} onChange={setEditorWidth}/>
                            </div>
                        </SettingsCard>

                        {/* 노트 암호 */}
                        <SettingsCard title="노트 암호">

                            <div className="flex flex-row justify-between items-center py-2">
                                <div className="pr-3">
                                    <p className="text-[15px] font-medium text-foreground">암호화 저장</p>
                                    <p className="text-[13px] text-muted mt-0.5">
                                        노트가 암호화되어 저장됩니다.
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
                                        if (passwordInput) {
                                            setPassword("")
                                            // 서버는 빈 문자열을 '잠금 해제' 로, null 은 '바꾸지 않음' 으로 읽는다.
                                            // null 을 보내면 끈 것처럼 보여도 비밀번호가 그대로 남았다.
                                            // 걸려 있던 비밀번호가 있을 때만 저장이 일어나므로 그때만 저장 중으로 표시한다.
                                            if (notePassword) setStatusType("loading")
                                            setNotePassword("")
                                        }
                                        setPasswordInput(!passwordInput)
                                    }}/>
                                </div>
                                {passwordInput &&
                                    <div className="flex flex-row w-full gap-2 mt-3 mb-1 pl-3">
                                        <input type="text"
                                               value={password}
                                               onChange={(e) => setPassword(e.target.value)}
                                               className="flex-1 border rounded border-border-strong py-1.5 px-2 text-sm outline-0"
                                               placeholder="노트 비밀번호를 입력해주세요"
                                        />
                                        <button onClick={() => setNotePassword(password)}
                                                {...(password == notePassword && {disabled: true})}
                                                className={`px-3 py-1.5 rounded text-sm
                                                 ${password == notePassword ? "bg-accent-soft text-accent cursor-not-allowed" : "bg-accent text-accent-soft cursor-pointer"}
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
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[0.9rem] text-subtle hover:text-danger hover:bg-danger-soft transition-colors duration-200 cursor-pointer disabled:cursor-wait disabled:text-subtle disabled:hover:bg-transparent"
                                onClick={deleteNote}
                                disabled={isDeleting}
                            >
                                {isDeleting && <Spinner size={15}/>}
                                {isDeleting ? "삭제하는 중..." : "노트 삭제"}
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
/**
 * 본문 너비 고르기. 상자마다 작은 페이지 그림에 글 줄을 그 폭으로 그려, 고르기 전에 어떻게 보일지 알 수 있다.
 * 휴대폰에서는 본문이 늘 꽉 차므로(useEditorWidth) 그림이 넓은 화면 기준이라고 따로 적지는 않는다.
 */
function EditorWidthPicker({value, onChange}: { value: EditorWidth, onChange: (width: EditorWidth) => void }) {
    return (
        <div role="radiogroup" aria-label="본문 너비" className="mt-3 grid grid-cols-3 gap-2">
            {(Object.keys(EDITOR_WIDTHS) as EditorWidth[]).map(width => {
                const {label, percent} = EDITOR_WIDTHS[width]
                const selected = width === value
                return (
                    <button key={width} type="button" role="radio" aria-checked={selected}
                            onClick={() => onChange(width)}
                            className={`flex flex-col items-center gap-2 rounded-xl border px-2 pt-3 pb-2 cursor-pointer
                                        transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-accent/40
                                        ${selected
                                ? "border-accent bg-accent-soft text-accent"
                                : "border-border-strong bg-background text-muted hover:border-accent hover:text-foreground"}`}>
                        <span className="flex h-9 w-full flex-col items-center justify-center gap-1 rounded-md border border-current/25 bg-surface px-1.5">
                            {[100, 80, 90].map((line, index) => (
                                <span key={index} className="block h-[3px] rounded-full bg-current opacity-60"
                                      style={{width: `${percent * line / 100}%`}}/>
                            ))}
                        </span>
                        <span className="text-[13px] font-medium">{label}</span>
                    </button>
                )
            })}
        </div>
    )
}
