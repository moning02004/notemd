"use client"

import type {CollabPeer} from "@/hooks/useCollabDocument"

const MAX_SHOWN = 4

/**
 * 지금 이 노트를 같이 연 사람들(공동 편집). 커서 색과 같은 동그라미에 이름 첫 글자를 넣는다.
 * 커서가 화면 밖에 있어도 누가 함께 있는지 보이게 한다. 많으면 넷까지 보이고 나머지는 +n.
 */
export function CollabPeers({peers}: { peers: CollabPeer[] }) {
    if (!peers.length) return null

    const shown = peers.slice(0, MAX_SHOWN)
    const rest = peers.length - shown.length
    const names = peers.map(peer => peer.name).join(", ")

    return (
        <div className="flex shrink-0 items-center pl-2 pr-1" aria-label={`같이 보는 사람: ${names}`} title={names}>
            {shown.map(peer => (
                <span key={peer.key}
                      className="-ml-1.5 first:ml-0 flex h-7 w-7 items-center justify-center rounded-full
                                 border-2 border-surface text-[11px] font-semibold text-white select-none"
                      style={{backgroundColor: peer.color}}
                      title={peer.name}>
                    {Array.from(peer.name)[0] ?? "?"}
                </span>
            ))}
            {rest > 0 &&
                <span className="-ml-1.5 flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-surface
                                 bg-background px-1 text-[11px] font-semibold text-muted select-none">
                    +{rest}
                </span>}
        </div>
    )
}
