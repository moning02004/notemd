import {create} from "zustand"
import {createJSONStorage, persist} from "zustand/middleware"

interface FolderUiStore {
    /** 펼쳐둔 폴더 hash 목록. 새로고침해도 보던 자리로 돌아오게 기억한다. */
    expanded: string[]
    /** 목록에 하위 폴더 노트까지 함께 보여줄지 */
    includeSub: boolean
    /**
     * 개인 노트(루트)에서 폴더 안 노트까지 함께 보여줄지. 폴더 안의 값과 따로 둔다.
     * 폴더에서 켜 둔 것이 루트까지 따라오면, 폴더로 옮긴 노트가 루트에 다시 나타난다.
     */
    includeSubRoot: boolean

    toggleExpanded: (hashId: string) => void
    expand: (hashIds: string[]) => void
    setIncludeSub: (value: boolean) => void
    setIncludeSubRoot: (value: boolean) => void
}

export const useFolderUiStore = create<FolderUiStore>()(
    persist(
        (set, get) => ({
            expanded: [],
            includeSub: false,
            includeSubRoot: false,

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
            setIncludeSubRoot: (value) => set({includeSubRoot: value}),
        }),
        {
            name: "note-folder-ui",
            storage: createJSONStorage(() => localStorage),
        }
    )
)
