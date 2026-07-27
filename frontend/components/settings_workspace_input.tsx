import {Dispatch, SetStateAction, useEffect, useRef, useState} from "react";
import {apiRequest} from "@/lib/api";
import {NoteWorkspace, WorkspaceInfoResponse} from "@/types/workspace";
import {useAuthStore} from "@/store/auth";

interface Props {
    selectedWorkspaces: NoteWorkspace[];
    setSelectedWorkspaces: Dispatch<SetStateAction<NoteWorkspace[]>>;
}

export default function SettingsWorkspaceInput({selectedWorkspaces, setSelectedWorkspaces}: Props) {
    const {userHash} = useAuthStore.getState();
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const [workspaces, setWorkspaces] = useState<NoteWorkspace[]>([])

    const filteredWorkspace = (workspaces: NoteWorkspace[]) => {
        return workspaces.filter((t) => t.name.includes(query) &&
            !selectedWorkspaces.map(x => x.hashId).includes(t.hashId)
        );
    }
    useEffect(() => {
        const fetchWorkspace = async () => {
            const data = await apiRequest.get<WorkspaceInfoResponse[]>(`/users/${userHash}/workspaces`);
            setWorkspaces(data.map(x => ({hashId: x.hash_id, name: x.name})))
        }
        if (userHash) fetchWorkspace()
    }, [userHash]);

    useEffect(() => {
        setOpen(query.trim().length > 0);
    }, [query]);

    const addWorkspace = (workspace: NoteWorkspace) => {
        const alreadySelectedWorkspaceHashIds = selectedWorkspaces.map(x => x.hashId)
        if (alreadySelectedWorkspaceHashIds.includes(workspace.hashId)) return;

        setSelectedWorkspaces((prev) => [...prev, {hashId: workspace.hashId, name: workspace.name}]);
        setQuery("");
        setOpen(false);
        inputRef.current?.focus();
    };

    const removeWorkspace = (hashId: string) => {
        setSelectedWorkspaces((prev) => prev.filter((workspace) => workspace.hashId !== hashId));
    };

    const handleKeyUp = (e: React.KeyboardEvent) => {
        if (open && e.key === "Escape") {
            setOpen(false);
        }
    };

    return (
        <div className="flex flex-col pb-7">
            <div className="font-bold mb-2">워크스페이스 공유</div>

            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyUp={handleKeyUp}
                    onClick={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                    placeholder="공유할 워크스페이스"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-subtle bg-background focus:bg-surface transition-colors placeholder:text-subtle"
                />

                {open && (
                    <div
                        className="absolute top-[calc(100%+6px)] left-0 right-0 bg-surface border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                        {filteredWorkspace(workspaces).length === 0 ? (
                            <p className="px-4 py-3 text-sm text-subtle">공유할 워크스페이스가 없습니다.</p>
                        ) : (
                            filteredWorkspace(workspaces).map((workspace, i) => (
                                <div
                                    key={workspace.hashId}
                                    onMouseDown={() => addWorkspace(workspace)}
                                    className={`flex hover:bg-background items-center gap-2 px-4 py-2 text-sm text-foreground cursor-pointer transition-colors`}
                                >
                                    <span className="flex-1">{workspace.name}</span>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {selectedWorkspaces.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {selectedWorkspaces.map((workspace) => {
                        return (
                            <span
                                key={workspace.hashId}
                                className="inline-flex items-center gap-1.5 bg-background rounded-md px-2.5 py-1 text-xs text-foreground"
                            >
                                {workspace.name}
                                <button
                                    onClick={() => removeWorkspace(workspace.hashId)}
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