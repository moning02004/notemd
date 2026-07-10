"use client"

import {useEffect, useState} from "react";
import {FiClock, FiLayers, FiPlus, FiTrash2, FiUser, FiX} from "react-icons/fi";
import {apiRequest} from "@/lib/api";
import {Modal} from "@/components/ui/modal";
import {SettingsCard} from "@/components/ui/settings_card";
import {UserAccount, Workspace, WorkspaceMember} from "@/types/workspace";
import {LoadingPage} from "@/components/loading";

type MemberTab = "users" | "workspaces";

interface Preference {
    isSuperuser: boolean;
    trashPolicy: string;
    snapshotPolicy: string;
}

export default function Page() {
    const [users, setUsers] = useState<UserAccount[]>([])
    const [workspaces, setWorkspaces] = useState<Workspace[]>([])
    const [preference, setPreference] = useState<Preference>(null)
    const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([])

    useEffect(() => {
        apiRequest.get("/preferences")
            .then((data: { is_superuser: boolean, trash_policy: string, snapshot_policy: string }) => {
                setPreference({
                    isSuperuser: data.is_superuser,
                    trashPolicy: data.trash_policy,
                    snapshotPolicy: data.snapshot_policy,
                })
            })
        apiRequest.get("/users")
            .then((data: { user_hash: string, username: string, name: string, created_at: string }[]) => {
                const fetchedUsers = data.map(user => ({
                    userHash: user.user_hash,
                    username: user.username,
                    name: user.name,
                    createdAt: user.created_at
                }))
                setUsers(fetchedUsers)
            })
        apiRequest.get("/workspaces")
            .then((data: { hash_id: string, name: string, description: string, user_count: number }[]) => {
                const fetchedWorkspaces = data.map(workspace => ({
                    hashId: workspace.hash_id,
                    name: workspace.name,
                    description: workspace.description,
                    userCount: workspace.user_count
                }))
                setWorkspaces(fetchedWorkspaces)
            })
    }, []);

    const [memberTab, setMemberTab] = useState<MemberTab>("users")
    const [openWorkspaceId, setOpenWorkspaceId] = useState<string | null>(null)
    const openWorkspace = workspaces.find(w => w.hashId === openWorkspaceId) ?? null

    const [newUsername, setNewUsername] = useState("")
    const [newName, setNewName] = useState("")
    const [selectedUserId, setSelectedUserId] = useState("")

    const deleteUser = async (user: UserAccount) => {
        if (!confirm("사용자를 삭제하면 해당 사용자의 모든 데이터가 삭제됩니다. 정말 삭제하시겠습니까?")) return;

        await apiRequest.delete(`/users/${user.userHash}`)
            .then(() => {
                setUsers(users.filter(u => u.userHash !== user.userHash))
            })
    }
    const addUser = async () => {
        if (!newName.trim() || !newUsername.trim()) return

        await apiRequest.post("/users", {body: JSON.stringify({username: newUsername, name: newName})})
            .then((user: { user_hash: string, username: string, name: string, created_at: string }) => {
                const createdUser = {
                    userHash: user.user_hash,
                    username: user.username,
                    name: user.name,
                    createdAt: user.created_at,
                }
                setUsers([...users, createdUser])
                setNewName("")
                setNewUsername("")
            })
    }

    const deleteWorkspace = async (workspace) => {
        await apiRequest.delete(`/workspaces/${workspace.hashId}`).then(() => {
            setWorkspaces(workspaces.filter(w => w.hashId !== workspace.hashId))
        })
    }

    const [newWorkspaceName, setNewWorkspaceName] = useState("")
    const [newWorkspaceDescription, setNewWorkspaceDescription] = useState("")
    const addWorkspace = async () => {
        if (!newWorkspaceName.trim()) return

        await apiRequest.post("/workspaces",
            {
                body: JSON.stringify({
                    name: newWorkspaceName,
                    description: newWorkspaceDescription
                })
            }
        ).then((workspace: { hash_id: string, name: string, description: string, user_count: number }) => {
            const createdWorkspace = {
                hashId: workspace.hash_id,
                name: workspace.name,
                description: workspace.description,
                userCount: workspace.user_count,
            }
            setWorkspaces([createdWorkspace, ...workspaces])
            setNewWorkspaceName("")
            setNewWorkspaceDescription("")
        })
    }

    const handleWorkspaceMember = async (workspace: Workspace) => {
        await apiRequest.get(`/workspaces/${workspace.hashId}/users`)
            .then((members: { user_hash: string, user_name: string, username: string }[]) => {
                const fetchedMembers = members.map(x => ({
                    userHash: x.user_hash,
                    username: x.username,
                    name: x.user_name,
                }))
                setWorkspaceMembers(fetchedMembers)
                setOpenWorkspaceId(workspace.hashId)
            })
    }

    const addIntoWorkspace = async () => {
        await apiRequest.post(`/workspaces/${openWorkspaceId}/users/${selectedUserId}`)
            .then((user: { user_hash: string, username: string, user_name: string }) => {
                setWorkspaceMembers([...workspaceMembers, {
                    userHash: user.user_hash,
                    username: user.username,
                    name: user.user_name,
                }])

            })
    }

    const removeUserFromWorkspace = async (userHash: string) => {
        await apiRequest.delete(`/workspaces/${openWorkspaceId}/users/${userHash}`)
            .then(() => {
                setWorkspaceMembers(workspaceMembers.filter(m => m.userHash !== userHash))
            })
    }

    if (!preference) return <LoadingPage />
    return (
        <main className="flex-1 overflow-auto w-full max-w-2xl mx-auto my-5 px-4 md:px-0">
            <div className="flex flex-col gap-4">
                <SettingsCard title="구성원" icon={<FiLayers size={11}/>}>
                    <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2.5 pr-3">
                            <span
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#EAF1EC] text-[#3F6C51] shrink-0">
                                <FiClock size={14}/>
                            </span>
                            <div>
                                <p className="text-[14px] text-[#23241F]">스냅샷 자동 생성</p>
                                <p className="text-[12px] text-[#6B6A63]">노트 변경 이력을 언제 저장할지 정해요.</p>
                            </div>
                        </div>
                        <select
                            className="border border-[#E8E5DD] rounded-lg px-3 py-1.5 text-[13px] bg-white cursor-pointer outline-none focus:border-[#3F6C51] transition-colors duration-150 shrink-0"
                        >
                            <option value="on_first_edit">열고 처음 수정 시</option>
                            <option value="on_every_edit">수정마다</option>
                            <option value="manual">수동</option>
                        </select>
                    </div>

                    <div className="h-px bg-[#E8E5DD] my-1"/>

                    <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2.5 pr-3">
                            <span
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#FDF3E7] text-[#B45309] shrink-0">
                                <FiTrash2 size={14}/>
                            </span>
                            <div>
                                <p className="text-[14px] text-[#23241F]">휴지통 자동 삭제</p>
                                <p className="text-[12px] text-[#6B6A63]">삭제된 노트를 완전히 지우기까지 걸리는 기간이에요.</p>
                            </div>
                        </div>
                        <select
                            className="border border-[#E8E5DD] rounded-lg px-3 py-1.5 text-[13px] bg-white cursor-pointer outline-none focus:border-[#3F6C51] transition-colors duration-150 shrink-0"
                        >
                            <option value="7">7일 후</option>
                            <option value="14">14일 후</option>
                            <option value="30">30일 후</option>
                            <option value="never">삭제 안 함</option>
                        </select>
                    </div>
                </SettingsCard>
                {preference.isSuperuser &&
                    <SettingsCard title="구성원" icon={<FiLayers size={11}/>}>
                        <div className="flex gap-1 bg-[#FAFAF7] p-1 rounded-lg mb-4">
                            <button
                                onClick={() => setMemberTab("users")}
                                className={`flex-1 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-colors duration-150
                                ${memberTab === "users" ? "bg-white text-[#23241F] shadow-sm" : "text-[#6B6A63] hover:text-[#23241F]"}`}
                            >
                                사용자 관리
                            </button>
                            <button
                                onClick={() => setMemberTab("workspaces")}
                                className={`flex-1 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-colors duration-150
                                ${memberTab === "workspaces" ? "bg-white text-[#23241F] shadow-sm" : "text-[#6B6A63] hover:text-[#23241F]"}`}
                            >
                                워크스페이스 관리
                            </button>
                        </div>

                        {memberTab === "users" ? (
                            <div>
                                <div className="flex flex-col mb-3">
                                    {users.map((user, i) => {
                                        const belongsTo = []

                                        return (
                                            <div key={user.userHash}>
                                                <div className="flex items-center gap-2.5 py-2.5">
                                                <span
                                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-[#EAF1EC] text-[#3F6C51] text-[12px] font-medium shrink-0">
                                                    {user.name[0]}
                                                </span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[14px] text-[#23241F] truncate">{user.name}</p>
                                                        <p className="text-[12px] text-[#6B6A63] truncate mb-1">{user.username}</p>
                                                        {belongsTo.length === 0 ? (
                                                            <span
                                                                className="text-[11px] text-[#6B6A63]">소속된 워크스페이스 없음</span>
                                                        ) : (
                                                            <div className="flex flex-wrap gap-1">
                                                                {belongsTo.map(w => (
                                                                    <span key={w.id}
                                                                          className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F0EEE7] text-[#6B6A63]">
                                                                    {w.name}
                                                                </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => deleteUser(user)}
                                                        className="w-7 h-7 flex items-center justify-center rounded-full text-[#6B6A63] hover:bg-[#FBEAE9] hover:text-[#B3261E] cursor-pointer transition-colors duration-150 shrink-0"
                                                    >
                                                        <FiX size={14}/>
                                                    </button>
                                                </div>
                                                {i < users.length - 1 && <div className="h-px bg-[#E8E5DD]"/>}
                                            </div>
                                        )
                                    })}
                                </div>

                                <div className="flex flex-col gap-2 pt-3 border-t border-[#E8E5DD]">
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <div
                                            className="flex-1 min-w-0 flex items-center gap-2 border border-[#E8E5DD] rounded-lg px-3 focus-within:border-[#3F6C51] transition-colors duration-150">
                                            <FiUser size={12} className="text-[#6B6A63] shrink-0"/>
                                            <input type="text" placeholder="이름" value={newName}
                                                   onChange={(e) => setNewName(e.target.value)}
                                                   className="w-full py-2 text-[13px] outline-none bg-transparent"/>
                                        </div>
                                        <div
                                            className="flex-1 min-w-0 flex items-center gap-2 border border-[#E8E5DD] rounded-lg px-3 focus-within:border-[#3F6C51] transition-colors duration-150">
                                            <span className="text-[11px] text-[#6B6A63] shrink-0">ID</span>
                                            <input type="text" placeholder="아이디" value={newUsername}
                                                   onChange={(e) => setNewUsername(e.target.value)}
                                                   className="w-full py-2 text-[13px] outline-none bg-transparent"/>
                                        </div>
                                        <button
                                            onClick={addUser}
                                            className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#3F6C51] text-white text-[13px] font-medium cursor-pointer hover:bg-[#345A44] transition-colors duration-150"
                                        >
                                            <FiPlus size={14}/>
                                            사용자 추가
                                        </button>
                                    </div>
                                    <p className="text-[12px] text-[#6B6A63]">초기 비밀번호는 0000 입니다.</p>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="flex flex-col gap-2 mb-3">
                                    {workspaces.map(workspace => (
                                        <div key={workspace.hashId}
                                             onClick={() => handleWorkspaceMember(workspace)}
                                             className="flex items-center gap-3 p-3 border border-[#E8E5DD] rounded-xl cursor-pointer hover:border-[#3F6C51] hover:bg-[#FAFAF7] transition-colors duration-150">
                                            <div
                                                className="w-9 h-9 rounded-lg bg-[#EAF1EC] text-[#3F6C51] flex items-center justify-center text-[13px] font-semibold shrink-0">
                                                {workspace.name[0]}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold truncate">{workspace.name}</p>
                                                <p className="text-[0.8rem] text-[#23241F] truncate">{workspace.description}</p>
                                                <p className="text-[12px] text-[#6B6A63]">구성원 {workspace.userCount}명</p>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    deleteWorkspace(workspace)
                                                }}
                                                className="w-7 h-7 flex items-center justify-center rounded-full text-[#6B6A63] hover:bg-[#FBEAE9] hover:text-[#B3261E] cursor-pointer transition-colors duration-150 shrink-0"
                                            >
                                                <FiTrash2 size={13}/>
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-2 pt-3 border-t border-[#E8E5DD]">
                                    <input
                                        type="text"
                                        placeholder="새 워크스페이스 이름"
                                        value={newWorkspaceName}
                                        onChange={(e) => setNewWorkspaceName(e.target.value)}
                                        className="flex-1 min-w-0 border border-[#E8E5DD] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#3F6C51] transition-colors duration-150"
                                    />
                                    <input
                                        type="text"
                                        placeholder="새 워크스페이스 설명"
                                        value={newWorkspaceDescription}
                                        onChange={(e) => setNewWorkspaceDescription(e.target.value)}
                                        className="flex-1 min-w-0 border border-[#E8E5DD] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#3F6C51] transition-colors duration-150"
                                    />
                                    <button
                                        onClick={addWorkspace}
                                        className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#3F6C51] text-white text-[13px] font-medium cursor-pointer hover:bg-[#345A44] transition-colors duration-150"
                                    >
                                        <FiPlus size={14}/>
                                        추가
                                    </button>
                                </div>
                            </div>
                        )}
                    </SettingsCard>
                }
            </div>

            {(preference.isSuperuser && openWorkspace) && (
                <Modal isOpen={!!openWorkspace} variant="sheet"
                       className="w-full h-full sm:h-[85vh] sm:max-w-md sm:rounded-2xl sm:shadow-2xl"
                       onClose={() => {
                           setOpenWorkspaceId(null)
                           setWorkspaceMembers([])
                       }}>
                    <div className="flex items-center justify-between p-3 border-b border-[#E8E5DD] shrink-0">
                        <div className="text-xl font-medium text-[#23241F]">{openWorkspace.name}</div>
                        <button
                            onClick={() => {
                                setOpenWorkspaceId(null)
                                setWorkspaceMembers([])
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded-full text-[#6B6A63] hover:bg-[#FAFAF7] hover:text-[#23241F] cursor-pointer transition-colors duration-150"
                            aria-label="닫기"
                        >
                            <FiX size={18}/>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3">
                        <div className="border-b border-[#E8E5DD] pb-3">
                            <div className="flex flex-col sm:flex-row gap-2">
                                <select
                                    value={selectedUserId}
                                    onChange={(e) => setSelectedUserId(e.target.value)}
                                    className="flex-1 min-w-0 border border-[#E8E5DD] rounded-lg px-3 py-2 text-[13px] bg-white cursor-pointer outline-none focus:border-[#3F6C51] transition-colors duration-150"
                                >
                                    <option value="">사용자 선택</option>
                                    {users
                                        .filter(u => !workspaceMembers.some(m => m.userHash === u.userHash))
                                        .map(u => <option key={u.userHash} value={u.userHash}>{u.name}</option>)}
                                </select>
                                <button
                                    onClick={addIntoWorkspace}
                                    className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#3F6C51] text-white text-[13px] font-medium cursor-pointer hover:bg-[#345A44] transition-colors duration-150"
                                >
                                    <FiPlus size={14}/>
                                    추가
                                </button>
                            </div>
                        </div>

                        {workspaceMembers.length === 0 ? (
                            <div className="text-[13px] text-[#6B6A63] py-2">아직 구성원이 없어요.</div>
                        ) : (
                            <div className="flex flex-col mb-4">
                                {workspaceMembers.map((member, i) => (
                                    <div key={member.userHash}>
                                        <div className="flex items-center gap-2.5 py-2.5">
                                        <span
                                            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#EAF1EC] text-[#3F6C51] text-[12px] font-medium shrink-0">
                                            {member.name[0]}
                                        </span>
                                            <p className="flex-1 min-w-0 text-[14px] text-[#23241F] truncate">{member.name}</p>
                                            <button
                                                onClick={() => removeUserFromWorkspace(member.userHash)}
                                                className="w-7 h-7 flex items-center justify-center rounded-full text-[#6B6A63] hover:bg-[#FBEAE9] hover:text-[#B3261E] cursor-pointer transition-colors duration-150 shrink-0"
                                            >
                                                <FiX size={14}/>
                                            </button>
                                        </div>
                                        {i < workspaceMembers.length - 1 && <div className="h-px bg-[#E8E5DD]"/>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Modal>
            )}
        </main>
    )
}