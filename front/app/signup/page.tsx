"use client"

import { useRef, useState } from "react"

export default function () {
    const [errorMessage, setErrorMessage] = useState("")
    const usernameRef = useRef(null) 
    const passwordRef = useRef(null)
    const passwordConfirmRef = useRef(null)
    const nameRef = useRef(null)

    const registerAccount = () => {
        let password = passwordRef.current
        let password2 = passwordConfirmRef.current
        if (password.value != password2.value) {
            setErrorMessage("비밀번호를 확인해주세요.")
            return;
        }
        
        let username = usernameRef.current
        let name = nameRef.current
        console.log(username.value, name.value)
    }
    return (
        <div className="login-container">
            <h1 className="logo mb-4">My Note</h1>


            <div className="flex flex-col gap-3">
                <div className="flex flex-row w-full">
                    <input ref={usernameRef} type="text" placeholder="이메일" className="flex-5 p-3 border outline-none rounded-l border-r-0"/>
                    <button className="flex-1 border rounded-r p-3">중복확인</button>
                </div>

                <input ref={passwordRef} type="password" placeholder="비밀번호" className="p-3 border outline-none"  />
                <input ref={passwordConfirmRef} type="password" placeholder="비밀번호 확인" className="p-3 border outline-none"  />
                <input ref={nameRef} type="text" placeholder="이름" className="p-3 border outline-none"  />
                <span>{errorMessage}</span>
                <button type="button" onClick={registerAccount} className="rounded cursor-pointer p-3 bg-[#cfcfcf] hover:bg-[#adadad]">가입하기</button>
            </div>
    
            <div className="login-footer">
                <a href="/login">로그인</a>
            </div>
        </div>
    )
}