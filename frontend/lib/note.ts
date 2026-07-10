import {apiRequest} from "@/lib/api";
import type {AppRouterInstance} from "next/dist/shared/lib/app-router-context.shared-runtime";
import {CreateNoteResponse} from "@/types/note";

export const gotoNote = async ({id, router}: {
    id: string | null,
    router: AppRouterInstance
}) => {
    if (id === null) {
        const res = await apiRequest.post<CreateNoteResponse>("/notes");
        id = res.hash_id
    }

    router.push(`/s/${id}`)
}

export const downloadNoteRequest = async (noteHashes: Array<string>) => {
    const res = await apiRequest.post<Response>("/notes/download",
        {body: JSON.stringify({note_hashes: noteHashes})},
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
