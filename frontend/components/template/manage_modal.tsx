// components/template/manage_modal.tsx
import {Dispatch, SetStateAction, useEffect, useState} from "react";
import {FiTrash2} from "react-icons/fi";
import toast from "react-hot-toast";
import DOMPurify from "dompurify";
import {apiRequest} from "@/lib/api";
import {TwoPaneManageModal} from "@/components/ui/two_pane_manage_modal";
import {Template} from "@/types/template";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    currentTitle: string;
    currentContent: string;

    setTitle: Dispatch<SetStateAction<string>>;
    setContent: Dispatch<SetStateAction<string>>;
    afterApplyTemplate: () => void;
}

type SaveForm = {
    name: string;
    description: string;
    title: string;
    content: string;
}

export const TemplateManageModal = (
    {isOpen, onClose, currentTitle, currentContent, setTitle, setContent, afterApplyTemplate}: Props) => {

    const [templates, setTemplates] = useState<Template[]>([])
    const [previewId, setPreviewId] = useState<string | null>(null)
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
        if (!confirm("모든 내용이 지워지고 템플릿의 내용으로 덮어써집니다. 계속하시겠습니까?")) return

        setTitle(template.title)
        setContent(template.content)
        toast.success(`"${template.name}" 템플릿이 적용되었습니다.`)
        onClose()
        afterApplyTemplate()
    }

    return (
        <TwoPaneManageModal<Template>
            isOpen={isOpen}
            onClose={onClose}
            title="템플릿 관리"
            items={templates}
            isLoading={isLoading}
            getItemKey={(item) => item.hash_id}
            selectedKey={previewId}
            onSelectItem={(item) => setPreviewId(item.hash_id)}
            emptyListText="저장된 템플릿이 없습니다"
            renderListItem={(template) => (
                <>
                    <div className="flex-1 truncate mr-2">
                        <p className="text-sm font-medium text-foreground truncate">{template.name}</p>
                        {template.description && (
                            <p className="text-xs text-subtle truncate">{template.description}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                deleteTemplate(template.hash_id)
                            }}
                            className="p-1.5 text-subtle hover:text-danger hover:bg-danger-soft rounded-md transition-colors"
                            title="삭제"
                        >
                            <FiTrash2 size={15}/>
                        </button>
                    </div>
                </>
            )}
            renderPreview={(template) => (
                <>
                    <div className="px-4 py-3 border-b border-border">
                        <p className="text-sm font-medium text-foreground">{template.name}</p>
                        {template.description && (
                            <p className="text-xs text-subtle mt-0.5">{template.description}</p>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        <div>
                            <p className="text-xs text-subtle mb-1">제목</p>
                            <p className="text-sm font-medium text-foreground">{template.title}</p>
                        </div>
                        <div>
                            <p className="text-xs text-subtle mb-1">내용</p>
                            <div
                                className="text-sm text-muted prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(template.content)}}
                            />
                        </div>
                    </div>
                    <div className="p-3 border-t border-border">
                        <button
                            onClick={() => applyTemplate(template)}
                            className="w-full text-sm py-2 bg-accent border border-dashed border-accent text-white rounded-md hover:bg-accent-hover transition-colors cursor-pointer"
                        >
                            이 템플릿 적용
                        </button>
                    </div>
                </>
            )}
            previewEmptyText="템플릿을 선택하면 미리볼 수 있습니다"
            showSaveForm={showSaveForm}
            onOpenSaveForm={() => {
                setSaveForm(prev => ({...prev, title: currentTitle, content: currentContent}))
                setShowSaveForm(true)
            }}
            saveFormTriggerLabel="+ 현재 내용을 템플릿으로 저장"
            renderSaveForm={() => (
                <div className="flex flex-col gap-2">
                    <input
                        autoFocus
                        type="text"
                        value={saveForm.name}
                        onChange={e => setSaveForm(prev => ({...prev, name: e.target.value}))}
                        placeholder="템플릿 이름 *"
                        className="text-sm bg-background border border-border-strong rounded-md px-2 py-1.5 text-foreground placeholder:text-subtle outline-none focus:border-accent transition-colors"
                    />
                    <input
                        type="text"
                        value={saveForm.description}
                        onChange={e => setSaveForm(prev => ({...prev, description: e.target.value}))}
                        placeholder="설명 (선택)"
                        className="text-sm bg-background border border-border-strong rounded-md px-2 py-1.5 text-foreground placeholder:text-subtle outline-none focus:border-accent transition-colors"
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={saveTemplate}
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