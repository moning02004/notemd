"use client"

import React, {useState} from "react"
import toast from "react-hot-toast"
import {FiLock} from "react-icons/fi"

import {apiRequest} from "@/lib/api"
import {authLogout} from "@/lib/auth"
import {useAuthStore} from "@/store/auth"
import {Spinner} from "@/components/icons"

/**
 * 임시 비밀번호로 들어온 사람에게 앱 대신 보여주는 화면.
 *
 * 관리자가 알려 준 비밀번호를 그대로 쓰면 관리자도 그 계정으로 들어갈 수 있다. 새 비밀번호를 정해야
 * 노트 화면이 열린다. 바꾸기 싫으면 로그아웃할 수 있다.
 */
export function PasswordChangeRequired() {
    const setMustChangePassword = useAuthStore(state => state.setMustChangePassword)
    const [current, setCurrent] = useState("")
    const [next, setNext] = useState("")
    const [confirm, setConfirm] = useState("")
    const [error, setError] = useState("")
    const [isSaving, setIsSaving] = useState(false)

    const save = async () => {
        if (isSaving) return
        if (!current || !next || !confirm) {
            setError("세 칸을 모두 입력해주세요.")
            return
        }
        if (next !== confirm) {
            setError("새 비밀번호가 서로 다릅니다.")
            return
        }
        if (next === current) {
            setError("임시 비밀번호와 다른 비밀번호를 정해주세요.")
            return
        }

        setIsSaving(true)
        try {
            await apiRequest.patch("/users/change-password", {
                body: JSON.stringify({current_password: current, new_password1: next, new_password2: confirm}),
            })
            toast.success("새 비밀번호로 바꿨습니다.")
            setMustChangePassword(false)
        } catch {
            setError("임시 비밀번호가 맞지 않습니다.")
            setIsSaving(false)
        }
    }

    const onEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.nativeEvent.isComposing) void save()
    }

    const inputClass = "w-full border border-border-strong rounded-lg px-3.5 py-3 text-[14px] text-foreground bg-background outline-none focus:border-accent transition-colors placeholder:text-subtle"

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-[420px] rounded-2xl bg-surface p-9 shadow-[0_30px_60px_-20px_rgba(15,40,40,0.25)]">
                <span className="w-10 h-10 flex items-center justify-center rounded-full bg-accent-soft text-accent mb-4">
                    <FiLock size={17}/>
                </span>
                <div className="text-[19px] font-extrabold text-foreground mb-1">새 비밀번호 정하기</div>
                <p className="text-[13px] text-muted leading-relaxed mb-6">
                    관리자가 알려 준 임시 비밀번호로 들어왔어요. 나만 아는 비밀번호로 바꾸면 노트를 쓸 수 있어요.
                </p>

                <div className="flex flex-col gap-3">
                    <input type="password" placeholder="임시 비밀번호" autoFocus autoComplete="current-password"
                           value={current} onChange={e => setCurrent(e.target.value)} onKeyUp={onEnter}
                           className={inputClass}/>
                    <input type="password" placeholder="새 비밀번호" autoComplete="new-password"
                           value={next} onChange={e => setNext(e.target.value)} onKeyUp={onEnter}
                           className={inputClass}/>
                    <input type="password" placeholder="새 비밀번호 확인" autoComplete="new-password"
                           value={confirm} onChange={e => setConfirm(e.target.value)} onKeyUp={onEnter}
                           className={inputClass}/>
                </div>

                {error && <div className="text-[12.5px] text-danger font-semibold mt-3">{error}</div>}

                <button type="button" onClick={() => void save()} disabled={isSaving}
                        className="w-full flex items-center justify-center gap-2 mt-6 py-3 rounded-lg bg-accent text-white font-extrabold text-[14.5px] cursor-pointer hover:bg-accent-hover transition-colors disabled:cursor-wait disabled:bg-accent-hover">
                    {isSaving && <Spinner size={16}/>}
                    {isSaving ? "바꾸는 중..." : "비밀번호 바꾸기"}
                </button>
                <button type="button" onClick={authLogout}
                        className="w-full mt-3 text-[13px] text-muted hover:text-foreground cursor-pointer">
                    로그아웃
                </button>
            </div>
        </div>
    )
}
