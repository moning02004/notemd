import {create} from "zustand"

interface NoteSelectStore {
    // 선택 모드
    selectMode: boolean
    selectedIds: Set<string>

    // 메뉴
    menuOpen: boolean

    // 액션
    enterSelectMode: () => void
    exitSelectMode: () => void
    toggleSelect: (id: string) => void
    selectAll: (ids: string[]) => void

    setMenuOpen: (open: boolean) => void
    toggleMenu: () => void
}

export const useNoteSelectStore = create<NoteSelectStore>((set, get) => ({
    selectMode: false,
    selectedIds: new Set(),
    menuOpen: false,

    enterSelectMode: () => set({selectMode: true, selectedIds: new Set(), menuOpen: false}),

    exitSelectMode: () => set({selectMode: false, selectedIds: new Set()}),

    toggleSelect: (id) => {
        const prev = get().selectedIds
        const next = new Set(prev)
        next.has(id) ? next.delete(id) : next.add(id)
        set({selectedIds: next})
    },

    selectAll: (ids) => set({selectedIds: new Set(ids)}),

    setMenuOpen: (open) => set({menuOpen: open}),

    toggleMenu: () => set(s => ({menuOpen: !s.menuOpen})),
}))