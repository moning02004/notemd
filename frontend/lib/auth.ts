import {apiRequest} from "@/lib/api";
import {useAuthStore} from "@/store/auth";

export const authLogout = async () => {

    await apiRequest.delete("/auth/token").then(r => {
        const {logout} = useAuthStore.getState();
        logout()
    })
}