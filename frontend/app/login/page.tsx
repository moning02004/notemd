"use client"

import React, {useEffect, useRef, useState} from "react"
import {apiRequest} from "@/lib/api";
import {useAuthStore} from "@/store/auth";
import {SignupPage} from "@/components/signup";
import {LoadingPage} from "@/components/loading";
import {API_HOST} from "@/constants/api";
import Cookies from "js-cookie";
import {AuthTokenResponse, CheckAccountExistenceResponse} from "@/types/auth";


export default function Page() {
    const usernameRef = useRef<HTMLInputElement>(null)
    const passwordRef = useRef<HTMLInputElement>(null)
    const authLoginRef = useRef<HTMLInputElement>(null)

    const [errorMessage, setErrorMessage] = useState("")
    const {setAuth} = useAuthStore.getState();
    const [existsAccount, setExistsAccount] = useState<boolean | null>(null);

    const isAutoLogin = Cookies.get('auto-login') === '1'
    const checkAccountExistence = async () => {
        try {
            const res = await apiRequest.get<CheckAccountExistenceResponse>("/check");
            setExistsAccount(res.exists);
        } catch (error) {
            setExistsAccount(false);
        }
    };
    useEffect(() => {
        const checkAutoLogin = async () => {
            if (!isAutoLogin) {
                await checkAccountExistence()
                return
            }

            const refreshRes = await fetch(`${API_HOST}/auth/refresh-token`, {
                method: "POST",
                credentials: "include",
            });

            if (refreshRes.ok) {
                const data: AuthTokenResponse = await refreshRes.json();
                setAuth(data.access_token, data.user_hash);
                window.location.replace("/")
            } else {
                Cookies.remove('auto-login')
                await checkAccountExistence()
            }
        }

        checkAutoLogin()
    }, []);

    const login = async () => {
        if (!usernameRef.current || !passwordRef.current || !authLoginRef.current) {
            return
        }

        if (!usernameRef.current.value || !passwordRef.current.value) {
            setErrorMessage("계정과 비밀번호를 모두 입력해주세요.")
            return
        }

        const data = await apiRequest.post<Partial<AuthTokenResponse>>("/auth/obtain-token", {
            body: JSON.stringify({
                username: usernameRef.current.value,
                password: passwordRef.current.value,
            })
        }).catch(error => {
            setErrorMessage(error.detail || "계정을 찾을 수 없습니다.")
            return {} as Partial<AuthTokenResponse>
        })
        if (!data.access_token) return

        if (authLoginRef.current.checked) {
            Cookies.set('auto-login', '1', {expires: 180})
        } else {
            Cookies.remove('auto-login')
        }
        setAuth(data.access_token, data.user_hash)
        window.location.href = "/"
    }
    const isEnterLogin = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.nativeEvent.isComposing) {
            login()
        }
    }

    if (existsAccount === null) return <LoadingPage/>
    if (!existsAccount) return <SignupPage setExistsAccount={setExistsAccount}/>

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-[820px] flex rounded-2xl overflow-hidden shadow-[0_30px_60px_-20px_rgba(15,40,40,0.25)] bg-surface">

                {/* 좌측 브랜드 패널 (데스크톱 전용) */}
                <div className="hidden md:flex md:w-[44%] flex-col p-11 text-white relative overflow-hidden"
                     style={{background: "linear-gradient(160deg, var(--accent) 0%, var(--accent-hover) 100%)"}}>
                    <div className="absolute -right-16 -bottom-16 w-52 h-52 rounded-full bg-surface/[0.06]"/>
                    <div className="absolute right-5 -top-10 w-32 h-32 rounded-full bg-surface/[0.05]"/>

                    <div className="flex items-center gap-2.5 mb-auto relative">
                        <div className="w-9 h-9 rounded-lg bg-surface/15 flex items-center justify-center">
                            <img src="/mainIcon.png" alt="" width="100" height="100"/>
                        </div>
                        <div className="text-[18px] font-extrabold tracking-tight">note.md</div>
                    </div>

                    <div className="text-[23px] font-extrabold leading-[1.4] tracking-tight relative">
                        생각날 때 적고,<br/>필요할 때 꺼내 보세요
                    </div>
                    <div className="text-[13px] text-white/80 font-medium mt-3 leading-relaxed relative">
                        코드 조각부터 할 일, 짧은 메모까지.<br/>마크다운으로 가볍게 기록하는 공간.
                    </div>
                </div>

                {/* 우측 폼 */}
                <div className="flex-1 bg-surface p-9 sm:p-11 flex flex-col justify-center">
                    <div className="text-[19px] font-extrabold text-foreground mb-0.5">로그인</div>
                    <div className="text-[12.5px] text-subtle font-medium mb-7">계정 정보를 입력해 시작하세요</div>

                    <label className="block text-[11.5px] font-bold text-muted mb-1.5">계정</label>
                    <input
                        ref={usernameRef}
                        type="text"
                        placeholder="아이디를 입력하세요"
                        autoFocus
                        onKeyUp={isEnterLogin}
                        className="w-full border border-border-strong rounded-lg px-3.5 py-3 text-[14px] text-foreground bg-background outline-none focus:border-accent transition-colors placeholder:text-subtle mb-4"
                    />

                    <label className="block text-[11.5px] font-bold text-muted mb-1.5">비밀번호</label>
                    <input
                        ref={passwordRef}
                        type="password"
                        placeholder="••••••••"
                        onKeyUp={isEnterLogin}
                        className="w-full border border-border-strong rounded-lg px-3.5 py-3 text-[14px] text-foreground bg-background outline-none focus:border-accent transition-colors placeholder:text-subtle mb-3"
                    />

                    {errorMessage && (
                        <div className="text-[12.5px] text-danger font-semibold mb-3">{errorMessage}</div>
                    )}

                    <label htmlFor="auto_login" className="flex items-center gap-2 text-[12.5px] text-muted font-semibold cursor-pointer mb-5 select-none">
                        <input ref={authLoginRef} type="checkbox" id="auto_login" className="w-4 h-4 accent-accent cursor-pointer"/>
                        로그인 상태 유지
                    </label>

                    <button
                        type="button"
                        onClick={login}
                        className="w-full py-3 rounded-lg bg-accent text-white font-extrabold text-[14.5px] cursor-pointer hover:bg-accent-hover active:scale-[0.99] transition-all shadow-[0_8px_16px_-8px_rgba(14,140,127,0.6)]"
                    >
                        로그인
                    </button>
                </div>
            </div>
        </div>
    )
}