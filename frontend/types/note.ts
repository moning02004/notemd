export interface NoteCard {
    hash_id: string,
    title: string;
    content: string;
    is_public: boolean;
    created_at: string
}

export interface CreateNoteResponse {
    hash_id: string;
}

export interface CreateNoteImageResponse {
    url: string;
}