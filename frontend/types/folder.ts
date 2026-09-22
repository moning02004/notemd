export interface FolderNode {
    hash_id: string;
    name: string;
    parent_hash: string | null;
    depth: number;
    /** "프로젝트 / notemd" 형태의 전체 경로. 이동 시트와 검색 결과에서 쓴다. */
    path: string;
    /** 이 폴더에 직접 들어 있는 노트 수 */
    note_count: number;
    /** 하위 폴더까지 합한 수 */
    total_count: number;
    children: FolderNode[];
}

export interface FolderTree {
    folders: FolderNode[];
    unfiled_count: number;
}

export interface NoteFolder {
    hashId: string;
    name: string;
}

/** 미분류를 폴더처럼 다루기 위한 가상 hash. URL 쿼리 값으로도 쓴다. */
export const UNFILED = "unfiled"

export function flattenFolders(folders: FolderNode[]): FolderNode[] {
    return folders.flatMap(folder => [folder, ...flattenFolders(folder.children)])
}

export function findFolder(folders: FolderNode[], hashId: string | null): FolderNode | null {
    if (!hashId) return null
    return flattenFolders(folders).find(folder => folder.hash_id === hashId) ?? null
}
