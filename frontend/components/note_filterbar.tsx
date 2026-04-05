'use client'

import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { ArrowDownUp, Check, ChevronDown } from 'lucide-react'
import { useRef, useState, useEffect } from 'react'
import { Tag } from "@/types/note";

function sortTags(tags: Tag[]): Tag[] {
    const totalTag = tags.filter(t => t.keyword === '전체')
    const others = tags.filter(t => t.keyword !== '전체')
    return totalTag.concat(others.sort((a, b) => b.count - a.count))
}

const SORT_OPTIONS = [
    { value: '-updated_at', label: '최근 수정순' },
    { value: '-created_at', label: '등록순' },
]

interface Props {
    tags: Tag[]
}

export default function NoteFilterBar({ tags }: Props) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const sortDropdownRef = useRef<HTMLDivElement>(null)
    const tagDropdownRef = useRef<HTMLDivElement>(null)

    const selectedTag = searchParams.get('tag') ?? '전체'
    const sort = searchParams.get('sort') ?? '-updated_at'
    const displayTags = sortTags([...tags])

    const [sortOpen, setSortOpen] = useState(false)
    const [tagOpen, setTagOpen] = useState(false)

    const currentSortLabel = SORT_OPTIONS.find(o => o.value === sort)?.label ?? '최근 수정순'

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
                setSortOpen(false)
            }
            if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
                setTagOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const updateParam = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (key === 'sort' && value === '-updated_at') {
            params.delete('sort')
        } else if (key === 'tag' && value === '전체') {
            params.delete('tag')
        } else {
            params.set(key, value)
        }
        router.push(`?${params.toString()}`)
    }

    const handleSortSelect = (value: string) => {
        updateParam('sort', value)
        setSortOpen(false)
    }

    const handleTagSelect = (value: string) => {
        updateParam('tag', value)
        setTagOpen(false)
    }

    const iconButtonClass = (active?: boolean) => `
        p-1.5 rounded-md transition-all cursor-pointer
        ${active
            ? 'text-gray-900 bg-gray-100'
            : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'}
    `

    const tagButtonClass = (active: boolean) => `
        inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm border whitespace-nowrap transition-all cursor-pointer
        ${active
            ? 'bg-gray-900 text-white border-gray-900'
            : 'border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-800'}
    `

    return (
        <div className="border-b border-gray-100 bg-white">
            <div className="flex items-center gap-3 px-4 h-11">

                {/* 데스크탑 태그 스크롤 */}
                <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1">
                    {displayTags.map(tag => (
                        <button
                            key={tag.keyword}
                            onClick={() => updateParam('tag', tag.keyword)}
                            className={tagButtonClass(selectedTag === tag.keyword)}
                        >
                            <span className="opacity-40 text-[11px]">#</span>
                            {tag.keyword}
                            <span className="opacity-50">{tag.count}</span>
                        </button>
                    ))}
                </div>

                {/* 모바일 태그 드롭다운 */}
                <div className="sm:hidden flex-1 relative" ref={tagDropdownRef}>
                    <button
                        onClick={() => setTagOpen(prev => !prev)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 w-full"
                    >
                        <span className="opacity-40 text-[11px]">#</span>
                        <span className="flex-1 text-left">{selectedTag}</span>
                        <ChevronDown size={14} className={`transition-transform ${tagOpen ? 'rotate-180' : ''}`}/>
                    </button>

                    {tagOpen && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-md z-50 py-1 max-h-60 overflow-y-auto">
                            {displayTags.map(tag => (
                                <button
                                    key={tag.keyword}
                                    onClick={() => handleTagSelect(tag.keyword)}
                                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    <span className="flex items-center gap-1.5">
                                        <span className="opacity-40 text-[11px]">#</span>
                                        {tag.keyword}
                                        <span className="opacity-50 text-xs">{tag.count}</span>
                                    </span>
                                    {selectedTag === tag.keyword && (
                                        <Check size={13} className="text-gray-900"/>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* 정렬 드롭다운 */}
                <div className="flex items-center gap-1 shrink-0">
                    <div className="w-px h-3 bg-gray-200 mr-1"/>
                    <div ref={sortDropdownRef} className="relative">
                        <button
                            onClick={() => setSortOpen(prev => !prev)}
                            className={iconButtonClass(sortOpen)}
                            title={currentSortLabel}
                        >
                            <ArrowDownUp size={16}/>
                        </button>

                        {sortOpen && (
                            <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-md z-50 py-1">
                                {SORT_OPTIONS.map(option => (
                                    <button
                                        key={option.value}
                                        onClick={() => handleSortSelect(option.value)}
                                        className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        {option.label}
                                        {sort === option.value && (
                                            <Check size={13} className="text-gray-900"/>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}