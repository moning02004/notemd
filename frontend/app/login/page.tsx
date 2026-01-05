"use client"

import React, {useEffect, useRef, useState} from "react"
import {apiRequest} from "@/lib/api";
import {useAuthStore} from "@/store/auth";
import {GetAuthResponse} from "@/types/auth";
import {SignupPage} from "@/components/signup";
import {LoadingPage} from "@/components/loading";
import {API_HOST} from "@/constants/api";

export default function Page() {
    const usernameRef = useRef<HTMLInputElement>(null)
    const passwordRef = useRef<HTMLInputElement>(null)
    const authLoginRef = useRef<HTMLInputElement>(null)
    const [errorMessage, setErrorMessage] = useState("")
    const {setAuth} = useAuthStore.getState();
    const [existsAccount, setExistsAccount] = useState<boolean | null>(null);

    useEffect(() => {
        cookieStore.get("auto_login").then(r => {
            if (r !== null) {
                const refreshAuth = async () => {
                    const refreshRes = await fetch(`${API_HOST}/auth/refresh-token`, {
                        method: "POST",
                        credentials: "include",
                    });

                    if (refreshRes.ok) {
                        const data = await refreshRes.json();
                        setAuth(data.access_token, data.user_id);
                        window.location.replace("/")
                    }
                }
                refreshAuth()
            }
            const checkAccountExistence = async () => {
                try {
                    const res = await apiRequest.get<{ exists: boolean }>("/check");
                    setExistsAccount(res.exists);
                } catch (error) {
                    setExistsAccount(false);
                }
            };
            checkAccountExistence();
            cookieStore.delete("auto_login")
        })
    }, []);

    const login = async () => {
        // setErrorMessage("계정을 찾을 수 없습니다.")
        if (!usernameRef.current || !passwordRef.current || !authLoginRef.current) {
            return
        }

        if (!usernameRef.current.value || !passwordRef.current.value) {
            setErrorMessage("계정과 비밀번호를 모두 입력해주세요.")
            return
        }

        const data = await apiRequest.post<GetAuthResponse>("/auth/obtain-token", {
            body: JSON.stringify({
                username: usernameRef.current.value,
                password: passwordRef.current.value,
            })
        }).catch(error => {
            setErrorMessage(error.detail || "계정을 찾을 수 없습니다.")
            return {access_token: "", user_id: 0}
        })
        if (!data.access_token) return

        if (authLoginRef.current.checked) {
            await cookieStore.set({name: "auto_login", value: "1", expires: Date.now() + 31536000000})
        } else {
            await cookieStore.delete("auto_login")
        }
        setAuth(data.access_token, data.user_id)
        window.location.href = "/"
    }
    const isEnterLogin = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            login()
        }
    }

    if (existsAccount === null) return <LoadingPage/>
    if (!existsAccount) return <SignupPage setExistsAccount={setExistsAccount}/>

    return (
        <div className="login-container">
            <h1 className="logo mb-4">note.md</h1>

            <div className="flex flex-col gap-3">
                <input ref={usernameRef}
                       type="text"
                       placeholder="계정"
                       className="p-2 border outline-none rounded"
                       onKeyUp={isEnterLogin}
                />
                <input ref={passwordRef} type="password" placeholder="비밀번호"
                       className="p-2 border outline-none rounded"
                       onKeyUp={isEnterLogin}
                />

                <span>{errorMessage}</span>
                <label htmlFor="auto_login" className="text-sm text-gray-600">
                    <input ref={authLoginRef} type="checkbox" id="auto_login" className="mr-1"/>
                    <span>로그인 상태 유지</span>
                </label>
                <button type="button" onClick={login}
                        className="rounded cursor-pointer p-3 bg-[#cfcfcf] hover:bg-[#adadad]">로그인
                </button>
            </div>
        </div>
    )
}