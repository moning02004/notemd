"use client"

import {useRef, useState} from "react"
import {useRouter} from "next/navigation";
import {apiRequest} from "@/lib/api";
import {useAuthStore} from "@/store/auth";

export default function Page() {
    const usernameRef = useRef<HTMLInputElement>(null)
    const passwordRef = useRef<HTMLInputElement>(null)
    const [errorMessage, setErrorMessage] = useState("")
    const router = useRouter();
    const {setToken} = useAuthStore.getState();

    const login = async () => {
        // setErrorMessage("계정을 찾을 수 없습니다.")
        if (!usernameRef.current || !passwordRef.current) {
            return
        }

        if (!usernameRef.current.value || !passwordRef.current.value) {
            setErrorMessage("계정과 비밀번호를 모두 입력해주세요.")
            return
        }

        const data = await apiRequest.post("/auth/obtain-token", {
            body: JSON.stringify({
                username: usernameRef.current.value,
                password: passwordRef.current.value,
            })
        }).catch(error => {
            setErrorMessage(error.detail || "계정을 찾을 수 없습니다.")
            return null
        })
        setToken(data.access_token)
        window.location.href = "/"
    }

    return (
        <div className="login-container">
            <h1 className="logo mb-4">md.note</h1>

            <div className="flex flex-col">
                <input ref={usernameRef} type="text" placeholder="계정" className="p-3 border outline-none rounded-t"/>
                <input ref={passwordRef} type="password" placeholder="비밀번호"
                       className="p-3 border outline-none border-t-0 rounded-b"/>
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