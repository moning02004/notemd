// hooks/useTags.ts
import {useQuery} from "@tanstack/react-query"
import {apiRequest} from "@/lib/api"
import {Tag} from "@/types/note"

export function useTags() {
    return useQuery({
        queryKey: ["tags"],
        queryFn: () => apiRequest.get<Tag[]>("/tags"),
        staleTime: 1000 * 60 * 5,  // 5분 캐시
    })
}