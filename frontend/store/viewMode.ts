import {create} from "zustand"
import {createJSONStorage, persist} from "zustand/middleware"

export type ViewMode = "card" | "list"

interface ViewModeStore {
    viewMode: ViewMode
    setViewMode: (mode: ViewMode) => void
}

export const useViewModeStore = create<ViewModeStore>()(
    persist(
        (set) => ({
            viewMode: "card",
            setViewMode: (mode) => set({viewMode: mode}),
        }),
        {
            name: "note-view-mode",
            storage: createJSONStorage(() => localStorage),
        }
    )
)