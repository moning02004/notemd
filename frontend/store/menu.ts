import {create} from 'zustand';

interface MenuState {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

export const useMenuStore = create<MenuState>((set) => ({
    isOpen: false,
    setIsOpen: (isOpen: boolean) => set({isOpen})
}));
