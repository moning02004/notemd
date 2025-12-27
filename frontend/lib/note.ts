import {apiRequest} from "@/lib/api";
import type {AppRouterInstance} from "next/dist/shared/lib/app-router-context.shared-runtime";

export const gotoNote = async ({id, router, title, content}: {
    id: string | null,
    router: AppRouterInstance
    title?: string
    content?: string
}) => {
    if (id === null) {
        const res = await apiRequest.post("/notes", {
            body: JSON.stringify({
                title: title || "",
                content: content || ""
            })
        });
        id = res.hash_id
    }

    router.push(`/s/${id}`)
}
