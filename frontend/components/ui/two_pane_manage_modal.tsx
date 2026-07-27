"use client"

import {FiX} from "react-icons/fi"
import {Modal} from "@/components/ui/modal"

interface TwoPaneManageModalProps<T> {
    isOpen: boolean
    onClose: () => void
    title: string

    items: T[]
    isLoading: boolean
    getItemKey: (item: T) => string
    selectedKey: string | null
    onSelectItem: (item: T) => void
    /** <li> 내부 콘텐츠만 반환 (li 자체와 onClick/기본 className은 셸이 담당) */
    renderListItem: (item: T, selected: boolean) => React.ReactNode
    /** 선택 상태에 따른 <li> className (기본값과 다르면 지정) */
    getItemClassName?: (selected: boolean) => string
    emptyListText: string

    renderPreview: (item: T) => React.ReactNode
    previewEmptyText: string

    showSaveForm: boolean
    onOpenSaveForm: () => void
    saveFormTriggerLabel: string
    renderSaveForm: () => React.ReactNode
}

const DEFAULT_ITEM_CLASSNAME = (selected: boolean) =>
    `flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${
        selected ? "bg-background" : "hover:bg-background"
    }`

export function TwoPaneManageModal<T>({
                                           isOpen, onClose, title,
                                           items, isLoading, getItemKey, selectedKey, onSelectItem,
                                           renderListItem, getItemClassName = DEFAULT_ITEM_CLASSNAME, emptyListText,
                                           renderPreview, previewEmptyText,
                                           showSaveForm, onOpenSaveForm, saveFormTriggerLabel, renderSaveForm,
                                       }: TwoPaneManageModalProps<T>) {
    if (!isOpen) return null

    const selectedItem = items.find(item => getItemKey(item) === selectedKey)

    return (
        <Modal isOpen={isOpen} onClose={onClose}
               className="rounded-none md:rounded-xl w-full md:max-w-2xl mx-0 md:mx-4 h-[100vh] md:h-[80vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                <h5 className="font-bold text-base">{title}</h5>
                <button onClick={onClose} className="p-1 hover:bg-background rounded-md transition-colors">
                    <FiX size={20}/>
                </button>
            </div>

            <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
                {/* 목록 (모바일: 상단 / 데스크톱: 왼쪽) */}
                <div className="md:w-1/2 border-b md:border-b-0 md:border-r border-border flex flex-col shrink-0 max-h-[38vh] md:max-h-none md:flex-1 min-h-0">
                    <div className="flex-1 overflow-y-auto">
                        {isLoading ? (
                            <div className="space-y-2 p-4">
                                {Array.from({length: 3}).map((_, i) => (
                                    <div key={i} className="h-12 rounded bg-background animate-pulse"/>
                                ))}
                            </div>
                        ) : items.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-sm text-subtle py-10">
                                {emptyListText}
                            </div>
                        ) : (
                            <ul className="divide-y divide-border">
                                {items.map(item => {
                                    const key = getItemKey(item)
                                    const selected = key === selectedKey
                                    return (
                                        <li
                                            key={key}
                                            onClick={() => onSelectItem(item)}
                                            className={getItemClassName(selected)}
                                        >
                                            {renderListItem(item, selected)}
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </div>

                    {/* 저장 폼 */}
                    <div className="border-t border-border p-3 shrink-0">
                        {showSaveForm ? renderSaveForm() : (
                            <button
                                onClick={onOpenSaveForm}
                                className="w-full text-sm py-2 border border-dashed border-border-strong rounded-md text-muted hover:border-border-strong hover:text-foreground transition-colors"
                            >
                                {saveFormTriggerLabel}
                            </button>
                        )}
                    </div>
                </div>

                {/* 미리보기 (모바일: 하단 / 데스크톱: 오른쪽) */}
                <div className="flex-1 md:w-1/2 flex flex-col min-h-0">
                    {selectedItem ? renderPreview(selectedItem) : (
                        <div className="flex items-center justify-center h-full text-sm text-subtle py-10">
                            {previewEmptyText}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    )
}
