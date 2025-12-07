import {create} from 'zustand';

interface EditState {
    isOpenedSetting: boolean;
    setOpenedSetting: (flag: boolean) => void;
}

export const useEditStore = create<EditState>((set) => ({
    isOpenedSetting: false,
    setOpenedSetting: (isOpenedSetting) => set({isOpenedSetting}),

}));
