import {useState, useRef, useEffect, SetStateAction, Dispatch} from "react";
import {apiRequest} from "@/lib/api";
import {Tag} from "@/types/note";

interface Props {
    selectedTags: string[];
    setSelectedTags: Dispatch<SetStateAction<string[]>>;
}

export default function NoteTagInput({selectedTags, setSelectedTags}: Props) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const [tags, setTags] = useState<Tag[]>([])

    const filteredTags = (tags: Tag[]) => {
        return tags.filter((t) => t.keyword.includes(query) && !selectedTags.includes(t.keyword)
        );
    }

    useEffect(() => {
        const fetchTags = async () => {
            const tagData = await apiRequest.get<Array<Tag>>("/tags?total=0");
            setTags(tagData)
        }
        fetchTags()
    }, []);

    useEffect(() => {
        setOpen(query.trim().length > 0);
    }, [query]);

    const addTag = (name: string) => {
        if (selectedTags.includes(name)) return;

        setSelectedTags((prev) => [...prev, name]);
        setQuery("");
        setOpen(false);
        inputRef.current?.focus();
    };

    const removeTag = (name: string) => {
        setSelectedTags((prev) => prev.filter((t) => t !== name));
    };

    const handleKeyUp = (e: React.KeyboardEvent) => {
        if (!open) return;

        if (e.key === "Enter") {
            e.preventDefault();
            addTag(query)
        } else if (e.key === "Escape") {
            setOpen(false);
        }
    };

    return (
        <div className="flex flex-col pb-7">
            <div className="font-bold mb-2">노트 태그</div>

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
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-subtle bg-background focus:bg-surface transition-colors placeholder:text-subtle"
                />

                {open && (
                    <div
                        className="absolute top-[calc(100%+6px)] left-0 right-0 bg-surface border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                        {filteredTags(tags).length === 0 ? (
                            <div className="px-4 py-3 text-sm text-subtle text-center" onClick={() => addTag(query)}>
                                태그 추가: <strong className="text-foreground">{query}</strong>
                            </div>
                        ) : (
                            filteredTags(tags).map((tag, i) => (
                                <div
                                    key={tag.keyword}
                                    onMouseDown={() => addTag(tag.keyword)}
                                    className={`flex hover:bg-background items-center gap-2 px-4 py-2 text-sm text-foreground cursor-pointer transition-colors`}
                                >
                                    <span className="flex-1">{tag.keyword}</span>
                                    <span className="text-xs text-subtle">{tag.count}</span>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {selectedTags.map((name) => {
                        return (
                            <span
                                key={name}
                                className="inline-flex items-center gap-1.5 bg-background rounded-md px-2.5 py-1 text-xs text-foreground"
                            >
                                {name}
                                <button
                                    onClick={() => removeTag(name)}
                                    className="text-subtle hover:text-muted text-sm leading-none transition-colors"
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