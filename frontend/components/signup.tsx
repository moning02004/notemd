"use client"

import {useRef, useState} from "react"
import {apiRequest} from "@/lib/api";

interface SettingsProps {
    setExistsAccount: (flag: boolean) => void;
}

export const SignupPage = ({
                               setExistsAccount,
                           }: SettingsProps) => {
    const [errorMessage, setErrorMessage] = useState("")
    const usernameRef = useRef<HTMLInputElement>(null)
    const passwordRef = useRef<HTMLInputElement>(null)
    const passwordConfirmRef = useRef<HTMLInputElement>(null)
    const nameRef = useRef<HTMLInputElement>(null)

    const registerAccount = async () => {
        const username = usernameRef.current;
        const name = nameRef.current;
        const password = passwordRef.current;
        const password2 = passwordConfirmRef.current;

        if (!username || !name || !password || !password2) return;

        if (password.value != password2.value) {
            setErrorMessage("비밀번호를 확인해주세요.")
            return;
        }

        await apiRequest.post("/users", {
            body: JSON.stringify({
                username: username.value,
                password1: password.value,
                password2: password2.value,
                name: name.value,
            })
        }).then(() => {
            setExistsAccount(true)
        })
    }
    return (

        <div className="h-screen from-gray-200 to-yellow-50 rounded shadow-md bg-gradient-to-br pt-24">
            <div className="max-w-md mx-auto p-8 bg-white rounded-lg shadow-lg">
                <h1 className="logo mb-4">note.md</h1>

                <div className="flex flex-col gap-3">
                    <input ref={usernameRef} type="text" placeholder="이메일"
                           className="flex-5 p-2 border outline-none rounded"/>

                    <input ref={passwordRef} type="password" placeholder="비밀번호"
                           className="p-2 border outline-none rounded"/>
                    <input ref={passwordConfirmRef} type="password" placeholder="비밀번호 확인"
                           className="p-2 border outline-none rounded"/>
                    <input ref={nameRef} type="text" placeholder="이름" className="p-2 border outline-none rounded"/>

                    <span>{errorMessage}</span>
                    <button type="button" onClick={registerAccount}
                            className="rounded cursor-pointer p-2 bg-[#cfcfcf] hover:bg-[#adadad]">가입하기
                    </button>
                </div>
            </div>
        </div>
    )
}