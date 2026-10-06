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
    /** 링크로 공개했는지. 켜져 있으면 링크가 있는 누구나 이 시리즈와 그 안의 노트를 읽는다. */
    is_public: boolean;
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
    is_public: boolean;
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

/** 링크로 공개한 시리즈를 로그인 없이 읽는 모양. */
export interface PublicSeries {
    hash_id: string;
    title: string;
    description: string;
    owner_name: string;
    /** 비밀번호가 걸린 노트는 제목 없이 is_locked 로만 온다. */
    notes: { hash_id: string, title: string, is_locked: boolean }[];
}
