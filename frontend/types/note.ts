import {NoteWorkspace} from "@/types/workspace";

export interface Tag {
    keyword: string;
    count: number
}

export interface NoteCard {
    hash_id: string,
    title: string;
    content: string;
    owner_name: string;
    is_public: boolean;
    is_protected: boolean;
    is_shared: boolean;
    created_at: string
}

export interface CreateNoteResponse {
    hash_id: string;
}

export interface CreateNoteImageResponse {
    url: string;
}

export interface NoteDetailResponse {
    title: string | null;
    content: string | null;
    is_public: boolean;
    is_protected: boolean;
    is_encrypted: boolean;
    password: string | null;
    tags: string[];
    workspaces: NoteWorkspace[];
    user_hash: string;
}

export interface NoteSearchResult {
    hash_id: string;
    title: string | null;
    content: string | null;
    created_at: string;
}