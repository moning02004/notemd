"use client"

import {useEffect, useState} from "react";
import {FiLock, FiLogOut, FiUsers} from "react-icons/fi";
import {apiRequest} from "@/lib/api";
import toast from "react-hot-toast";
import {authLogout} from "@/lib/auth";
import {useAuthStore} from "@/store/auth";
import {SettingsCard} from "@/components/ui/settings_card";
import {Workspace} from "@/types/workspace";

interface UserInfoResponse {
    username: string;
    name: string;
    userHash: string;
}

interface WorkspaceResponse {
    hash_id: string;
    name: string;
    description: string;
    user_count: number;
}

export default function Page() {
    const [passwordOpen, setPasswordOpen] = useState(false)
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword1, setNewPassword1] = useState("")
    const [newPassword2, setNewPassword2] = useState("")

    const [username, setUsername] = useState<string | null>(null)
    const [name, setName] = useState<string | null>(null)
    const [workspaces, setWorkspaces] = useState<Workspace[]>([])
    const [workspaceLoading, setWorkspaceLoading] = useState(true)
    const {userHash} = useAuthStore.getState()

    useEffect(() => {
        apiRequest.get<UserInfoResponse>(`/users/${userHash}`).then((res) => {
            setUsername(res.username)
            setName(res.name)
        }).catch(() => {
            toast.error("사용자 정보를 가져오는데 실패했습니다.")
            authLogout()
        })

        apiRequest.get<WorkspaceResponse[]>(`/users/${userHash}/workspaces`).then((res) => {
            setWorkspaces(res.map(w => ({
                hashId: w.hash_id,
                name: w.name,
                description: w.description,
                userCount: w.user_count,
            })))
        }).catch(() => {
            setWorkspaces([])
        }).finally(() => {
            setWorkspaceLoading(false)
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
                    <div className="flex items-center gap-4 py-2">
                        <span
                            className="w-14 h-14 flex items-center justify-center rounded-full bg-accent-soft text-accent text-[20px] font-medium shrink-0">
                            {name?.[0]?.toUpperCase()}
                        </span>
                        <div className="min-w-0">
                            <p className="text-[16px] text-foreground font-medium truncate">{name}</p>
                            <p className="text-[13px] text-muted truncate">{username}</p>
                            <p className="text-[12px] text-subtle mt-1">
                                {workspaceLoading
                                    ? "워크스페이스 확인 중"
                                    : workspaces.length > 0
                                        ? `워크스페이스 ${workspaces.length}곳 참여 중`
                                        : "참여 중인 워크스페이스 없음"}
                            </p>
                        </div>
                    </div>
                </SettingsCard>

                {/* 참여 중인 워크스페이스 */}
                <SettingsCard title="참여 중인 워크스페이스" icon={<FiUsers size={11}/>}>
                    {workspaceLoading ? (
                        <div className="flex flex-col gap-2 py-1">
                            {[0, 1].map(i => (
                                <div key={i} className="flex items-center gap-3 py-2.5">
                                    <div className="w-9 h-9 rounded-lg bg-background shrink-0"/>
                                    <div className="flex-1 flex flex-col gap-1.5">
                                        <div className="h-3 w-28 rounded bg-background"/>
                                        <div className="h-2.5 w-40 rounded bg-background"/>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : workspaces.length === 0 ? (
                        <div className="py-6 text-center">
                            <p className="text-[13px] text-muted">아직 참여 중인 워크스페이스가 없어요.</p>
                            <p className="text-[12px] text-subtle mt-1">관리자가 초대하면 여기에 표시됩니다.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {workspaces.map((workspace, i) => (
                                <div key={workspace.hashId}>
                                    <div className="flex items-center gap-3 py-2.5">
                                        <span
                                            className="w-9 h-9 flex items-center justify-center rounded-lg bg-accent-soft text-accent text-[13px] font-medium shrink-0">
                                            {workspace.name[0]?.toUpperCase()}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[14px] text-foreground truncate">{workspace.name}</p>
                                            {workspace.description && (
                                                <p className="text-[12px] text-muted truncate">{workspace.description}</p>
                                            )}
                                        </div>
                                        <span
                                            className="shrink-0 text-[11px] px-2 py-0.5 rounded-full bg-background text-muted">
                                            구성원 {workspace.userCount}명
                                        </span>
                                    </div>
                                    {i < workspaces.length - 1 && <div className="h-px bg-border"/>}
                                </div>
                            ))}
                        </div>
                    )}
                </SettingsCard>

                {/* 비밀번호 */}
                <SettingsCard title="보안">
                    <div className="py-2">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-accent-soft text-accent shrink-0">
                                    <FiLock size={14}/>
                                </span>
                                <div className="min-w-0">
                                    <p className="text-[14px] text-foreground">내 비밀번호</p>
                                    <p className="text-[12px] text-subtle">주기적으로 변경하는 걸 권장해요.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setPasswordOpen(!passwordOpen)}
                                className="shrink-0 px-3 py-1.5 rounded-lg border border-border-strong text-[13px] text-accent hover:border-accent hover:bg-accent-soft cursor-pointer transition-colors duration-150"
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
                                       className="bg-background border border-border-strong rounded-lg px-3 py-2 text-[13px] text-foreground placeholder:text-subtle outline-none focus:border-accent transition-colors duration-150"/>
                                <input onChange={(e) => setNewPassword1(e.target.value)}
                                       value={newPassword1}
                                       type="password"
                                       placeholder="새 비밀번호"
                                       className="bg-background border border-border-strong rounded-lg px-3 py-2 text-[13px] text-foreground placeholder:text-subtle outline-none focus:border-accent transition-colors duration-150"/>
                                <input onChange={(e) => setNewPassword2(e.target.value)}
                                       value={newPassword2}
                                       type="password"
                                       placeholder="새 비밀번호 확인"
                                       className="bg-background border border-border-strong rounded-lg px-3 py-2 text-[13px] text-foreground placeholder:text-subtle outline-none focus:border-accent transition-colors duration-150"/>
                                <button
                                    onClick={changePassword}
                                    className="mt-1 self-start px-4 py-2 rounded-lg bg-accent text-white text-[13px] font-medium cursor-pointer hover:bg-accent-hover transition-colors duration-150">
                                    비밀번호 저장
                                </button>
                            </div>
                        )}
                    </div>
                </SettingsCard>

                {/* 로그아웃 */}
                <button onClick={authLogout}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-surface text-muted hover:border-danger hover:text-danger hover:bg-danger-soft cursor-pointer transition-colors duration-200 text-[14px] font-medium"
                >
                    <FiLogOut size={15}/>
                    로그아웃
                </button>
            </div>
        </main>
    )
}