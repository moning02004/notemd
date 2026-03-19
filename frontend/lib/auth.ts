import {apiRequest} from "@/lib/api";
import {useAuthStore} from "@/store/auth";

export const authLogout = async () => {
    const {logout} = useAuthStore.getState();

    apiRequest.delete("/auth/token")
    logout()
    window.location.replace("/")
}