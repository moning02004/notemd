import {useAuthStore} from "@/store/auth";
import {API_HOST} from "@/constants/api";
import {authLogout} from "@/lib/auth";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

async function request<T = unknown>(endPoint: string,
                                    method: HttpMethod,
                                    options: RequestInit = {},
                                    contentType?: string | null): Promise<T> {
    const {token, setAuth} = useAuthStore.getState();

    const headers = {
        ...(options.headers || {}),
        ...(token && {Authorization: `Bearer ${token}`}),
        ...(contentType !== null && {
            "Content-Type": "application/json",
        }),
    };
    console.log(headers)
    let res = await fetch(`${API_HOST}${endPoint}`, {
        ...options,
        method,
        headers,
        credentials: "include",
    });

    let responseData = await res.json().catch(() => null);
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
            responseData = await res.json().catch(() => null);
        } else {
            authLogout();
            throw new Error("세션이 만료되었습니다. 다시 로그인해주세요.");
        }
    } else if (res.status.toString().startsWith("4")) {
        throw new Error("에러가 발생했습니다.")
    }

    return responseData as T;
}

export const apiRequest = {
    get: <T = unknown>(endPoint: string, options?: RequestInit, contentType?: string | null) => request<T>(endPoint, "GET", options, contentType),
    post: <T = unknown>(endPoint: string, options?: RequestInit, contentType?: string | null) => request<T>(endPoint, "POST", options, contentType),
    patch: <T = unknown>(endPoint: string, options?: RequestInit, contentType?: string | null) => request<T>(endPoint, "PATCH", options, contentType),
    delete: <T = unknown>(endPoint: string, options?: RequestInit, contentType?: string | null) => request<T>(endPoint, "DELETE", options, contentType),
};