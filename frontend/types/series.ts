export interface SeriesNote {
    hash_id: string;
    title: string;
}

export interface Series {
    hash_id: string;
    title: string;
    description: string;
    /** 휴지통에 있는 노트는 세지 않는다. */
    note_count: number;
    updated_at: string;
}

export interface SeriesDetail extends Series {
    /** 시리즈 안의 순서 그대로. */
    notes: SeriesNote[];
}

/** 노트 화면이 그리는 '시리즈의 몇 번째인지' 와 앞·뒤 노트. */
export interface NoteSeries {
    hash_id: string;
    title: string;
    position: number;
    total: number;
    prev: SeriesNote | null;
    next: SeriesNote | null;
}

export interface SeriesInput {
    title: string;
    description: string;
    noteHashes: string[];
}
