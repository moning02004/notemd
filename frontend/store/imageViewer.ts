import {create} from "zustand"

/**
 * 본문 이미지를 크게 보는 창. 편집 화면과 참조 패널 어디서 열든 창은 하나다.
 * 노트 안의 이미지를 순서대로 넘겨 볼 수 있게 목록째 넘긴다.
 */
interface ImageViewerState {
    images: string[]
    index: number
    isOpen: boolean
    open: (images: string[], index: number) => void
    go: (index: number) => void
    /** 지금 보고 있는 것에서 delta 만큼 넘긴다. 키를 빠르게 연달아 눌러도 한 칸씩 정확히 간다. */
    step: (delta: number) => void
    close: () => void
}

export const useImageViewerStore = create<ImageViewerState>((set, get) => ({
    images: [],
    index: 0,
    isOpen: false,
    open: (images, index) => set({images, index, isOpen: images.length > 0}),
    go: index => {
        const {images} = get()
        if (images.length === 0) return
        set({index: (index + images.length) % images.length})
    },
    step: delta => get().go(get().index + delta),
    close: () => set({isOpen: false}),
}))
