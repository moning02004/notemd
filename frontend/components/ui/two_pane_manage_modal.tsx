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
        selected ? "bg-gray-50" : "hover:bg-gray-50"
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
        <Modal isOpen={isOpen} onClose={onClose} className="rounded-xl w-full max-w-2xl mx-4 h-[80vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h5 className="font-bold text-base">{title}</h5>
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
                        ) : items.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-sm text-gray-400 py-10">
                                {emptyListText}
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-50">
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
                    <div className="border-t border-gray-100 p-3">
                        {showSaveForm ? renderSaveForm() : (
                            <button
                                onClick={onOpenSaveForm}
                                className="w-full text-sm py-1.5 border border-dashed border-gray-300 rounded-md text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
                            >
                                {saveFormTriggerLabel}
                            </button>
                        )}
                    </div>
                </div>

                {/* 오른쪽: 미리보기 */}
                <div className="w-1/2 flex flex-col">
                    {selectedItem ? renderPreview(selectedItem) : (
                        <div className="flex items-center justify-center h-full text-sm text-gray-400">
                            {previewEmptyText}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    )
}
