import {useState, useRef, useEffect, SetStateAction, Dispatch} from "react";

const ALL_TAGS = [
    {name: "업무", color: "#4F8EF7", count: 12},
    {name: "아이디어", color: "#F7A74F", count: 8},
    {name: "개인", color: "#6DD4A0", count: 5},
    {name: "프로젝트", color: "#C97CF5", count: 20},
    {name: "회의록", color: "#F76D6D", count: 3},
    {name: "독서", color: "#4FC9F7", count: 7},
    {name: "할일", color: "#F7D74F", count: 15},
    {name: "레퍼런스", color: "#A4D65E", count: 9},
];

interface Props {
    selectedTags: string[];
    setSelectedTags:  Dispatch<SetStateAction<string[]>>;
}

export default function NoteTagInput({selectedTags, setSelectedTags}: Props) {
    const [query, setQuery] = useState("");
    const [highlightIndex, setHighlightIndex] = useState<number>(-1);
    const [open, setOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const filteredTags = ALL_TAGS.filter(
        (t) => t.name.includes(query) && !selectedTags.includes(t.name)
    );

    useEffect(() => {
        setOpen(query.trim().length > 0);
    }, [query]);

    const addTag = (name: string) => {
        if (selectedTags.includes(name)) return;

        setSelectedTags((prev) => [...prev, name]);
        setQuery("");
        setOpen(false);
        inputRef.current?.focus();
        setHighlightIndex(-1);
    };

    const removeTag = (name: string) => {
        setSelectedTags((prev) => prev.filter((t) => t !== name));
    };

    const handleKeyUp = (e: React.KeyboardEvent) => {
        if (!open) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightIndex((i) => Math.min(i + 1, filteredTags.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightIndex((i) => Math.max(i - 1, -1));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (highlightIndex >= 0) {
                addTag(filteredTags[highlightIndex].name);
            } else {
                addTag(query)
            }
        } else if (e.key === "Escape") {
            setOpen(false);
        }
    };

    const highlight = (text: string, q: string) => {
        const idx = text.indexOf(q);
        if (idx === -1) return <span>{text}</span>;
        return (
            <>
                {text.slice(0, idx)}
                <strong className="text-black">{text.slice(idx, idx + q.length)}</strong>
                {text.slice(idx + q.length)}
            </>
        );
    };

    return (
        <div className="flex flex-col p-5 border-b border-[#ededed]">
            <div className="font-bold px-2 mb-2">노트 태그</div>

            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyUp={handleKeyUp}
                    onClick={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                    placeholder="태그 검색..."
                    className="w-full border border-[#e0e0e0] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#aaa] bg-[#fafafa] focus:bg-white transition-colors placeholder:text-[#bbb]"
                />

                {open && (
                    <div
                        className="absolute top-[calc(100%+6px)] left-0 right-0 bg-white border border-[#e0e0e0] rounded-xl shadow-lg z-50 overflow-hidden">
                        {filteredTags.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-[#bbb] text-center" onClick={() => addTag(query)}>
                                태그 추가: <strong className="text-black">{query}</strong>
                            </div>
                        ) : (
                            filteredTags.map((tag, i) => (
                                <div
                                    key={tag.name}
                                    onMouseDown={() => addTag(tag.name)}
                                    className={`flex items-center gap-2 px-4 py-2 text-sm text-[#333] cursor-pointer transition-colors ${
                                        i === highlightIndex ? "bg-[#f5f5f5]" : "hover:bg-[#f5f5f5]"
                                    }`}
                                >
                  <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{background: tag.color}}
                  />
                                    <span className="flex-1">{highlight(tag.name, query)}</span>
                                    <span className="text-xs text-[#bbb]">{tag.count}</span>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {selectedTags.map((name) => {
                        const tag = ALL_TAGS.find((t) => t.name === name);
                        return (
                            <span
                                key={name}
                                className="inline-flex items-center gap-1.5 bg-[#f0f0f0] rounded-md px-2.5 py-1 text-xs text-[#444]"
                            >
                <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{background: tag?.color ?? "#ccc"}}
                />
                                {name}
                                <button
                                    onClick={() => removeTag(name)}
                                    className="text-[#aaa] hover:text-[#555] text-sm leading-none transition-colors"
                                >
                  ×
                </button>
              </span>
                        );
                    })}
                </div>
            )}
        </div>
    );
}