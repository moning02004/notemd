import {create} from 'zustand';

interface TopbarState {
    groups: Array<any>
    totalCount: number
    count: number
}

export const useTopbarStore = create<TopbarState>((set) => ({
    groups: [],
    totalCount: 0,
    count: 0,

    setGroups: (groups: Array<any>) => set({groups}),
    setTotalCount: (totalCount: number) => set({totalCount}),
    setCount: (count: number) => set({count}),
}));
