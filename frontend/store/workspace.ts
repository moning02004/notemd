import {create} from "zustand"
import {apiRequest} from "@/lib/api"
import {Workspace} from "@/types/workspace"

type WorkspaceResponse = { hash_id: string, name: string, description: string, user_count: number }

interface WorkspaceStore {
    workspaces: Workspace[]
    selectedWorkspaceId: string | null
    isLoading: boolean
    hasLoaded: boolean
    fetchWorkspaces: (userHash: string) => Promise<void>
    setSelectedWorkspaceId: (id: string | null) => void
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
    workspaces: [],
    selectedWorkspaceId: null,
    isLoading: false,
    hasLoaded: false,

    fetchWorkspaces: async (userHash) => {
        if (get().isLoading || get().hasLoaded) return
        set({isLoading: true})

        try {
            const data = await apiRequest.get<WorkspaceResponse[]>(`/users/${userHash}/workspaces`)
            const workspaces: Workspace[] = (data ?? []).map(w => ({
                hashId: w.hash_id,
                name: w.name,
                description: w.description,
                userCount: w.user_count,
            }))
            set(state => ({
                workspaces,
                selectedWorkspaceId: state.selectedWorkspaceId ?? workspaces[0]?.hashId ?? null,
                isLoading: false,
                hasLoaded: true,
            }))
        } catch {
            // 워크스페이스 조회 권한이 없는 사용자는 빈 목록으로 처리
            set({workspaces: [], isLoading: false, hasLoaded: true})
        }
    },

    setSelectedWorkspaceId: (id) => set({selectedWorkspaceId: id}),
}))