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
    /**
     * 다른 화면에서 노트 목록으로 가면서 선택 모드를 켜 달라고 맡긴다(시리즈 화면의 '노트 고르러 가기').
     * 화면이 바뀔 때 선택 모드를 끄는 쪽(Topbar)이 이 표시를 보고 대신 켠다.
     */
    pendingSelect: boolean
    requestSelectMode: () => void

    setMenuOpen: (open: boolean) => void
    toggleMenu: () => void
}

export const useNoteSelectStore = create<NoteSelectStore>((set, get) => ({
    selectMode: false,
    selectedIds: new Set(),
    menuOpen: false,
    pendingSelect: false,

    enterSelectMode: () => set({selectMode: true, selectedIds: new Set(), menuOpen: false, pendingSelect: false}),

    requestSelectMode: () => set({pendingSelect: true}),

    exitSelectMode: () => set({selectMode: false, selectedIds: new Set()}),

    toggleSelect: (id) => {
        const prev = get().selectedIds
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        set({selectedIds: next})
    },

    selectAll: (ids) => set({selectedIds: new Set(ids)}),

    setMenuOpen: (open) => set({menuOpen: open}),

    toggleMenu: () => set(s => ({menuOpen: !s.menuOpen})),
}))