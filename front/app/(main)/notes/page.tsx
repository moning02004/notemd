"use client"

import Link from "next/link";
import { useRouter } from "next/navigation";

const mockupMemo = [
    {title: "블로그 개발 2", id: "1", author: "유정훈", created_at: "2025-01-01 13:59", isShared: false, url: "/notes/h2hf3if"},
    {title: "블로그 개발 1", id: "2", author: "유정훈", created_at: "2025-01-01 12:59", isShared: false, url: "/notes/h2hf3if2"},
    {title: "블로그 개발 3", id: "3", author: "유정훈", created_at: "2025-01-01 11:59", isShared: false, url: "/notes/h2hf33if"},
    {title: "블로그 개발 4", id: "4", author: "유정훈", created_at: "2025-01-01 10:59", isShared: true, url: "/notes/h2hf34if"},
    {title: "블로그 개발 3", id: "3", author: "유정훈", created_at: "2025-01-01 11:59", isShared: false, url: "/notes/h2hf53if"},
    {title: "블로그 개발 3", id: "3", author: "유정훈", created_at: "2025-01-01 11:59", isShared: false, url: "/notes/h2hf63if"},
    {title: "블로그 개발 3", id: "3", author: "유정훈", created_at: "2025-01-01 11:59", isShared: false, url: "/notes/h2hf73if"},
    {title: "블로그 개발 3", id: "3", author: "유정훈", created_at: "2025-01-01 11:59", isShared: false, url: "/notes/h2hf83if"},
    {title: "블로그 개발 3", id: "3", author: "유정훈", created_at: "2025-01-01 11:59", isShared: false, url: "/notes/h2hf93if"},
    {title: "블로그 개발 3", id: "3", author: "유정훈", created_at: "2025-01-01 11:59", isShared: false, url: "/notes/h2hf03if"},
]

export default function() {
    const router = useRouter();

    const gotoNote = (teamId: string) => {
        router.push(`/team/${teamId}`);
    }

    return (
        <div className=" h-[100%]">
            <div className="flex flex-col w-[90%] mx-auto mt-3">
                {mockupMemo.map((x, index) => {
                    return (
                        <Link 
                            href={x.url}
                            key={index}
                            className="flex flex-row py-3 border-b border-[#ededed] hover:bg-white cursor-pointer">
                            <div className="flex-1">{x.id}</div>
                            <div className="flex-5">{x.title}</div>
                            <div className="flex-1">{x.author}</div>
                            <div className="flex-2">{x.created_at}</div>
                            <div className="flex-1">{x.isShared ? '공유됨' : ''}</div>
                        </Link>
                    )
                })}
                
            </div>
        </div>
    )
}