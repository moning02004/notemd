import {apiRequest} from "@/lib/api";
import {useAuthStore} from "@/store/auth";
import Cookies from "js-cookie";

export const authLogout = async () => {
    const {logout} = useAuthStore.getState();

    Cookies.remove('auto-login')
    Cookies.remove('refreshtoken')
    apiRequest.delete("/auth/token").finally(() => {
        logout()
        window.location.replace("/login")
    })
}