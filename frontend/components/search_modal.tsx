import {useEffect, useRef, useState} from "react";
import {FiArrowLeft, FiChevronRight, FiFolder, FiX} from "react-icons/fi";
import {apiRequest} from "@/lib/api";
import DOMPurify from "dompurify";
import {gotoNote} from "@/lib/note";
import {useProgressRouter} from "@/hooks/useProgressRouter";
import {Spinner} from "@/components/icons";
import {Modal} from "@/components/ui/modal";
import {NoteSearchResult} from "@/types/note";
import {useFolders} from "@/hooks/useFolders";
import {flattenFolders, folderPathLabel} from "@/types/folder";

/** 서버가 한 쪽에 주는 수. 이만큼 왔으면 다음 쪽이 더 있을 수 있다. */
const PAGE_SIZE = 20

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const SkeletonItem = () => (
    <div className="w-full border-b border-border p-3">
        <div className="flex flex-row">
            <div className="border-r border-border pr-2 space-y-2 flex-1">
                <div className="skeleton h-4 w-1/3"/>
                <div className="skeleton h-3 w-full"/>
                <div className="skeleton h-3 w-5/6"/>
            </div>
            <div className="flex-1 my-auto ml-auto text-right pr-2">
                <div className="skeleton h-3 w-16 ml-auto"/>
            </div>
        </div>
    </div>
);

export const SearchModal = ({isOpen, onClose}: Props) => {
    const router = useProgressRouter();

    const keywordRef = useRef(null)
    const [keyword, setKeyword] = useState("")
    const [results, setResults] = useState<NoteSearchResult[]>([])
    // 경로는 이미 받아둔 폴더 트리에서 만든다. 검색 응답에 경로를 더 달 필요가 없다.
    const {data: folderData} = useFolders(isOpen)
    const [isLoading, setIsLoading] = useState(false)
    const [searched, setSearched] = useState(false)
    // 고른 결과가 열리는 동안 그 줄에 표시를 남긴다.
    const [openingId, setOpeningId] = useState<string | null>(null)

    // 닫히면 검색을 비운다(렌더 중에 앞 상태와 견줘 맞춘다).
    const [wasOpen, setWasOpen] = useState(isOpen)
    if (isOpen !== wasOpen) {
        setWasOpen(isOpen)
        if (!isOpen) {
            setKeyword("")
            setResults([])
            setSearched(false)
            setOpeningId(null)
        }
    }
    // 검색어를 지우면 지난 결과는 보이지 않는다.
    const shownResults = keyword ? results : []
    const didSearch = keyword !== "" && searched

    // 검색어가 바뀌면 첫 쪽부터 다시 받는다. 늦게 온 지난 검색어의 응답은 버린다.
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(false)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [searchedFor, setSearchedFor] = useState(keyword)
    if (searchedFor !== keyword) {
        setSearchedFor(keyword)
        setPage(1)
        setHasMore(false)
    }

    useEffect(() => {
        if (keyword === "") return

        let aborted = false
        const first = page === 1
        const timer = setTimeout(async () => {
            if (first) {
                setIsLoading(true)
                setSearched(true)
            } else {
                setIsLoadingMore(true)
            }
            try {
                let data = await apiRequest.get<NoteSearchResult[]>(
                    `/notes?keyword=${encodeURIComponent(keyword)}&page=${page}`)
                if (aborted) return
                data = data.map(note => ({
                    ...note,
                    content: DOMPurify.sanitize((note.content || "").replace(/<[^>]*>/g, ""))
                }))
                setResults(previous => first ? data : [...previous, ...data])
                setHasMore(data.length === PAGE_SIZE)
            } catch {
                if (aborted) return
                if (first) setResults([])
                setHasMore(false)
            } finally {
                if (!aborted) {
                    setIsLoading(false)
                    setIsLoadingMore(false)
                }
            }
        // 다음 쪽은 기다릴 까닭이 없다. 글자를 치는 동안에만 잠깐 모았다가 보낸다.
        }, first ? 300 : 0);

        return () => {
            aborted = true
            clearTimeout(timer)
        };
    }, [keyword, page])

    // 목록 끝이 보이면 다음 쪽을 받는다.
    const sentinelRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        const element = sentinelRef.current
        if (!element || !hasMore || isLoading || isLoadingMore) return
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) setPage(current => current + 1)
        })
        observer.observe(element)
        return () => observer.disconnect()
    }, [hasMore, isLoading, isLoadingMore, results.length])

    // 이름이 검색어에 맞는 폴더. 이미 받아 둔 폴더 트리에서 고르므로 요청이 더 나가지 않는다.
    const matchedFolders = keyword
        ? flattenFolders(folderData?.folders ?? [])
            .filter(folder => folder.name.toLowerCase().includes(keyword.toLowerCase()))
        : []
    const openFolder = (hashId: string) => {
        onClose()
        router.push(`/?folder=${hashId}`)
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} slide
               className="md:rounded-xl w-full max-w-2xl md:mx-4 md:h-[90vh] h-full">
                <div className="flex items-center justify-between py-4 border-b border-border">
                    <button
                        onClick={onClose}
                        className="md:hidden block p-3 hover:bg-background rounded-md transition-colors"
                    >
                        <FiArrowLeft size={20}/>
                    </button>
                    <div className="w-full py-2 mx-2 relative group border border-border rounded-xl px-3">
                        <input
                            ref={keywordRef}
                            onKeyUp={(e) => setKeyword(e.currentTarget.value.trim())}
                            className="w-full outline-0 "
                            placeholder="검색"
                            autoFocus={true}
                        />
                        <button
                            onClick={() => {
                                setKeyword("")
                                if (keywordRef.current) {
                                    keywordRef.current.value = "";
                                    keywordRef.current.focus();
                                }
                            }}
                            className="cursor-pointer rounded-full hover:bg-background group-hover:block hidden p-2 absolute right-0 top-[50%] -translate-y-[50%]"
                        >
                            <FiX size={16}/>
                        </button>
                    </div>
                </div>

                <div className="flex flex-col flex-1 overflow-y-auto">
                    {/*
                      이름이 맞는 폴더를 노트보다 위에 둔다. 폴더 이름을 치는 사람은 그 안으로 들어가려는 것이고,
                      노트 결과 사이에 섞이면 찾을 수 없다.
                    */}
                    {matchedFolders.length > 0 && (
                        <div className="border-b border-border bg-background/60">
                            <p className="px-3 pt-2 pb-1 text-[11px] font-medium text-subtle">폴더 {matchedFolders.length}</p>
                            {matchedFolders.map(folder => (
                                <button
                                    key={folder.hash_id}
                                    onClick={() => openFolder(folder.hash_id)}
                                    className="w-full flex items-center gap-2.5 px-3 h-11 text-left cursor-pointer hover:bg-accent-menu"
                                >
                                    <FiFolder size={15} className="shrink-0 text-accent"/>
                                    <span className="min-w-0 flex-1 truncate">
                                        <span className="text-[14px] font-medium text-foreground">{folder.name}</span>
                                        {folder.parent_hash && (
                                            <span className="ml-2 text-[11px] text-subtle">
                                                {folderPathLabel(folderData?.folders ?? [], folder.parent_hash)}
                                            </span>
                                        )}
                                    </span>
                                    <span className="shrink-0 text-[12px] tabular-nums text-subtle">{folder.total_count}</span>
                                    <FiChevronRight size={14} className="shrink-0 text-subtle"/>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* 글자를 치고 검색이 나가기 전의 짧은 틈에도 '검색하세요' 안내가 아니라 받는 중으로 보인다. */}
                    {isLoading || (keyword !== "" && !searched) ? (
                        Array.from({length: 4}).map((_, i) => <SkeletonItem key={i}/>)
                    ) : shownResults.length > 0 ? (
                        shownResults.map((note) => (
                            <div
                                key={note.hash_id}
                                className={`w-full border-b border-border p-3 cursor-pointer
                                    ${openingId === note.hash_id ? "bg-accent-menu" : "hover:bg-accent-menu"}`}
                                onClick={async () => {
                                    setOpeningId(note.hash_id)
                                    await gotoNote({id: note.hash_id, router})
                                }}
                            >
                                <div className="flex flex-row">
                                    <div className="border-r border-border flex-1 pr-2 min-w-0">
                                        {/* 검색은 폴더를 가로지르므로, 찾은 노트가 어디 있는지 경로로 알려준다. */}
                                        <div className="text-[11px] leading-tight text-subtle truncate">
                                            {folderPathLabel(folderData?.folders ?? [], note.folder?.hashId)}
                                        </div>
                                        <div className="font-bold truncate">{note.title || "제목 없음"}</div>
                                        <div className="overflow-hidden h-[3rem] pr-1 text-sm text-muted line-clamp-2"
                                             dangerouslySetInnerHTML={{__html: note.content}}
                                         />
                                    </div>
                                    <div
                                        className="flex-shrink-0 my-auto ml-auto text-right text-sm px-2 text-subtle">
                                        {openingId === note.hash_id
                                            ? <Spinner size={16} className="text-accent ml-auto"/>
                                            : note.created_at}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : didSearch && !isLoading && matchedFolders.length > 0 ? (
                        <p className="px-3 py-6 text-center text-sm text-subtle">맞는 노트는 없습니다</p>
                    ) : didSearch && !isLoading ? (
                        <div className="flex flex-col items-center justify-center flex-1 text-subtle gap-2">
                            <span className="text-4xl">🔍</span>
                            <span className="text-sm">검색 결과가 없습니다</span>
                        </div>
                    ) : (
                        <div className="flex flex-col pl-3 pt-3 flex-1 text-subtle gap-2">
                            <span className="text-sm">키워드를 입력하여 노트를 검색하세요</span>
                        </div>
                    )}

                    {/* 여기가 보이면 다음 쪽을 받는다. */}
                    {!isLoading && shownResults.length > 0 && hasMore && (
                        <div ref={sentinelRef} className="flex justify-center py-4">
                            {isLoadingMore && <Spinner size={16} className="text-accent"/>}
                        </div>
                    )}
                </div>
        </Modal>
    )
}