import {useAuthStore} from "@/store/auth";
import {API_HOST} from "@/constants/api";
import {authLogout} from "@/lib/auth";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";
type RequestExtraOptions = {
    isMime?: boolean,
    isDownloadFile?: boolean
}

async function request<T = unknown>(endPoint: string,
                                    method: HttpMethod,
                                    options: RequestInit = {},
                                    extraOptions: RequestExtraOptions = {
                                        isMime: false,
                                        isDownloadFile: false
                                    }): Promise<T> {
    const {token, setAuth} = useAuthStore.getState();

    const headers = {
        ...(options.headers || {}),
        ...(token && {Authorization: `Bearer ${token}`}),
        ...(!extraOptions.isMime && {"Content-Type": "application/json"}),
    };

    let res = await fetch(`${API_HOST}${endPoint}`, {
        ...options,
        method,
        headers,
        credentials: "include",
    });


    if (res.status === 401) {
        const refreshRes = await fetch(`${API_HOST}/auth/refresh-token`, {
            method: "POST",
            credentials: "include",
            headers: {"Content-Type": "application/json"},
        })

        if (refreshRes.ok) {
            const data = await refreshRes.json();
            setAuth(data.access_token, data.user_id);

            headers.Authorization = `Bearer ${data.access_token}`;
            res = await fetch(`${API_HOST}${endPoint}`, {
                ...options,
                method,
                headers,
                credentials: "include",
            });
        } else {
            await authLogout();
            throw new Error("세션이 만료되었습니다. 다시 로그인해주세요.");
        }
    } else if (res.status.toString().startsWith("4")) {
        throw new Error("에러가 발생했습니다.")
    }

    if (!extraOptions.isDownloadFile) return await res.json().catch(() => null) as T
    return res as T;
}

export const apiRequest = {
    get: <T = unknown>(endPoint: string, options?: RequestInit, extraOptions?: RequestExtraOptions) => request<T>(endPoint, "GET", options, extraOptions),
    post: <T = unknown>(endPoint: string, options?: RequestInit, extraOptions?: RequestExtraOptions) => request<T>(endPoint, "POST", options, extraOptions),
    patch: <T = unknown>(endPoint: string, options?: RequestInit, extraOptions?: RequestExtraOptions) => request<T>(endPoint, "PATCH", options, extraOptions),
    delete: <T = unknown>(endPoint: string, options?: RequestInit, extraOptions?: RequestExtraOptions) => request<T>(endPoint, "DELETE", options, extraOptions),
};