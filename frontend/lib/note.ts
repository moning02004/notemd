import DOMPurify from "dompurify";
import {apiRequest} from "@/lib/api";
import {CreateNoteResponse} from "@/types/note";

/** next 의 router 와 useProgressRouter 가 모두 들어올 수 있도록 push 만 요구한다. */
type PushRouter = { push: (href: string) => void }

export const gotoNote = async ({id, router, folder}: {
    id: string | null,
    router: PushRouter
    /** 새 노트를 만들 때 들어갈 폴더. 없으면 미분류에서 시작한다. */
    folder?: string | null
}) => {
    if (id === null) {
        const res = await apiRequest.post<CreateNoteResponse>("/notes", {
            body: JSON.stringify({folder: folder ?? null}),
        });
        id = res.hash_id
    }

    router.push(`/s/${id}`)
}

const JUST_LEFT_KEY = "note-just-left"

/**
 * 공동 편집 중인 노트를 지금 저장하게 한다. 공동 편집의 저장은 편집 뒤 몇 초씩 늦어서,
 * 쓰고 곧바로 목록으로 나오면 목록이 저장되기 전의 본문을 보여줬다.
 * 실패해도 조용히 넘어간다(저장은 어차피 곧 된다). 나가는 길을 오래 막지 않게 기다림에 끝을 둔다.
 */
export const flushNote = (noteId: string, timeoutMs = 3000) => new Promise<void>(resolve => {
    const timer = setTimeout(resolve, timeoutMs)
    apiRequest.post(`/notes/${noteId}/flush`, {}, {isSilent: true})
        .catch(() => {})
        .finally(() => {
            clearTimeout(timer)
            resolve()
        })
})

/** 편집 화면을 떠날 때 어느 노트였는지 적어 둔다. 브라우저의 뒤로 가기처럼 미리 저장시키지 못한 길을 목록이 메운다. */
export const markNoteLeft = (noteId: string) => {
    try {
        sessionStorage.setItem(JUST_LEFT_KEY, noteId)
    } catch {
        // 저장소를 못 쓰면(사생활 보호 모드 등) 목록이 한 번 늦게 따라올 뿐이다.
    }
}

/** 방금 떠난 노트가 있으면 돌려주고 표시를 지운다. */
export const takeNoteLeft = (): string | null => {
    try {
        const noteId = sessionStorage.getItem(JUST_LEFT_KEY)
        if (noteId) sessionStorage.removeItem(JUST_LEFT_KEY)
        return noteId
    } catch {
        return null
    }
}

export type DownloadFormat = "md" | "pdf"

export const downloadNoteRequest = async (noteHashes: Array<string>, format: DownloadFormat = "md") => {
    const res = await apiRequest.post<Response>("/notes/download",
        {body: JSON.stringify({note_hashes: noteHashes, file_format: format})},
        {isDownloadFile: true}
    );
    await saveResponseAsFile(res)
}

/** 시리즈를 그 제목의 zip 으로 받는다. 안의 파일은 '순서. 노트 제목' 이다. */
export const downloadSeriesRequest = async (seriesHash: string, format: DownloadFormat = "pdf") => {
    const res = await apiRequest.post<Response>(`/series/${seriesHash}/download`,
        {body: JSON.stringify({file_format: format})},
        {isDownloadFile: true}
    );
    await saveResponseAsFile(res)
}

/** 노트·스냅샷·템플릿을 담은 마크다운 zip 을 받는다(설정의 데이터 내보내기). */
export const exportAllNotes = async () => {
    const res = await apiRequest.get<Response>("/notes/export", {}, {isDownloadFile: true})
    await saveResponseAsFile(res)
}

/** 파일 응답을 Content-Disposition 의 이름으로 내려받는다. */
async function saveResponseAsFile(res: Response) {
    if (!res.ok) {
        throw new Error(`다운로드 실패: ${res.status}`);
    }
    const disposition = res.headers.get("Content-Disposition");
    const filename = extractFilename(disposition) ?? "download";

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);
}

function extractFilename(disposition: string) {
    if (!disposition) return null;

    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/);
    if (utf8Match) {
        return decodeURIComponent(utf8Match[1]);
    }

    const basicMatch = disposition.match(/filename="?([^"]+)"?/);
    if (basicMatch) {
        return basicMatch[1];
    }

    return null;
}

/**
 * 본문 HTML 을 목록 미리보기용 한 줄 글로 만든다.
 *
 * 태그만 걷어내면 문단·제목·목록 사이에 공백이 없어 "목표메모 앱의…" 처럼 글이 붙는다.
 * 블록이 끝나는 자리마다 공백을 둔 뒤 걷어낸다.
 */
export const previewText = (html: string | null | undefined) =>
    DOMPurify.sanitize(
        (html ?? "").replace(/<\/(p|h[1-6]|li|div|blockquote|pre|td|th|summary)>|<br\s*\/?>/gi, "$& "),
        {ALLOWED_TAGS: [], ALLOWED_ATTR: []},
    )
        .replace(/\s+/g, " ")
        .trim()
