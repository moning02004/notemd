// components/NoteFilterBar.tsx
'use client'

import {useRouter, useSearchParams} from 'next/navigation'

type Tag = {
    label: string
    count: number
    lastUsedAt?: number
}

function sortTags(tags: Tag[]): Tag[] {
    const others = tags.filter(t => t.label !== '전체')
    const sorted = others.sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count
        return (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0)
    })
    return sorted
}

interface Props {
    tags: Tag[]
    totalCount: number
}

export default function NoteFilterBar({tags, totalCount}: Props) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const selectedTag = searchParams.get('tag') ?? '전체'
    const sort = searchParams.get('sort') ?? '최신순'

    const displayTags = [
        {label: '전체', count: totalCount},
        ...sortTags([...tags]),
    ]

    const updateParam = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (key === 'tag' && value === '전체') {
            params.delete('tag')
        } else {
            params.set(key, value)
        }
        router.push(`?${params.toString()}`, {scroll: false})
    }

    const tagButton = (tag: Tag) => (
        <button
            key={tag.label}
            onClick={() => updateParam('tag', tag.label)}
            className={`
        inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm border whitespace-nowrap transition-all
        ${selectedTag === tag.label
                ? 'bg-gray-900 text-white border-gray-900'
                : 'border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-800'}
      `}
        >
            <span className="opacity-40 text-[11px]">#</span>
            {tag.label}
            <span className="opacity-50">{tag.count}</span>
        </button>
    )

    const sortSelect = (className?: string) => (
        <select
            value={sort}
            onChange={e => updateParam('sort', e.target.value)}
            className={`text-sm border border-gray-200 rounded-md px-2 py-1 outline-none bg-transparent text-gray-700 ${className ?? ''}`}
        >
            <option>최신순</option>
            <option>등록일순</option>
            <option>관련도순</option>
        </select>
    )

    return (
        <div className="border-b border-gray-100 bg-white">

            {/* 태그 스크롤 행 + 데스크탑 우측 결과/정렬 */}
            <div className="flex items-center gap-3 px-4 sm:h-11">
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1 py-2 sm:py-0">
                    {displayTags.map(tag => tagButton(tag))}
                </div>

                {/* 데스크탑 전용: 결과 + 정렬 우측 */}
                <div className="hidden sm:flex items-center gap-2 shrink-0">
                    <div className="w-px h-3 bg-gray-200"/>
                    {sortSelect()}
                </div>
            </div>

            {/* 모바일 전용: 결과 + 정렬 상단 행 */}
            <div className="flex items-center justify-end px-4 py-2 sm:hidden">
                {sortSelect()}
            </div>
        </div>
    )
}