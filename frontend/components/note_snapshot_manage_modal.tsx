import {Dispatch, SetStateAction, useEffect, useState} from "react";
import {FiTrash2} from "react-icons/fi";
import toast from "react-hot-toast";
import DOMPurify from "dompurify";
import {apiRequest} from "@/lib/api";
import {TwoPaneManageModal} from "@/components/ui/two_pane_manage_modal";
import {NoteSnapshot} from "@/types/snapshot";

interface Props {
    noteHash: string;
    isOpen: boolean;
    onClose: () => void;
    currentTitle: string;
    currentContent: string;

    setTitle: Dispatch<SetStateAction<string>>;
    setContent: Dispatch<SetStateAction<string>>;
    afterApplyTemplate: () => void;
}

type SaveForm = {
    description: string;
}

const ITEM_CLASSNAME = (selected: boolean) =>
    `flex items-center justify-between px-4 py-3 cursor-pointer transition-colors border-l-2 ${
        selected
            ? "bg-accent-soft border-l-accent"
            : "border-l-transparent hover:bg-background"
    }`

export const NoteSnapshotManageModal = (
    {noteHash, isOpen, onClose, currentTitle, currentContent, setTitle, setContent, afterApplyTemplate}: Props) => {

    const [noteSnapshot, setNoteSnapshot] = useState<NoteSnapshot[]>([])
    const [previewId, setPreviewId] = useState<string>("")
    const [isLoading, setIsLoading] = useState(true)
    const [showSaveForm, setShowSaveForm] = useState(false)
    const [saveForm, setSaveForm] = useState<SaveForm>({
        description: "",
    })

    useEffect(() => {
        if (!isOpen) return;

        const fetchNoteSnapshot = async () => {
            setIsLoading(true)
            const data = await apiRequest.get<NoteSnapshot[]>(`/notes/${noteHash}/snapshots`)
            setNoteSnapshot(data)
            setIsLoading(false)
        }
        fetchNoteSnapshot()
    }, [isOpen])

    const saveNoteSnapshot = async () => {
        if (!saveForm.description.trim()) {
            toast.error("스냅샷 설명을 입력해주세요.")
            return
        }

        const data = await apiRequest.post<NoteSnapshot>(`/notes/${noteHash}/snapshots`, {
            body: JSON.stringify(saveForm)
        })
        toast.success("스냅샷이 저장되었습니다.")

        setSaveForm({description: ""})
        setShowSaveForm(false)
        setPreviewId(data.hash_id)

        setNoteSnapshot(prev => [{
            hash_id: data.hash_id,
            description: data.description,
            title: data.title,
            content: data.content,
            created_at: data.created_at,
        }, ...prev])
    }

    const deleteNoteSnapshot = async (id: string) => {
        await apiRequest.delete(`/notes/${noteHash}/snapshots/${id}`)
        toast.success("스냅샷이 삭제되었습니다.")
        if (previewId === id) setPreviewId("")
        setNoteSnapshot(prev => prev.filter(t => t.hash_id !== id))
    }

    const applyNoteSnapshot = async (noteSnapshot: NoteSnapshot) => {
        if (!confirm("모든 내용이 지워지고 스냅샷으로 대체됩니다. 계속하시겠습니까?")) return

        if (currentContent != noteSnapshot.content) {
            await apiRequest.post<NoteSnapshot>(`/notes/${noteHash}/snapshots`,
                {body: JSON.stringify({})}
            )
        }
        setTitle(noteSnapshot.title)
        setContent(noteSnapshot.content)
        onClose()
        afterApplyTemplate()
        setPreviewId("")
    }

    return (
        <TwoPaneManageModal<NoteSnapshot>
            isOpen={isOpen}
            onClose={onClose}
            title="스냅샷 목록"
            items={noteSnapshot}
            isLoading={isLoading}
            getItemKey={(item) => item.hash_id}
            getItemClassName={ITEM_CLASSNAME}
            selectedKey={previewId || null}
            onSelectItem={(item) => setPreviewId(item.hash_id)}
            emptyListText="스냅샷이 존재하지 않습니다."
            renderListItem={(snapshot) => (
                <>
                    <div className="flex-1 truncate mr-2">
                        <p className="text-sm font-medium text-foreground truncate">{snapshot.description}</p>
                        <p className="text-xs text-subtle truncate">{snapshot.created_at}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (confirm("스냅샷을 삭제하시겠습니까?")) deleteNoteSnapshot(snapshot.hash_id)
                            }}
                            className="p-1.5 text-subtle hover:text-danger hover:bg-danger-soft rounded-md transition-colors"
                            title="삭제"
                        >
                            <FiTrash2 size={15}/>
                        </button>
                    </div>
                </>
            )}
            renderPreview={(snapshot) => (
                <>
                    <div className="px-4 py-3 border-b border-border">
                        <p className="text-xs text-subtle mb-1">제목</p>
                        <p className="text-sm font-medium text-foreground">{snapshot.title}</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        <p className="text-xs text-subtle mb-1">내용</p>
                        <div
                            className="ProseMirror text-sm text-muted prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(snapshot.content)}}
                        />
                    </div>
                    <div className="p-3 border-t border-border">
                        <button
                            onClick={() => applyNoteSnapshot(snapshot)}
                            className="w-full text-sm py-2 bg-accent border border-dashed border-accent text-white rounded-md hover:bg-accent-hover transition-colors cursor-pointer"
                        >
                            이 스냅샷으로 대체
                        </button>
                    </div>
                </>
            )}
            previewEmptyText="스냅샷을 선택해주세요."
            showSaveForm={showSaveForm}
            onOpenSaveForm={() => {
                setSaveForm(prev => ({...prev, title: currentTitle, content: currentContent}))
                setShowSaveForm(true)
            }}
            saveFormTriggerLabel="+ 스냅샷 저장"
            renderSaveForm={() => (
                <div className="flex flex-col gap-2">
                    <input
                        type="text"
                        value={saveForm.description}
                        onChange={e => setSaveForm(prev => ({...prev, description: e.target.value}))}
                        placeholder="설명"
                        className="text-sm bg-background border border-border-strong rounded-md px-2 py-1.5 text-foreground placeholder:text-subtle outline-none focus:border-accent transition-colors"
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={saveNoteSnapshot}
                            className="flex-1 text-sm py-1.5 bg-accent text-white rounded-md hover:bg-accent-hover transition-colors cursor-pointer"
                        >
                            저장
                        </button>
                        <button
                            onClick={() => setShowSaveForm(false)}
                            className="text-sm px-3 py-1.5 text-muted hover:bg-accent-soft hover:text-accent rounded-md transition-colors cursor-pointer"
                        >
                            취소
                        </button>
                    </div>
                </div>
            )}
        />
    )
}