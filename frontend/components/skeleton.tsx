import {ViewMode} from "@/store/viewMode";

/**
 * 노트 목록 자리를 미리 잡아두는 뼈대.
 *
 * 실제 목록과 같은 모양(카드/리스트)으로 그려야 내용이 들어올 때 화면이 튀지 않고,
 * 그래야 기다린 티가 덜 난다.
 */
export const SkeletonLoading = ({count = 8, viewMode = "card"}: { count?: number, viewMode?: ViewMode }) => {
    if (viewMode === "list") {
        return (
            <>
                {Array.from({length: count}).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-3 border-b border-border">
                        <div className="flex-1 min-w-0 flex flex-col gap-2">
                            <div className="skeleton h-3.5 w-1/3"/>
                            <div className="skeleton h-3 w-3/5"/>
                        </div>
                        <div className="skeleton h-3 w-20 shrink-0"/>
                    </div>
                ))}
            </>
        )
    }

    return (
        <>
            {Array.from({length: count}).map((_, i) => (
                <div key={i}
                     className="rounded-xl w-full min-h-[11.5rem] bg-surface border border-border p-3.5 flex flex-col gap-2.5">
                    <div className="skeleton h-3.5 w-2/3"/>
                    <div className="skeleton h-3 w-full"/>
                    <div className="skeleton h-3 w-5/6"/>
                    <div className="skeleton h-3 w-1/2"/>
                    <div className="skeleton h-3 w-16 mt-auto ml-auto"/>
                </div>
            ))}
        </>
    )
}

/** 목록 화면이 뜨기 전(route loading·Suspense) 자리를 잡아두는 뼈대. */
export const NoteListSkeleton = ({viewMode = "card"}: { viewMode?: ViewMode }) => (
    <div className="min-h-[100%] bg-surface">
        <div className="h-11 border-b border-border bg-surface"/>
        <div className={viewMode === "list"
            ? "flex flex-col p-4 md:p-6"
            : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4 md:p-6"}>
            <SkeletonLoading count={viewMode === "list" ? 8 : 6} viewMode={viewMode}/>
        </div>
    </div>
)

/** 설정·내 정보처럼 카드가 쌓인 화면의 뼈대. */
export const SettingsSkeleton = () => (
    <div className="flex flex-col gap-4 p-4 md:p-6 max-w-3xl w-full mx-auto">
        {Array.from({length: 3}).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3">
                <div className="skeleton h-3.5 w-24"/>
                <div className="skeleton h-3 w-2/3"/>
                <div className="skeleton h-3 w-1/2"/>
            </div>
        ))}
    </div>
)

/**
 * 로그인 상태를 알기 전(하이드레이션 전)에 깔아두는 앱 뼈대.
 *
 * 서버는 sessionStorage 를 볼 수 없어 항상 '미로그인'으로 그린다. 그 사이에 본 화면을
 * 그리면 클라이언트와 어긋나(hydration mismatch) 트리를 통째로 다시 그리느라 한 번 번쩍인다.
 * 양쪽이 똑같이 그릴 수 있는 뼈대를 먼저 보여주고, 마운트된 뒤에 진짜 화면을 올린다.
 */
export const AppShellSkeleton = () => (
    <div className="flex h-screen bg-background">
        <div className="hidden md:flex md:flex-col md:w-52 md:shrink-0 bg-sidebar border-r border-border p-3 gap-2">
            <div className="skeleton h-9 w-full mb-2"/>
            <div className="skeleton h-8 w-full mb-2"/>
            {Array.from({length: 4}).map((_, i) => (
                <div key={i} className="skeleton h-6 w-full"/>
            ))}
        </div>

        <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center gap-3 px-5 h-14 border-b border-border bg-surface">
                <div className="skeleton h-4 w-28"/>
                <div className="skeleton h-6 w-6 rounded-lg ml-auto"/>
            </div>
            <div className="flex-1 overflow-hidden">
                <NoteListSkeleton/>
            </div>
        </div>
    </div>
)
