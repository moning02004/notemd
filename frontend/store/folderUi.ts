import {create} from "zustand"
import {createJSONStorage, persist} from "zustand/middleware"

interface FolderUiStore {
    /** 펼쳐둔 폴더 hash 목록. 새로고침해도 보던 자리로 돌아오게 기억한다. */
    expanded: string[]
    /** 목록에 하위 폴더 노트까지 함께 보여줄지 */
    includeSub: boolean

    toggleExpanded: (hashId: string) => void
    expand: (hashIds: string[]) => void
    setIncludeSub: (value: boolean) => void
}

export const useFolderUiStore = create<FolderUiStore>()(
    persist(
        (set, get) => ({
            expanded: [],
            includeSub: false,

            toggleExpanded: (hashId) => {
                const expanded = get().expanded
                set({
                    expanded: expanded.includes(hashId)
                        ? expanded.filter(id => id !== hashId)
                        : [...expanded, hashId],
                })
            },

            expand: (hashIds) => {
                const expanded = new Set(get().expanded)
                hashIds.forEach(id => expanded.add(id))
                set({expanded: [...expanded]})
            },

            setIncludeSub: (value) => set({includeSub: value}),
        }),
        {
            name: "note-folder-ui",
            storage: createJSONStorage(() => localStorage),
        }
    )
)
