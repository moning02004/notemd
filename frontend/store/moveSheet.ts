import {create} from "zustand"

interface MoveSheetStore {
    open: boolean
    noteHashes: string[]
    currentFolder: string | null

    /** 이동이 끝난 뒤 호출된다. 에디터처럼 react-query 밖에 있는 화면이 자기 상태를 갱신할 때 쓴다. */
    onMoved?: (folder: { hashId: string, name: string } | null) => void

    openSheet: (noteHashes: string[], currentFolder?: string | null,
                onMoved?: (folder: { hashId: string, name: string } | null) => void) => void
    closeSheet: () => void
}

/** 이동 시트는 카드 메뉴·선택 액션바·단축키 세 군데서 열리므로 상태를 밖에 둔다. */
export const useMoveSheetStore = create<MoveSheetStore>((set) => ({
    open: false,
    noteHashes: [],
    currentFolder: null,

    openSheet: (noteHashes, currentFolder = null, onMoved) =>
        set({open: noteHashes.length > 0, noteHashes, currentFolder, onMoved}),

    closeSheet: () => set({open: false, noteHashes: [], onMoved: undefined}),
}))
