import {useAuthStore} from "@/store/auth";
import {API_HOST} from "@/constants/api";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

async function request<T = unknown>(endPoint: string, method: HttpMethod, options: RequestInit = {}) {
    const {token, setToken, logout} = useAuthStore.getState();

    const headers = {
        ...(options.headers || {}),
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
    };

    let res = await fetch(`${API_HOST}${endPoint}`, {...options, method, headers});
    let responseData = await res.json().catch(() => null);

    if (res.status === 401) {
        const refreshRes = await fetch(`${API_HOST}/auth/refresh-token`, {
            method: "POST",
            credentials: "include",
        });

        if (refreshRes.ok) {
            const data = await refreshRes.json();
            setToken(data.access_token);

            headers.Authorization = `Bearer ${data.access_token}`;
            res = await fetch(endPoint, {...options, method, headers});
            responseData = await res.json().catch(() => null);
        } else {
            logout();
            throw new Error("Session expired. Please login again.");
        }
    } else if (res.status.toString().startsWith("4")) {
        console.log(responseData)
        throw new Error("에러가 발생했습니다.");
    }

    return responseData as T;
}

export const apiRequest = {
    get: <T = unknown>(endPoint: string, options?: RequestInit) => request<T>(endPoint, "GET", options),
    post: <T = unknown>(endPoint: string, options?: RequestInit) => request<T>(endPoint, "POST", options),
    patch: <T = unknown>(endPoint: string, options?: RequestInit) => request<T>(endPoint, "PATCH", options),
    delete: <T = unknown>(endPoint: string, options?: RequestInit) => request<T>(endPoint, "DELETE", options),
};