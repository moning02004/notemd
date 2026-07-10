import {create} from "zustand";
import {createJSONStorage, persist} from 'zustand/middleware';

interface AuthState {
    token: string | null;
    userHash: string | null;
    setAuth: (token: string, userHash: string) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            userHash: null,
            setAuth: (token, userHash) => set({token, userHash}),
            logout: () => {
                set({token: null, userHash: null});
                useAuthStore.persist.clearStorage();
            }
        }),
        {
            name: 'auth-session-storage',
            storage: createJSONStorage(() => sessionStorage),
        }
    )
);
