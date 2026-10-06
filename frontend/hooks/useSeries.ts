import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query"
import toast from "react-hot-toast"
import {apiRequest} from "@/lib/api"
import {Series, SeriesDetail, SeriesInput} from "@/types/series"

const SERIES_KEY = ["series"]

export function useSeriesList(enabled: boolean = true) {
    return useQuery({
        queryKey: SERIES_KEY,
        queryFn: () => apiRequest.get<Series[]>("/series"),
        enabled,
    })
}

export function useSeriesDetail(hashId: string | null) {
    return useQuery({
        queryKey: [...SERIES_KEY, hashId],
        queryFn: () => apiRequest.get<SeriesDetail>(`/series/${hashId}`),
        enabled: Boolean(hashId),
        retry: false,
    })
}

const body = ({title, description, noteHashes}: SeriesInput) =>
    JSON.stringify({title, description, note_hashes: noteHashes})

export function useCreateSeries() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (input: SeriesInput) => apiRequest.post<SeriesDetail>("/series", {body: body(input)}),
        onSuccess: () => queryClient.invalidateQueries({queryKey: SERIES_KEY}),
        onError: (error: Error) => toast.error(error.message),
    })
}

export function useUpdateSeries() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({hashId, ...input}: SeriesInput & { hashId: string }) =>
            apiRequest.patch<SeriesDetail>(`/series/${hashId}`, {body: body(input)}),
        onSuccess: () => queryClient.invalidateQueries({queryKey: SERIES_KEY}),
        onError: (error: Error) => toast.error(error.message),
    })
}

export function useDeleteSeries() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (hashId: string) => apiRequest.delete(`/series/${hashId}`),
        onSuccess: () => queryClient.invalidateQueries({queryKey: SERIES_KEY}),
        onError: (error: Error) => toast.error(error.message),
    })
}
