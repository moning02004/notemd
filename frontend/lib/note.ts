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
