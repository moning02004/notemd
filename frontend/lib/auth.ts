import {apiRequest} from "@/lib/api";
import {useAuthStore} from "@/store/auth";
import Cookies from "js-cookie";
import {clearLocalNotes} from "@/lib/collab_local";

export const authLogout = async () => {
    const {logout} = useAuthStore.getState();

    Cookies.remove('auto-login')
    Cookies.remove('refreshtoken')
    apiRequest.delete("/auth/token").finally(async () => {
        logout()
        // 오프라인 편집용으로 이 기기에 둔 노트 사본도 지운다(공용 컴퓨터에 남지 않게).
        await clearLocalNotes()
        window.location.replace("/login")
    })
}