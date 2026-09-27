"use client";

import {Providers} from "@/app/(main)/providers";

export default function MainLayout({children}: {
    children: React.ReactNode;
}) {

    // 노트 화면의 에디터도 폴더 목록(노트 고르기 창) 등 React Query 를 쓴다.
    return (
        <Providers>
            <div className="flex flex-col h-screen font-sans bg-editor">
                <main className="flex-1 overflow-auto">{children}</main>
            </div>
        </Providers>
    );
}
