"use client"

import React, {useRef, useState} from "react"
import {apiRequest} from "@/lib/api";
import {useAuthStore} from "@/store/auth";
import {GetAuthResponse} from "@/types/auth";

export default function Page() {
    const usernameRef = useRef<HTMLInputElement>(null)
    const passwordRef = useRef<HTMLInputElement>(null)
    const [errorMessage, setErrorMessage] = useState("")
    const {setAuth} = useAuthStore.getState();

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
    return (
        <div className="login-container">
            <h1 className="logo mb-4">note.md</h1>

            <div className="flex flex-col">
                <input ref={usernameRef}
                       type="text"
                       placeholder="계정"
                       className="p-3 border outline-none rounded-t"
                       onKeyUp={isEnterLogin}
                />
                <input ref={passwordRef} type="password" placeholder="비밀번호"
                       className="p-3 border outline-none border-t-0 rounded-b"
                       onKeyUp={isEnterLogin}
                />
                <span>{errorMessage}</span>
                <button type="button" onClick={login}
                        className="mt-3 rounded cursor-pointer p-3 bg-[#cfcfcf] hover:bg-[#adadad]">로그인
                </button>
            </div>

            <div className="login-footer">
                <a href="/signup">계정 등록하기</a>
            </div>
        </div>
    )
}