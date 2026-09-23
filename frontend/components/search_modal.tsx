import {useEffect, useRef, useState} from "react";
import {FiArrowLeft, FiX} from "react-icons/fi";
import {apiRequest} from "@/lib/api";
import DOMPurify from "dompurify";
import {gotoNote} from "@/lib/note";
import {useProgressRouter} from "@/hooks/useProgressRouter";
import {Spinner} from "@/components/icons";
import {Modal} from "@/components/ui/modal";
import {NoteSearchResult} from "@/types/note";
import {useFolders} from "@/hooks/useFolders";
import {folderPathLabel} from "@/types/folder";

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

    useEffect(() => {
        if (!isOpen) {
            setKeyword("")
            setResults([])
            setSearched(false)
            setOpeningId(null)
        }
    }, [isOpen])

    useEffect(() => {
        if (keyword === "") {
            setResults([])
            setSearched(false)
            return;
        }

        const timer = setTimeout(async () => {
            setIsLoading(true)
            setSearched(true)
            try {
                let data = await apiRequest.get<NoteSearchResult[]>(`/notes?keyword=${keyword}`)
                data = data.map(note => ({
                    ...note,
                    content: DOMPurify.sanitize((note.content || "").replace(/<[^>]*>/g, ""))
                }))
                setResults(data)
            } catch (e) {
                setResults([])
            } finally {
                setIsLoading(false)
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [keyword])

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
                            onClick={(e) => {
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
                    {isLoading ? (
                        Array.from({length: 4}).map((_, i) => <SkeletonItem key={i}/>)
                    ) : results.length > 0 ? (
                        results.map((note) => (
                            <div
                                key={note.hash_id}
                                className={`w-full border-b border-border p-3 cursor-pointer
                                    ${openingId === note.hash_id ? "bg-background" : "hover:bg-background"}`}
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
                    ) : searched && !isLoading ? (
                        <div className="flex flex-col items-center justify-center flex-1 text-subtle gap-2">
                            <span className="text-4xl">🔍</span>
                            <span className="text-sm">검색 결과가 없습니다</span>
                        </div>
                    ) : (
                        <div className="flex flex-col pl-3 pt-3 flex-1 text-subtle gap-2">
                            <span className="text-sm">키워드를 입력하여 노트를 검색하세요</span>
                        </div>
                    )}
                </div>
        </Modal>
    )
}