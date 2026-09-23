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

export type DownloadFormat = "md" | "pdf"

export const downloadNoteRequest = async (noteHashes: Array<string>, format: DownloadFormat = "md") => {
    const res = await apiRequest.post<Response>("/notes/download",
        {body: JSON.stringify({note_hashes: noteHashes, file_format: format})},
        {isDownloadFile: true}
    );

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
