// components/template_manage_modal.tsx
import {Dispatch, SetStateAction, useEffect, useState} from "react";
import {FiX, FiTrash2, FiEye, FiCheck} from "react-icons/fi";
import {apiRequest} from "@/lib/api";
import toast from "react-hot-toast";
import DOMPurify from "dompurify";

interface Template {
    hash_id: string;
    name: string;        // 템플릿 이름
    description: string; // 템플릿 설명
    title: string;       // 덮어써질 노트 제목
    content: string;     // 덮어써질 노트 내용
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    currentTitle: string;
    currentContent: string;

    setTitle: Dispatch<SetStateAction<string>>;
    setContent: Dispatch<SetStateAction<string>>;
}

type SaveForm = {
    name: string;
    description: string;
    title: string;
    content: string;
}

export const TemplateManageModal = (
    {isOpen, onClose, currentTitle, currentContent, setTitle, setContent}: Props) => {
    const [templates, setTemplates] = useState<Template[]>([])
    const [previewId, setPreviewId] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [showSaveForm, setShowSaveForm] = useState(false)
    const [saveForm, setSaveForm] = useState<SaveForm>({
        name: "",
        description: "",
        title: currentTitle,
        content: currentContent,
    })

    useEffect(() => {
        if (!isOpen) return;

        const fetchTemplate = async () => {
            setIsLoading(true)
            const data = await apiRequest.get<Template[]>("/templates")
            setTemplates(data)
            setIsLoading(false)
        }
        fetchTemplate()
    }, [isOpen])

    const saveTemplate = async () => {
        if (!saveForm.name.trim()) {
            toast.error("템플릿 이름을 입력해주세요.")
            return
        }

        const templateData = await apiRequest.post<Template>("/templates", {
            body: JSON.stringify(saveForm)
        })
        toast.success("템플릿이 저장되었습니다.")
        setSaveForm({name: "", description: "", title: currentTitle, content: currentContent})
        setShowSaveForm(false)
        setTemplates(prev => [...prev, {
            hash_id: templateData.hash_id,
            name: templateData.name,
            description: templateData.description,
            title: templateData.title,
            content: templateData.content,
        }])
    }

    const deleteTemplate = async (id: string) => {
        await apiRequest.delete(`/templates/${id}`)
        toast.success("템플릿이 삭제되었습니다.")
        if (previewId === id) setPreviewId(null)
        setTemplates(prev => prev.filter(t => t.hash_id !== id))
    }

    const applyTemplate = (template: Template) => {
        setTitle(template.title)
        setContent(template.content)
        toast.success(`"${template.name}" 템플릿이 적용되었습니다.`)
        onClose()
    }

    const previewTemplate = templates.find(t => t.hash_id === previewId)

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={onClose}/>

            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col h-[80vh]">
                {/* 헤더 */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h5 className="font-bold text-base">템플릿 관리</h5>
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
                            ) : templates.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-sm text-gray-400 py-10">
                                    저장된 템플릿이 없습니다
                                </div>
                            ) : (
                                <ul className="divide-y divide-gray-50">
                                    {templates.map(template => (
                                        <li
                                            key={template.hash_id}
                                            onClick={() => setPreviewId(template.hash_id)}
                                            className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors
                                                ${previewId === template.hash_id ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                                        >
                                            <div className="flex-1 truncate mr-2">
                                                <p className="text-sm font-medium text-gray-800 truncate">{template.name}</p>
                                                {template.description && (
                                                    <p className="text-xs text-gray-400 truncate">{template.description}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteTemplate(template.hash_id)
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
                                        autoFocus
                                        type="text"
                                        value={saveForm.name}
                                        onChange={e => setSaveForm(prev => ({...prev, name: e.target.value}))}
                                        placeholder="템플릿 이름 *"
                                        className="text-sm border border-gray-200 rounded-md px-2 py-1.5 outline-none focus:border-gray-400"
                                    />
                                    <input
                                        type="text"
                                        value={saveForm.description}
                                        onChange={e => setSaveForm(prev => ({...prev, description: e.target.value}))}
                                        placeholder="설명 (선택)"
                                        className="text-sm border border-gray-200 rounded-md px-2 py-1.5 outline-none focus:border-gray-400"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={saveTemplate}
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
                                    + 현재 내용을 템플릿으로 저장
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 오른쪽: 미리보기 */}
                    <div className="w-1/2 flex flex-col">
                        {previewTemplate ? (
                            <>
                                <div className="px-4 py-3 border-b border-gray-100">
                                    <p className="text-sm font-semibold text-gray-800">{previewTemplate.name}</p>
                                    {previewTemplate.description && (
                                        <p className="text-xs text-gray-400 mt-0.5">{previewTemplate.description}</p>
                                    )}
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    <div>
                                        <p className="text-xs text-gray-400 mb-1">제목</p>
                                        <p className="text-sm font-medium text-gray-800">{previewTemplate.title}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 mb-1">내용</p>
                                        <div
                                            className="text-sm text-gray-700 prose prose-sm max-w-none"
                                            dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(previewTemplate.content)}}
                                        />
                                    </div>
                                </div>
                                <div className="p-3 border-t border-gray-100">
                                    <button
                                        onClick={() => applyTemplate(previewTemplate)}
                                        className="w-full text-sm py-2 bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors"
                                    >
                                        이 템플릿 적용
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-sm text-gray-400">
                                템플릿을 선택하면 미리볼 수 있습니다
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}