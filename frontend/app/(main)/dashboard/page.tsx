"use client"

import Link from "next/link";
import { useRouter } from "next/navigation";

const mockupMemo = [
    {title: "블로그 개발 2", id: "1", author: "유정훈", created_at: "2025-01-01 13:59", isShared: false},
    {title: "블로그 개발 1", id: "2", author: "유정훈", created_at: "2025-01-01 12:59", isShared: false},
    {title: "블로그 개발 3", id: "3", author: "유정훈", created_at: "2025-01-01 11:59", isShared: false},
    {title: "블로그 개발 4", id: "4", author: "유정훈", created_at: "2025-01-01 10:59", isShared: true},
    {title: "블로그 개발 4", id: "4", author: "유정훈", created_at: "2025-01-01 10:59", isShared: true},
]

export default function() {
    const router = useRouter();

    const gotoNote = (teamId: string) => {
        router.push(`/team/${teamId}`);
    }

    return (
        <div className="flex flex-col w-[90%] mx-auto">
            <div className="p-3 flex flex-row border-b border-[#afafaf] mb-3"> 
                <div className="flex-1">
                    <div>작성한 노트 수</div>
                    <div>1</div>
                </div>
            </div>

            <div className="p-3 flex flex-col w-[100%] mx-auto">
                <b>최근 작성한 노트</b>
                <div className="">
                    {mockupMemo.map((x, index) => {
                        return (
                            <Link 
                                href="-"
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
        </div>
    )
}