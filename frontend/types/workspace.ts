
export interface UserAccount {
    userHash: string;
    username: string;
    name: string;
    createdAt: string;
}

export interface WorkspaceMember {
    userHash: string;
    username: string;
    name: string;
}

export interface WorkspaceInfoResponse {
    hash_id: string;
    name: string;
    description: string;
    user_count: number;
}

export interface Workspace {
    hashId: string;
    name: string;
    description: string;
    userCount: number;
}

export interface NoteWorkspace {
    hashId: string;
    name: string;
}
