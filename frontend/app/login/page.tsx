"use client"

import React, {useEffect, useRef, useState} from "react"
import {apiRequest} from "@/lib/api";
import {useAuthStore} from "@/store/auth";
import {GetAuthResponse} from "@/types/auth";
import {SignupPage} from "@/components/signup";
import {LoadingPage} from "@/components/loading";

export default function Page() {
    const usernameRef = useRef<HTMLInputElement>(null)
    const passwordRef = useRef<HTMLInputElement>(null)
    const [errorMessage, setErrorMessage] = useState("")
    const {setAuth} = useAuthStore.getState();
    const [existsAccount, setExistsAccount] = useState<boolean | null>(null);

    useEffect(() => {
        const checkAccountExistence = async () => {
            try {
                const res = await apiRequest.get<{ exists: boolean }>("/check");
                setExistsAccount(res.exists);
            } catch (error) {
                setExistsAccount(false);
            }
        };
        checkAccountExistence();
    }, []);

    const login = async () => {
        // setErrorMessage("계정을 찾을 수 없습니다.")
        if (!usernameRef.current || !passwordRef.current) {
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
                <button type="button" onClick={login}
                        className="rounded cursor-pointer p-3 bg-[#cfcfcf] hover:bg-[#adadad]">로그인
                </button>
            </div>
        </div>
    )
}