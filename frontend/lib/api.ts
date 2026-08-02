import {useAuthStore} from "@/store/auth";
import {API_HOST} from "@/constants/api";
import {authLogout} from "@/lib/auth";
import {AuthTokenResponse} from "@/types/auth";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

type RequestExtraOptions = {
    /** FormData 등 브라우저가 Content-Type(boundary 포함)을 직접 정해야 하는 요청 */
    isMime?: boolean
    /** JSON 파싱 없이 Response를 그대로 받는다(파일 다운로드) */
    isDownloadFile?: boolean
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/** 실패 응답을 담는 에러. 본문은 여기서 한 번만 읽어 `data`에 보관한다. */
export class ApiError extends Error {
    readonly status: number
    readonly data: any
    readonly response: Response

    constructor(status: number, data: any, response: Response) {
        super(typeof data?.detail === "string" ? data.detail : `요청에 실패했습니다. (${status})`)
        this.name = "ApiError"
        this.status = status
        this.data = data
        this.response = response
    }

    get detail(): any {
        return this.data?.detail
    }

    /** @deprecated 기존 `catch(error => error.status_code)` 호출부 호환용. `status`를 쓸 것 */
    get status_code(): number {
        return this.status
    }

    /** @deprecated 기존 `catch(error => error.json())` 호출부 호환용. `data`를 쓸 것 */
    async json(): Promise<any> {
        return this.data
    }
}

/* eslint-enable @typescript-eslint/no-explicit-any */

/** 본문을 안전하게 한 번만 읽는다. 204나 빈 응답, JSON이 아닌 응답도 처리한다. */
async function parseBody(response: Response) {
    if (response.status === 204) return null

    const text = await response.text().catch(() => "")
    if (!text) return null

    try {
        return JSON.parse(text)
    } catch {
        return text
    }
}

function buildHeaders(base: HeadersInit | undefined, token: string | null, isMime?: boolean): Headers {
    const headers = new Headers(base)

    // FormData일 때 Content-Type을 직접 지정하면 boundary가 빠져 서버가 파싱하지 못한다.
    if (!isMime && !headers.has("Content-Type")) headers.set("Content-Type", "application/json")

    if (token) headers.set("Authorization", `Bearer ${token}`)
    else headers.delete("Authorization")

    return headers
}

// 동시에 여러 요청이 401을 받아도 refresh는 한 번만 호출한다.
let refreshPromise: Promise<string | null> | null = null

async function runRefresh(): Promise<string | null> {
    try {
        const response = await fetch(`${API_HOST}/auth/refresh-token`, {
            method: "POST",
            credentials: "include",
            headers: {"Content-Type": "application/json"},
        })
        if (!response.ok) return null

        const data = await response.json() as AuthTokenResponse
        useAuthStore.getState().setAuth(data.access_token, data.user_hash)
        return data.access_token
    } catch {
        return null
    }
}

function refreshAccessToken(): Promise<string | null> {
    refreshPromise ??= runRefresh().finally(() => {
        refreshPromise = null
    })
    return refreshPromise
}

async function request<T = unknown>(endPoint: string,
                                    method: HttpMethod,
                                    options: RequestInit = {},
                                    extraOptions: RequestExtraOptions = {}): Promise<T> {
    const send = (token: string | null) => fetch(`${API_HOST}${endPoint}`, {
        ...options,
        method,
        credentials: "include",
        headers: buildHeaders(options.headers, token, extraOptions.isMime),
    })

    const token = useAuthStore.getState().token
    let response = await send(token)

    // 토큰이 없던 요청(공개 노트 등)의 401은 재발급 대상이 아니다. 그대로 에러로 넘긴다.
    if (response.status === 401 && token) {
        const accessToken = await refreshAccessToken()
        if (!accessToken) {
            await authLogout()
            throw new ApiError(401, {detail: "세션이 만료되었습니다. 다시 로그인해주세요."}, response)
        }
        response = await send(accessToken)
    }

    // 재시도 결과와 5xx까지 모두 검사한다(기존에는 4xx만 확인해 5xx가 null로 흘러갔다).
    if (!response.ok) throw new ApiError(response.status, await parseBody(response), response)

    if (extraOptions.isDownloadFile) return response as T
    return await parseBody(response) as T
}

const createMethod = (method: HttpMethod) =>
    <T = unknown>(endPoint: string, options?: RequestInit, extraOptions?: RequestExtraOptions) =>
        request<T>(endPoint, method, options, extraOptions)

export const apiRequest = {
    get: createMethod("GET"),
    post: createMethod("POST"),
    patch: createMethod("PATCH"),
    delete: createMethod("DELETE"),
};