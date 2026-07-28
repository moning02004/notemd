"use client"

import {useEffect, useState} from "react";
import {
    FiClock,
    FiExternalLink,
    FiGithub,
    FiLayers,
    FiPackage,
    FiPlus,
    FiSliders,
    FiTrash2,
    FiUser,
    FiX
} from "react-icons/fi";
import toast from "react-hot-toast";
import {apiRequest} from "@/lib/api";
import {Modal} from "@/components/ui/modal";
import {SettingsCard} from "@/components/ui/settings_card";
import {UserAccount, Workspace, WorkspaceMember} from "@/types/workspace";
import {LoadingPage} from "@/components/loading";

type MemberTab = "users" | "workspaces";

const STACK_INFO = {
    version: "v2.0.3",
    frontend: "Next.js (TypeScript)",
    backend: "FastAPI (Python)",
    deployment: "Docker Compose",
    links: {
        github: "https://github.com/moning02004/notemd",
        dockerhub: "https://hub.docker.com/r/moning02004/notemd",
        issues: "https://github.com/moning02004/notemd/issues",
    },
}

interface Preference {
    isSuperuser: boolean;
    trashPolicy: string;
    snapshotPolicy: string;
}

export default function Page() {
    const [users, setUsers] = useState<UserAccount[]>([])
    const [workspaces, setWorkspaces] = useState<Workspace[]>([])
    const [preference, setPreference] = useState<Preference | null>(null)
    const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([])

    useEffect(() => {
        apiRequest.get("/preferences")
            .then((data: { is_superuser: boolean, trash_policy: string, snapshot_policy: string }) => {
                setPreference({
                    isSuperuser: data.is_superuser,
                    trashPolicy: data.trash_policy,
                    snapshotPolicy: data.snapshot_policy,
                })
                if (!data.is_superuser) return;
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
            })
    }, []);

    const updatePreference = async (patch: Partial<Pick<Preference, "snapshotPolicy" | "trashPolicy">>) => {
        if (!preference) return

        const previous = preference
        const next = {...preference, ...patch}
        setPreference(next)

        await apiRequest.patch("/preferences", {
            body: JSON.stringify({
                snapshot_policy: next.snapshotPolicy,
                trash_policy: next.trashPolicy,
            })
        }).catch(() => {
            setPreference(previous)
            toast.error("설정을 저장하지 못했습니다.")
        })
    }

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

    const deleteWorkspace = async (workspace: Workspace) => {
        if (!confirm(`"${workspace.name}" 워크스페이스를 삭제하시겠습니까?`)) return

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
        if (!selectedUserId) return

        await apiRequest.post(`/workspaces/${openWorkspaceId}/users/${selectedUserId}`)
            .then((user: { user_hash: string, username: string, user_name: string }) => {
                setWorkspaceMembers([...workspaceMembers, {
                    userHash: user.user_hash,
                    username: user.username,
                    name: user.user_name,
                }])
                setSelectedUserId("")
                setWorkspaces(prev => prev.map(w =>
                    w.hashId === openWorkspaceId ? {...w, userCount: w.userCount + 1} : w
                ))
            })
    }

    const removeUserFromWorkspace = async (userHash: string) => {
        await apiRequest.delete(`/workspaces/${openWorkspaceId}/users/${userHash}`)
            .then(() => {
                setWorkspaceMembers(workspaceMembers.filter(m => m.userHash !== userHash))
                setWorkspaces(prev => prev.map(w =>
                    w.hashId === openWorkspaceId ? {...w, userCount: Math.max(0, w.userCount - 1)} : w
                ))
            })
    }

    const selectClassName = "border border-border-strong rounded-lg px-3 py-1.5 text-[13px] font-medium text-accent bg-background cursor-pointer outline-none hover:border-accent focus:border-accent transition-colors duration-150 shrink-0"
    const inputClassName = "bg-background border border-border-strong rounded-lg px-3 py-2 text-[13px] text-foreground placeholder:text-subtle outline-none focus:border-accent transition-colors duration-150"
    const primaryButtonClassName = "shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-[13px] font-medium cursor-pointer hover:bg-accent-hover transition-colors duration-150"

    if (!preference) return <LoadingPage/>
    return (
        <main className="flex-1 overflow-auto w-full max-w-2xl mx-auto my-5 px-4 md:px-0">
            <div className="flex flex-col gap-4">

                {/* 노트 관리 */}
                <SettingsCard title="노트 관리" icon={<FiSliders size={11}/>}>
                    <div className="flex items-center justify-between py-2 gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <span
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-accent-soft text-accent shrink-0">
                                <FiClock size={14}/>
                            </span>
                            <div className="min-w-0">
                                <p className="text-[14px] text-foreground">스냅샷 자동 생성</p>
                                <p className="text-[12px] text-subtle">노트 변경 이력을 언제 저장할지 정해요.</p>
                            </div>
                        </div>
                        <select
                            value={preference.snapshotPolicy}
                            onChange={(e) => updatePreference({snapshotPolicy: e.target.value})}
                            className={selectClassName}
                        >
                            <option value="ON_FIRST_EDIT">열고 처음 수정 시</option>
                            <option value="ON_EVERY_EDIT">수정마다</option>
                            <option value="MANUAL">수동</option>
                        </select>
                    </div>

                    <div className="h-px bg-border my-1"/>

                    <div className="flex items-center justify-between py-2 gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <span
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-danger-soft text-danger shrink-0">
                                <FiTrash2 size={14}/>
                            </span>
                            <div className="min-w-0">
                                <p className="text-[14px] text-foreground">휴지통 자동 삭제</p>
                                <p className="text-[12px] text-subtle">삭제된 노트를 완전히 지우기까지 걸리는 기간이에요.</p>
                            </div>
                        </div>
                        <select
                            value={preference.trashPolicy}
                            onChange={(e) => updatePreference({trashPolicy: e.target.value})}
                            className={selectClassName}
                        >
                            <option value="14_DAYS">14일 후</option>
                            <option value="30_DAYS">30일 후</option>
                            <option value="NEVER">삭제 안 함</option>
                        </select>
                    </div>
                </SettingsCard>

                {preference.isSuperuser &&
                    <SettingsCard title="구성원" icon={<FiLayers size={11}/>}>
                        <div className="flex gap-1 bg-background p-1 rounded-lg mb-4 border border-border">
                            <button
                                onClick={() => setMemberTab("users")}
                                className={`flex-1 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-colors duration-150
                                ${memberTab === "users" ? "bg-surface text-accent shadow-sm" : "text-muted hover:text-foreground"}`}
                            >
                                사용자 {users.length > 0 && <span className="text-subtle">{users.length}</span>}
                            </button>
                            <button
                                onClick={() => setMemberTab("workspaces")}
                                className={`flex-1 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-colors duration-150
                                ${memberTab === "workspaces" ? "bg-surface text-accent shadow-sm" : "text-muted hover:text-foreground"}`}
                            >
                                워크스페이스 {workspaces.length > 0 &&
                                <span className="text-subtle">{workspaces.length}</span>}
                            </button>
                        </div>

                        {memberTab === "users" ? (
                            <div>
                                {users.length === 0 ? (
                                    <div className="py-6 text-center">
                                        <p className="text-[13px] text-muted">아직 사용자가 없어요.</p>
                                        <p className="text-[12px] text-subtle mt-1">아래에서 첫 사용자를 추가해보세요.</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col mb-3">
                                        {users.map((user, i) => (
                                            <div key={user.userHash}>
                                                <div className="flex items-center gap-2.5 py-2.5">
                                                    <span
                                                        className="w-8 h-8 flex items-center justify-center rounded-full bg-accent-soft text-accent text-[12px] font-medium shrink-0">
                                                        {user.name[0]?.toUpperCase()}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[14px] text-foreground truncate">{user.name}</p>
                                                        <p className="text-[12px] text-subtle truncate">{user.username}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => deleteUser(user)}
                                                        aria-label={`${user.name} 삭제`}
                                                        className="w-7 h-7 flex items-center justify-center rounded-full text-subtle hover:bg-danger-soft hover:text-danger cursor-pointer transition-colors duration-150 shrink-0"
                                                    >
                                                        <FiX size={14}/>
                                                    </button>
                                                </div>
                                                {i < users.length - 1 && <div className="h-px bg-border"/>}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex flex-col gap-2 pt-3 border-t border-border">
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <div
                                            className="flex-1 min-w-0 flex items-center gap-2 bg-background border border-border-strong rounded-lg px-3 focus-within:border-accent transition-colors duration-150">
                                            <FiUser size={12} className="text-subtle shrink-0"/>
                                            <input type="text" placeholder="이름" value={newName}
                                                   onChange={(e) => setNewName(e.target.value)}
                                                   className="w-full py-2 text-[13px] text-foreground placeholder:text-subtle outline-none bg-transparent"/>
                                        </div>
                                        <div
                                            className="flex-1 min-w-0 flex items-center gap-2 bg-background border border-border-strong rounded-lg px-3 focus-within:border-accent transition-colors duration-150">
                                            <span className="text-[11px] text-subtle shrink-0">ID</span>
                                            <input type="text" placeholder="아이디" value={newUsername}
                                                   onChange={(e) => setNewUsername(e.target.value)}
                                                   className="w-full py-2 text-[13px] text-foreground placeholder:text-subtle outline-none bg-transparent"/>
                                        </div>
                                        <button onClick={addUser} className={primaryButtonClassName}>
                                            <FiPlus size={14}/>
                                            사용자 추가
                                        </button>
                                    </div>
                                    <p className="text-[12px] text-subtle">초기 비밀번호는 0000 입니다.</p>
                                </div>
                            </div>
                        ) : (
                            <div>
                                {workspaces.length === 0 ? (
                                    <div className="py-6 text-center">
                                        <p className="text-[13px] text-muted">아직 워크스페이스가 없어요.</p>
                                        <p className="text-[12px] text-subtle mt-1">노트를 함께 볼 팀 단위로 만들어보세요.</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2 mb-3">
                                        {workspaces.map(workspace => (
                                            <div key={workspace.hashId}
                                                 onClick={() => handleWorkspaceMember(workspace)}
                                                 className="flex items-center gap-3 p-3 bg-background border border-border-strong rounded-xl cursor-pointer hover:border-accent hover:bg-accent-soft transition-colors duration-150">
                                                <div
                                                    className="w-9 h-9 rounded-lg bg-accent-soft text-accent flex items-center justify-center text-[13px] font-medium shrink-0">
                                                    {workspace.name[0]?.toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[14px] font-medium text-foreground truncate">{workspace.name}</p>
                                                    {workspace.description && (
                                                        <p className="text-[12px] text-muted truncate">{workspace.description}</p>
                                                    )}
                                                    <p className="text-[12px] text-subtle mt-0.5">구성원 {workspace.userCount}명</p>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        deleteWorkspace(workspace)
                                                    }}
                                                    aria-label={`${workspace.name} 삭제`}
                                                    className="w-7 h-7 flex items-center justify-center rounded-full text-subtle hover:bg-danger-soft hover:text-danger cursor-pointer transition-colors duration-150 shrink-0"
                                                >
                                                    <FiTrash2 size={13}/>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-border">
                                    <input
                                        type="text"
                                        placeholder="새 워크스페이스 이름"
                                        value={newWorkspaceName}
                                        onChange={(e) => setNewWorkspaceName(e.target.value)}
                                        className={`flex-1 min-w-0 ${inputClassName}`}
                                    />
                                    <input
                                        type="text"
                                        placeholder="설명 (선택)"
                                        value={newWorkspaceDescription}
                                        onChange={(e) => setNewWorkspaceDescription(e.target.value)}
                                        className={`flex-1 min-w-0 ${inputClassName}`}
                                    />
                                    <button onClick={addWorkspace} className={primaryButtonClassName}>
                                        <FiPlus size={14}/>
                                        추가
                                    </button>
                                </div>
                            </div>
                        )}
                    </SettingsCard>
                }

                {/* 정보 */}
                <SettingsCard title="정보" icon={<FiPackage size={11}/>}>
                    <div className="flex items-center gap-2 py-1">
                        <p className="text-[15px] font-medium text-foreground">note.md</p>
                        <span
                            className="text-[11px] px-2 py-0.5 rounded-full bg-accent-soft text-accent">{STACK_INFO.version}</span>
                    </div>

                    <dl className="grid grid-cols-[92px_1fr] gap-y-1.5 text-[13px] mt-2">
                        <dt className="text-subtle">Frontend</dt>
                        <dd className="text-muted">{STACK_INFO.frontend}</dd>

                        <dt className="text-subtle">Backend</dt>
                        <dd className="text-muted">{STACK_INFO.backend}</dd>

                        <dt className="text-subtle">Deployment</dt>
                        <dd className="text-muted">{STACK_INFO.deployment}</dd>
                    </dl>

                    <div className="flex flex-wrap gap-2 pt-3 mt-3 border-t border-border">
                        <a href={STACK_INFO.links.github} target="_blank" rel="noopener noreferrer"
                           className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-strong text-[13px] text-muted hover:border-accent hover:text-accent hover:bg-accent-soft transition-colors duration-150">
                            <FiGithub size={13}/>
                            GitHub
                        </a>
                        <a href={STACK_INFO.links.dockerhub} target="_blank" rel="noopener noreferrer"
                           className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-strong text-[13px] text-muted hover:border-accent hover:text-accent hover:bg-accent-soft transition-colors duration-150">
                            <FiPackage size={13}/>
                            Docker Hub
                        </a>
                        <a href={STACK_INFO.links.issues} target="_blank" rel="noopener noreferrer"
                           className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-strong text-[13px] text-muted hover:border-accent hover:text-accent hover:bg-accent-soft transition-colors duration-150">
                            <FiExternalLink size={13}/>
                            이슈 리포트
                        </a>
                    </div>
                </SettingsCard>
            </div>

            {(preference.isSuperuser && openWorkspace) && (
                <Modal isOpen={!!openWorkspace} variant="sheet"
                       className="w-full h-full sm:h-[85vh] sm:max-w-md sm:rounded-2xl sm:shadow-2xl"
                       onClose={() => {
                           setOpenWorkspaceId(null)
                           setWorkspaceMembers([])
                           setSelectedUserId("")
                       }}>
                    <div className="flex items-center justify-between p-3 border-b border-border shrink-0">
                        <div className="min-w-0">
                            <div className="text-[17px] font-medium text-foreground truncate">{openWorkspace.name}</div>
                            <div className="text-[12px] text-subtle">구성원 {workspaceMembers.length}명</div>
                        </div>
                        <button
                            onClick={() => {
                                setOpenWorkspaceId(null)
                                setWorkspaceMembers([])
                                setSelectedUserId("")
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded-full text-muted hover:bg-accent-soft hover:text-accent cursor-pointer transition-colors duration-150 shrink-0"
                            aria-label="닫기"
                        >
                            <FiX size={18}/>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3">
                        <div className="border-b border-border pb-3">
                            <div className="flex flex-col sm:flex-row gap-2">
                                <select
                                    value={selectedUserId}
                                    onChange={(e) => setSelectedUserId(e.target.value)}
                                    className="flex-1 min-w-0 bg-background border border-border-strong rounded-lg px-3 py-2 text-[13px] text-foreground cursor-pointer outline-none focus:border-accent transition-colors duration-150"
                                >
                                    <option value="">사용자 선택</option>
                                    {users
                                        .filter(u => !workspaceMembers.some(m => m.userHash === u.userHash))
                                        .map(u => <option key={u.userHash} value={u.userHash}>{u.name}</option>)}
                                </select>
                                <button onClick={addIntoWorkspace} className={primaryButtonClassName}>
                                    <FiPlus size={14}/>
                                    추가
                                </button>
                            </div>
                        </div>

                        {workspaceMembers.length === 0 ? (
                            <div className="py-6 text-center">
                                <p className="text-[13px] text-muted">아직 구성원이 없어요.</p>
                                <p className="text-[12px] text-subtle mt-1">위에서 사용자를 골라 추가해보세요.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col mb-4">
                                {workspaceMembers.map((member, i) => (
                                    <div key={member.userHash}>
                                        <div className="flex items-center gap-2.5 py-2.5">
                                            <span
                                                className="w-8 h-8 flex items-center justify-center rounded-full bg-accent-soft text-accent text-[12px] font-medium shrink-0">
                                                {member.name[0]?.toUpperCase()}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[14px] text-foreground truncate">{member.name}</p>
                                                <p className="text-[12px] text-subtle truncate">{member.username}</p>
                                            </div>
                                            <button
                                                onClick={() => removeUserFromWorkspace(member.userHash)}
                                                aria-label={`${member.name} 내보내기`}
                                                className="w-7 h-7 flex items-center justify-center rounded-full text-subtle hover:bg-danger-soft hover:text-danger cursor-pointer transition-colors duration-150 shrink-0"
                                            >
                                                <FiX size={14}/>
                                            </button>
                                        </div>
                                        {i < workspaceMembers.length - 1 && <div className="h-px bg-border"/>}
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