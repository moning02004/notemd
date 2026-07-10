"use client"

import {useEffect, useState} from "react";
import {FiLock, FiLogOut} from "react-icons/fi";
import {apiRequest} from "@/lib/api";
import toast from "react-hot-toast";
import {authLogout} from "@/lib/auth";
import {useAuthStore} from "@/store/auth";
import {SettingsCard} from "@/components/ui/settings_card";


interface UserInfoResponse {
    username: string;
    name: string;
    userHash: string;
}

export default function Page() {
    const [passwordOpen, setPasswordOpen] = useState(false)
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword1, setNewPassword1] = useState("")
    const [newPassword2, setNewPassword2] = useState("")

    const [username, setUsername] = useState<string | null>(null)
    const [name, setName] = useState<string | null>(null)
    const userHash = useAuthStore((state) => state.userHash)

    useEffect(() => {
        apiRequest.get<UserInfoResponse>(`/users/${userHash}`).then((res) => {
            setUsername(res.username)
            setName(res.name)
        }).catch(() => {
            toast.error("사용자 정보를 가져오는데 실패했습니다.")
            authLogout()
        })
    }, []);

    const changePassword = async () => {
        apiRequest.patch("/users/change-password", {
            body: JSON.stringify({
                current_password: currentPassword,
                new_password1: newPassword1,
                new_password2: newPassword2,
            })
        }).then(() => {
            toast.success("비밀번호가 변경되었습니다.")
            setCurrentPassword("")
            setNewPassword1("")
            setNewPassword2("")
            setPasswordOpen(false)
        }).catch(() => {
            toast.error("비밀번호 변경에 실패했습니다.")
        })
    }

    return (
        <main className="flex-1 overflow-auto w-full max-w-2xl mx-auto my-5 px-4 md:px-0">
            <div className="flex flex-col gap-4">

                {/* 프로필 */}
                <SettingsCard title="프로필">
                    <div className="flex items-center gap-3 py-2">
                        <span
                            className="w-11 h-11 flex items-center justify-center rounded-full bg-[#EAF1EC] text-[#3F6C51] text-[15px] font-semibold shrink-0">
                            {name?.[0]?.toUpperCase()}
                        </span>
                        <div>
                            <p className="text-[15px] text-[#23241F] font-medium">{name} ({username})</p>
                        </div>
                    </div>
                </SettingsCard>

                {/* 비밀번호 */}
                <SettingsCard title="보안">
                    <div className="py-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <span
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-[#EAF1EC] text-[#3F6C51] shrink-0">
                                    <FiLock size={14}/>
                                </span>
                                <div>
                                    <p className="text-[14px] text-[#23241F]">내 비밀번호</p>
                                    <p className="text-[12px] text-[#6B6A63]">주기적으로 변경하는 걸 권장해요.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setPasswordOpen(!passwordOpen)}
                                className="text-[13px] text-[#3F6C51] hover:text-[#345A44] cursor-pointer transition-colors duration-150 shrink-0"
                            >
                                {passwordOpen ? "취소" : "변경"}
                            </button>
                        </div>

                        {passwordOpen && (
                            <div className="mt-3 pl-[42px] flex flex-col gap-2">
                                <input onChange={(e) => setCurrentPassword(e.target.value)}
                                       value={currentPassword}
                                       type="password"
                                       placeholder="현재 비밀번호"
                                       className="border border-[#E8E5DD] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#3F6C51] transition-colors duration-150"/>
                                <input onChange={(e) => setNewPassword1(e.target.value)}
                                       value={newPassword1}
                                       type="password"
                                       placeholder="새 비밀번호"
                                       className="border border-[#E8E5DD] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#3F6C51] transition-colors duration-150"/>
                                <input onChange={(e) => setNewPassword2(e.target.value)}
                                       value={newPassword2}
                                       type="password"
                                       placeholder="새 비밀번호 확인"
                                       className="border border-[#E8E5DD] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#3F6C51] transition-colors duration-150"/>
                                <button
                                    onClick={changePassword}
                                    className="mt-1 self-start px-4 py-2 rounded-lg bg-[#3F6C51] text-white text-[13px] font-medium cursor-pointer hover:bg-[#345A44] transition-colors duration-150">
                                    비밀번호 저장
                                </button>
                            </div>
                        )}
                    </div>
                </SettingsCard>

                {/* 로그아웃 */}
                <button onClick={authLogout}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[#E8E5DD] text-[#6B6A63] hover:border-[#B3261E] hover:text-[#B3261E] hover:bg-[#FBEAE9] cursor-pointer transition-colors duration-200 text-[14px] font-medium"
                >
                    <FiLogOut size={15}/>
                    로그아웃
                </button>
            </div>
        </main>
    )
}