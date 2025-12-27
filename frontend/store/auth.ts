import {create} from "zustand";
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
    token: string | null;
    userId: number | null;
    setAuth: (token: string, userId: number) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            userId: null,
            setAuth: (token, userId) => set({token, userId}),
            logout: () => set({token: null, userId: null}),
        }),
        {
            name: 'auth-session-storage',
            storage: createJSONStorage(() => sessionStorage),
        }
    )
);
