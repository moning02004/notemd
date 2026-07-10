import {useEffect, useRef, useState} from "react";
import {FiArrowLeft, FiX} from "react-icons/fi";
import {apiRequest} from "@/lib/api";
import DOMPurify from "dompurify";
import {gotoNote} from "@/lib/note";
import {useRouter} from "next/navigation";
import {Modal} from "@/components/ui/modal";
import {NoteSearchResult} from "@/types/note";

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const SkeletonItem = () => (
    <div className="w-full border-b border-gray-200 p-3 animate-pulse">
        <div className="flex flex-row">
            <div className="border-r border-gray-200 pr-2 space-y-2 flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/3"/>
                <div className="h-3 bg-gray-200 rounded w-full"/>
                <div className="h-3 bg-gray-200 rounded w-5/6"/>
            </div>
            <div className="flex-1 my-auto ml-auto text-right pr-2">
                <div className="h-3 bg-gray-200 rounded w-16 ml-auto"/>
            </div>
        </div>
    </div>
);

export const SearchModal = ({isOpen, onClose}: Props) => {
    const router = useRouter();

    const keywordRef = useRef(null)
    const [keyword, setKeyword] = useState("")
    const [results, setResults] = useState<NoteSearchResult[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [searched, setSearched] = useState(false)

    useEffect(() => {
        if (!isOpen) {
            setKeyword("")
            setResults([])
            setSearched(false)
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
        <Modal isOpen={isOpen} onClose={onClose}
               className="md:rounded-xl w-full max-w-2xl md:mx-4 md:h-[90vh] h-[100vh]">
                <div className="flex items-center justify-between py-4 border-b border-gray-100">
                    <button
                        onClick={onClose}
                        className="md:hidden block p-3 hover:bg-gray-100 rounded-md transition-colors"
                    >
                        <FiArrowLeft size={20}/>
                    </button>
                    <div className="w-full py-2 border-b mx-3 relative group">
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
                            className="cursor-pointer rounded-full hover:bg-[#efefef] group-hover:block hidden p-2 absolute right-0 top-[50%] -translate-y-[50%]"
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
                                className="hover:bg-gray-100 w-full border-b border-gray-200 p-3 cursor-pointer"
                                onClick={() => gotoNote({id: note.hash_id, router})}
                            >
                                <div className="flex flex-row">
                                    <div className="border-r border-gray-200 flex-1 pr-2">
                                        <div className="font-bold truncate">{note.title || "제목 없음"}</div>
                                        <div className="overflow-hidden h-[3rem] pr-1 text-sm text-gray-500 line-clamp-2"
                                             dangerouslySetInnerHTML={{__html: note.content}}
                                         />
                                    </div>
                                    <div
                                        className="flex-shrink-0 my-auto ml-auto text-right text-sm px-2 text-gray-400">
                                        {note.created_at}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : searched && !isLoading ? (
                        <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-2">
                            <span className="text-4xl">🔍</span>
                            <span className="text-sm">검색 결과가 없습니다</span>
                        </div>
                    ) : (
                        <div className="flex flex-col pl-3 pt-3 flex-1 text-gray-400 gap-2">
                            <span className="text-sm">키워드를 입력하여 노트를 검색하세요</span>
                        </div>
                    )}
                </div>
        </Modal>
    )
}