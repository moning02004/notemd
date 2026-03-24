"use client"

import {useEffect} from "react";
import {useAuthStore} from "@/store/auth";
import {useRouter} from "next/navigation";
import {authLogout} from "@/lib/auth";

export default function Page() {
    const router = useRouter()
    const {token} = useAuthStore.getState()

    useEffect(() => {
        if (!token) {
            router.replace("/login")
            return
        }
    })

    return (
        <main className="flex-1 overflow-auto w-[90%] mx-auto my-5">
            <div className="flex w-full hover:bg-gray-200 justify-between px-5 py-4 mb-3 border-b border-gray-200">
                <div className="my-auto">스냅샷 자동 생성 주기</div>
                <div className="my-auto">
                    <select name="" id="" className="border rounded-md p-1 bg-white cursor-pointer">
                        <option value="">처음 수정 시</option>
                        <option value="">저장 시</option>
                        <option value="">수동</option>
                    </select>
                </div>
            </div>
            <button onClick={() => {
                authLogout();
            }}
                    className="rounded w-full bg-red-600 cursor-pointer hover:text-olive-500
                    text-white font-bold text-lg px-3 py-3 mx-auto">로그아웃
            </button>
        </main>
    )
}