import {Dispatch, SetStateAction, useEffect, useState} from "react";
import {FiX, FiTrash2, FiEye, FiCheck} from "react-icons/fi";
import toast from "react-hot-toast";
import DOMPurify from "dompurify";
import {apiRequest} from "@/lib/api";

interface NoteSnapshot {
    hash_id: string;
    description: string;
    title: string;
    content: string;
    created_at: string
}

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

        setNoteSnapshot(prev => [...prev, {
            hash_id: data.hash_id,
            description: data.description,
            title: data.title,
            content: data.content,
            created_at: data.created_at,
        }])
    }

    const deleteNoteSnapshot = async (id: string) => {
        await apiRequest.delete(`/notes/${noteHash}/snapshots/${id}`)
        toast.success("스냅샷이 삭제되었습니다.")
        if (previewId === id) setPreviewId("")
        setNoteSnapshot(prev => prev.filter(t => t.hash_id !== id))
    }

    const applyNoteSnapshot = (noteSnapshot: NoteSnapshot) => {
        if (!confirm("모든 내용이 지워지고 스냅샷으로 대체됩니다. 계속하시겠습니까?")) return

        setTitle(noteSnapshot.title)
        setContent(noteSnapshot.content)
        onClose()
        afterApplyTemplate()
    }

    const previewNoteSnapshot = noteSnapshot.find(t => t.hash_id === previewId)
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={onClose}/>

            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col h-[80vh]">
                {/* 헤더 */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h5 className="font-bold text-base">스냅샷 목록</h5>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-md transition-colors">
                        <FiX size={20}/>
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* 왼쪽: 목록 */}
                    <div className="w-1/2 border-r border-gray-100 flex flex-col">
                        <div className="flex-1 overflow-y-auto">
                            {isLoading ? (
                                <div className="space-y-2 p-4">
                                    {Array.from({length: 3}).map((_, i) => (
                                        <div key={i} className="h-12 rounded bg-gray-100 animate-pulse"/>
                                    ))}
                                </div>
                            ) : noteSnapshot.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-sm text-gray-400 py-10">
                                    스냅샷이 존재하지 않습니다.
                                </div>
                            ) : (
                                <ul className="divide-y divide-gray-50">
                                    {noteSnapshot.map(noteSnapshot => (
                                        <li
                                            key={noteSnapshot.hash_id}
                                            onClick={() => setPreviewId(noteSnapshot.hash_id)}
                                            className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors
                                                ${previewId === noteSnapshot.hash_id ? 'bg-gray-200' : 'hover:bg-gray-50'}`}
                                        >
                                            <div className="flex-1 truncate mr-2">
                                                <p className="text-sm font-medium text-gray-800 truncate">{noteSnapshot.description}</p>
                                                <p className="text-sm font-medium text-gray-800 truncate">{noteSnapshot.created_at}</p>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteNoteSnapshot(noteSnapshot.hash_id)
                                                    }}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                                    title="삭제"
                                                >
                                                    <FiTrash2 size={15}/>
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* 저장 폼 */}
                        <div className="border-t border-gray-100 p-3">
                            {showSaveForm ? (
                                <div className="flex flex-col gap-2">
                                    <input
                                        type="text"
                                        value={saveForm.description}
                                        onChange={e => setSaveForm(prev => ({...prev, description: e.target.value}))}
                                        placeholder="설명"
                                        className="text-sm border border-gray-200 rounded-md px-2 py-1.5 outline-none focus:border-gray-400"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={saveNoteSnapshot}
                                            className="flex-1 text-sm py-1.5 bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors"
                                        >
                                            저장
                                        </button>
                                        <button
                                            onClick={() => setShowSaveForm(false)}
                                            className="text-sm px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
                                        >
                                            취소
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => {
                                        setSaveForm(prev => ({...prev, title: currentTitle, content: currentContent}))
                                        setShowSaveForm(true)
                                    }}
                                    className="w-full text-sm py-1.5 border border-dashed border-gray-300 rounded-md text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
                                >
                                    + 스냅샷 저장
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 오른쪽: 미리보기 */}
                    <div className="w-1/2 flex flex-col">
                        {previewNoteSnapshot ? (
                            <>
                                <div className="px-4 py-3 border-b border-gray-100">
                                    <p className="text-xs text-gray-400 mb-1">제목</p>
                                    <p className="text-sm font-semibold text-gray-800">{previewNoteSnapshot.title}</p>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    <p className="text-xs text-gray-400 mb-1">내용</p>

                                    <div
                                        className="text-sm text-gray-700 prose prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(previewNoteSnapshot.content)}}
                                    />
                                </div>
                                <div className="p-3 border-t border-gray-100">
                                    <button
                                        onClick={() => applyNoteSnapshot(previewNoteSnapshot)}
                                        className="w-full text-sm py-2 bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors"
                                    >
                                        이 스냅샷으로 대체
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-sm text-gray-400">
                                스냅샷을 선택해주세요.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}