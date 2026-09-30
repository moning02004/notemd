import {create} from "zustand";
import {createJSONStorage, persist} from 'zustand/middleware';

interface AuthState {
    token: string | null;
    userHash: string | null;
    /** 임시 비밀번호로 들어왔다. 새 비밀번호를 정하기 전까지 앱 대신 비밀번호 바꾸기 화면을 보여준다. */
    mustChangePassword: boolean;
    /** mustChangePassword 를 주지 않으면(토큰만 새로 받을 때) 지금 값을 그대로 둔다. */
    setAuth: (token: string, userHash: string, mustChangePassword?: boolean) => void;
    setMustChangePassword: (value: boolean) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            userHash: null,
            mustChangePassword: false,
            setAuth: (token, userHash, mustChangePassword) => set(state => ({
                token,
                userHash,
                mustChangePassword: mustChangePassword ?? state.mustChangePassword,
            })),
            setMustChangePassword: (value) => set({mustChangePassword: value}),
            logout: () => {
                set({token: null, userHash: null, mustChangePassword: false});
                useAuthStore.persist.clearStorage();
            }
        }),
        {
            name: 'auth-session-storage',
            storage: createJSONStorage(() => sessionStorage),
        }
    )
);
