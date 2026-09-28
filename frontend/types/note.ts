import {NoteWorkspace} from "@/types/workspace";
import {NoteFolder} from "@/types/folder";

export interface Tag {
    keyword: string;
    count: number
}

export interface NoteCard {
    hash_id: string,
    title: string;
    content: string;
    user_hash: string;
    owner_name: string;
    is_public: boolean;
    is_protected: boolean;
    is_shared: boolean;
    is_encrypted: boolean;
    is_password: boolean;
    created_at: string
    deleted_at: string | null
    folder: NoteFolder | null
}

export interface CreateNoteResponse {
    hash_id: string;
}

export interface CreateNoteImageResponse {
    url: string;
}

export interface NoteDetailResponse {
    detail: object | null;
    title: string | null;
    content: string | null;
    is_public: boolean;
    is_protected: boolean;
    is_encrypted: boolean;
    is_password: boolean;
    is_editable: boolean;
    /** 휴지통에 있는 노트. 주인에게만 이 표시와 함께 읽기 전용으로 내려온다. */
    is_deleted: boolean;
    password: string | null;
    tags: string[];
    workspaces: NoteWorkspace[];
    folder: NoteFolder | null;
    user_hash: string;
    /** 이 노트의 버전. 저장할 때 base_updated_at 으로 돌려준다(다른 곳의 저장을 덮어쓰지 않게). */
    updated_at: string | null;
}

export interface NoteSearchResult {
    hash_id: string;
    title: string | null;
    content: string | null;
    created_at: string;
    folder: NoteFolder | null;
}