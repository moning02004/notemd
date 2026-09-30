"use client"

import {useEffect, useState} from "react"
import toast from "react-hot-toast"
import {FiCode, FiTrash2} from "react-icons/fi"

import {apiRequest} from "@/lib/api"
import {API_HOST} from "@/constants/api"
import {Modal} from "@/components/ui/modal"
import {SettingsCard} from "@/components/ui/settings_card"

type Scope = "write" | "read_write"

interface ApiToken {
    hash_id: string
    name: string
    prefix: string
    scope: Scope
    created_at: string
    last_used_at: string | null
}

const SCOPE_LABEL: Record<Scope, string> = {write: "쓰기", read_write: "읽기·쓰기"}

const formatDate = (value: string) =>
    new Date(value).toLocaleString("ko-KR", {year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"})

/**
 * AI 에이전트 같은 프로그램이 노트를 쓰고 읽을 때 쓰는 개인 API 토큰.
 *
 * 토큰 원문은 만들 때 한 번만 보여준다(서버에는 해시만 남는다). 목록에는 앞부분과 마지막 사용 시각만 보인다.
 */
export function SettingsApiTokens() {
    const [tokens, setTokens] = useState<ApiToken[] | null>(null)
    const [name, setName] = useState("")
    const [scope, setScope] = useState<Scope>("write")
    const [issued, setIssued] = useState<{ name: string, token: string } | null>(null)

    useEffect(() => {
        apiRequest.get<ApiToken[]>("/api-tokens")
            .then(setTokens)
            .catch(() => setTokens([]))
    }, [])

    const create = async () => {
        if (!name.trim()) return
        try {
            const created = await apiRequest.post<ApiToken & { token: string }>("/api-tokens", {
                body: JSON.stringify({name: name.trim(), scope}),
            })
            const {token, ...rest} = created
            setTokens(previous => [rest, ...(previous ?? [])])
            setIssued({name: created.name, token})
            setName("")
        } catch (error) {
            toast.error((error as { detail?: string })?.detail || "토큰을 만들지 못했습니다.")
        }
    }

    const revoke = async (token: ApiToken) => {
        if (!confirm(`'${token.name}' 토큰을 폐기할까요? 이 토큰을 쓰는 프로그램은 더 노트를 쓰거나 읽을 수 없어요.`)) return
        try {
            await apiRequest.delete(`/api-tokens/${token.hash_id}`)
            setTokens(previous => (previous ?? []).filter(t => t.hash_id !== token.hash_id))
        } catch {
            toast.error("토큰을 폐기하지 못했습니다.")
        }
    }

    const copy = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text)
            toast.success(`${label}을 복사했습니다.`)
        } catch {
            toast.error("복사하지 못했습니다. 직접 골라 복사해주세요.")
        }
    }

    // 에이전트에 붙이는 두 가지 방법. MCP 를 지원하는 에이전트(Claude Code 등)는 명령 한 줄이면 도구로 쓴다.
    const examples = issued ? {
        mcp: `claude mcp add --transport http notemd ${API_HOST ?? ""}/mcp \\\n  --header "Authorization: Bearer ${issued.token}"`,
        curl: [
            `curl -X POST ${API_HOST ?? ""}/api/v1/notes \\`,
            `  -H "Authorization: Bearer ${issued.token}" \\`,
            `  -H "Content-Type: application/json" \\`,
            `  -d '{"title": "오늘 회의", "folder": "업무/회의", "content": "- [ ] 할 일"}'`,
        ].join("\n"),
    } : null
    const [exampleKind, setExampleKind] = useState<"mcp" | "curl">("mcp")
    const example = examples?.[exampleKind] ?? ""

    return (
        <SettingsCard title="API 토큰" icon={<FiCode size={11}/>}>
            <p className="text-[12px] text-subtle mb-2">
                AI 에이전트나 스크립트가 내 노트를 만들고 덧붙이게 해요. 읽기·쓰기 토큰은 노트를 찾고 읽을 수도 있어요.
            </p>

            {tokens && tokens.length > 0 && (
                <div className="flex flex-col mb-2">
                    {tokens.map((token, i) => (
                        <div key={token.hash_id}>
                            <div className="flex items-center gap-2.5 py-2.5">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[14px] text-foreground truncate">
                                        {token.name}
                                        <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded bg-accent-soft text-accent align-middle">
                                            {SCOPE_LABEL[token.scope]}
                                        </span>
                                    </p>
                                    <p className="text-[12px] text-subtle truncate">
                                        <span className="font-mono">{token.prefix}…</span>
                                        {" · "}
                                        {token.last_used_at ? `마지막 사용 ${formatDate(token.last_used_at)}` : "아직 쓰지 않음"}
                                    </p>
                                </div>
                                <button onClick={() => void revoke(token)}
                                        aria-label={`${token.name} 토큰 폐기`} title="폐기"
                                        className="w-7 h-7 flex items-center justify-center rounded-full text-subtle hover:bg-danger-soft hover:text-danger cursor-pointer transition-colors duration-150 shrink-0">
                                    <FiTrash2 size={13}/>
                                </button>
                            </div>
                            {i < tokens.length - 1 && <div className="h-px bg-border"/>}
                        </div>
                    ))}
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-border">
                <input type="text" placeholder="토큰 이름 (예: Claude)" value={name}
                       onChange={e => setName(e.target.value)}
                       onKeyDown={e => {
                           if (e.key === "Enter" && !e.nativeEvent.isComposing) void create()
                       }}
                       className="flex-1 min-w-0 bg-background border border-border-strong rounded-lg px-3 py-2 text-[13px] text-foreground placeholder:text-subtle outline-none focus:border-accent"/>
                <select value={scope} onChange={e => setScope(e.target.value as Scope)} aria-label="토큰 권한"
                        className="bg-background border border-border-strong rounded-lg px-2 py-2 text-[13px] text-foreground outline-none focus:border-accent cursor-pointer">
                    <option value="write">쓰기만</option>
                    <option value="read_write">읽기·쓰기</option>
                </select>
                <button onClick={() => void create()}
                        className="shrink-0 px-3 py-2 rounded-lg bg-accent text-white text-[13px] font-medium cursor-pointer hover:bg-accent-hover">
                    토큰 만들기
                </button>
            </div>

            {/* 토큰 원문은 이 창에서만 보인다. 바깥을 눌러도 닫히지 않게 한다. */}
            <Modal isOpen={!!issued} closeOnBackdropClick={false} onClose={() => setIssued(null)}
                   className="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-2xl">
                {issued && (
                    <div className="flex flex-col gap-4">
                        <div>
                            <p className="text-[16px] font-medium text-foreground">&apos;{issued.name}&apos; 토큰을 만들었어요</p>
                            <p className="text-[13px] text-muted mt-1">에이전트 설정에 이 토큰을 넣어 주세요. 비밀번호처럼 다뤄야 해요.</p>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg border border-border-strong bg-background px-3 py-2.5">
                            <span aria-label="API 토큰" className="flex-1 min-w-0 font-mono text-[13px] text-foreground break-all select-all">
                                {issued.token}
                            </span>
                            <button onClick={() => void copy(issued.token, "토큰")}
                                    className="shrink-0 px-2.5 py-1 rounded-md text-[12.5px] text-accent border border-border-strong hover:bg-accent-soft cursor-pointer">
                                복사
                            </button>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex gap-1" role="tablist" aria-label="연결 방법">
                                    {([["mcp", "에이전트(MCP)에 연결"], ["curl", "API 로 노트 만들기"]] as const).map(([kind, label]) => (
                                        <button key={kind} role="tab" aria-selected={exampleKind === kind}
                                                onClick={() => setExampleKind(kind)}
                                                className={`px-2 py-0.5 rounded text-[12px] cursor-pointer ${exampleKind === kind
                                                    ? "bg-accent-soft text-accent" : "text-muted hover:text-foreground"}`}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                <button onClick={() => example && void copy(example, "예시")}
                                        className="text-[12px] text-accent cursor-pointer hover:underline">예시 복사</button>
                            </div>
                            <pre className="overflow-x-auto rounded-lg bg-background border border-border px-3 py-2 text-[11.5px] leading-relaxed text-foreground">{example}</pre>
                        </div>
                        <p className="text-[12px] text-danger">이 창을 닫으면 토큰을 다시 볼 수 없어요. 잃어버리면 폐기하고 새로 만드세요.</p>
                        <button onClick={() => setIssued(null)}
                                className="w-full py-2.5 rounded-lg bg-accent text-white text-[14px] font-medium cursor-pointer hover:bg-accent-hover">
                            저장했어요, 닫기
                        </button>
                    </div>
                )}
            </Modal>
        </SettingsCard>
    )
}
