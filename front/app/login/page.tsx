"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation";

export default function () {
    const usernameRef = useRef(null) 
    const passwordRef = useRef(null)
    const [errorMessage, setErrorMessage] = useState("")

    const router = useRouter();

    const login = () => {
        // setErrorMessage("계정을 찾을 수 없습니다.")
        router.replace("/dashboard");
    }

    return (
        <div className="login-container">
            <h1 className="logo mb-4">My Note</h1>

            <div className="flex flex-col">
                <input ref={usernameRef} type="text" placeholder="계정" className="p-3 border outline-none rounded-t" />
                <input ref={passwordRef} type="password" placeholder="비밀번호" className="p-3 border outline-none border-t-0 rounded-b"  />
                <span>{errorMessage}</span>
                <button type="button" onClick={login} className="mt-3 rounded cursor-pointer p-3 bg-[#cfcfcf] hover:bg-[#adadad]">로그인</button>
            </div>
    
            <div className="login-footer">
                <a href="/signup">계정 등록하기</a>
            </div>
        </div>
    )
}