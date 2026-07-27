"use client"

import React, {useRef, useState} from "react"
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
        }).catch((error) => {
            setErrorMessage(error?.detail || "가입에 실패했습니다.")
        })
    }

    const isEnterSignup = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.nativeEvent.isComposing) {
            registerAccount()
        }
    }

    const inputClass = "w-full border border-border-strong rounded-lg px-3.5 py-3 text-[14px] text-foreground bg-background outline-none focus:border-accent transition-colors placeholder:text-subtle"

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-[820px] flex rounded-2xl overflow-hidden shadow-[0_30px_60px_-20px_rgba(15,40,40,0.25)] bg-surface">

                {/* 좌측 브랜드 패널 */}
                <div className="hidden md:flex md:w-[44%] flex-col p-11 text-white relative overflow-hidden"
                     style={{background: "linear-gradient(160deg, var(--accent) 0%, var(--accent-hover) 100%)"}}>
                    <div className="absolute -right-16 -bottom-16 w-52 h-52 rounded-full bg-surface/[0.06]"/>
                    <div className="absolute right-5 -top-10 w-32 h-32 rounded-full bg-surface/[0.05]"/>

                    <div className="flex items-center gap-2.5 mb-auto relative">
                        <div className="w-9 h-9 rounded-lg bg-surface/15 flex items-center justify-center">
                            <img src="/mainIcon.png" alt=""/>
                        </div>
                        <div className="text-[18px] font-extrabold tracking-tight">note.md</div>
                    </div>

                    <div className="text-[23px] font-extrabold leading-[1.4] tracking-tight relative">
                        첫 노트를 시작할<br/>계정을 만들어요
                    </div>
                    <div className="text-[13px] text-white/80 font-medium mt-3 leading-relaxed relative">
                        가입하면 바로 기록을 시작할 수 있어요.<br/>필요한 최소한의 정보만 받습니다.
                    </div>
                </div>

                {/* 우측 폼 */}
                <div className="flex-1 bg-surface p-9 sm:p-11 flex flex-col justify-center">
                    <div className="text-[19px] font-extrabold text-foreground mb-0.5">회원가입</div>
                    <div className="text-[12.5px] text-subtle font-medium mb-7">계정을 만들어 note.md를 시작하세요</div>

                    <div className="flex flex-col gap-3.5">
                        <div>
                            <label className="block text-[11.5px] font-bold text-muted mb-1.5">아이디</label>
                            <input ref={usernameRef} type="text" placeholder="사용할 아이디"
                                   onKeyUp={isEnterSignup} autoFocus className={inputClass}/>
                        </div>
                        <div>
                            <label className="block text-[11.5px] font-bold text-muted mb-1.5">비밀번호</label>
                            <input ref={passwordRef} type="password" placeholder="••••••••"
                                   onKeyUp={isEnterSignup} className={inputClass}/>
                        </div>
                        <div>
                            <label className="block text-[11.5px] font-bold text-muted mb-1.5">비밀번호 확인</label>
                            <input ref={passwordConfirmRef} type="password" placeholder="비밀번호를 한 번 더"
                                   onKeyUp={isEnterSignup} className={inputClass}/>
                        </div>
                        <div>
                            <label className="block text-[11.5px] font-bold text-muted mb-1.5">이름</label>
                            <input ref={nameRef} type="text" placeholder="표시할 이름"
                                   onKeyUp={isEnterSignup} className={inputClass}/>
                        </div>
                    </div>

                    {errorMessage && (
                        <div className="text-[12.5px] text-danger font-semibold mt-3">{errorMessage}</div>
                    )}

                    <button
                        type="button"
                        onClick={registerAccount}
                        className="w-full mt-6 py-3 rounded-lg bg-accent text-white font-extrabold text-[14.5px] cursor-pointer hover:bg-accent-hover active:scale-[0.99] transition-all shadow-[0_8px_16px_-8px_rgba(14,140,127,0.6)]"
                    >
                        가입하기
                    </button>
                </div>
            </div>
        </div>
    )
}