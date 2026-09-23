import {create} from "zustand"

interface ProgressStore {
    /** 진행 중인 일의 수. 0 보다 크면 상단 막대가 보인다. */
    pending: number
    /** 이동 중인 목적지. 화면이 바뀌기 전에도 누른 메뉴를 강조하는 데 쓴다. */
    navHref: string | null
    start: () => void
    done: () => void
    setNavHref: (href: string | null) => void
}

export const useProgressStore = create<ProgressStore>((set) => ({
    pending: 0,
    navHref: null,
    start: () => set(state => ({pending: state.pending + 1})),
    done: () => set(state => ({pending: Math.max(0, state.pending - 1)})),
    setNavHref: (href) => set({navHref: href}),
}))

/**
 * 이동 중인 목적지의 경로(쿼리 제외). 아직 화면이 바뀌지 않았어도
 * 누른 메뉴를 바로 강조해, 누른 게 먹혔는지 의심할 틈을 없앤다.
 */
export const useNavigatingPath = () =>
    useProgressStore(state => state.navHref?.split("?")[0] ?? null)

/** 훅을 쓸 수 없는 곳(api 래퍼 등)에서 쓰는 단축 호출 */
export const startProgress = () => useProgressStore.getState().start()
export const doneProgress = () => useProgressStore.getState().done()
