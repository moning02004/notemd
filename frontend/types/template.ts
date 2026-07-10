export interface Template {
    hash_id: string;
    name: string;        // 템플릿 이름
    description: string; // 템플릿 설명
    title: string;       // 덮어써질 노트 제목
    content: string;     // 덮어써질 노트 내용
}
