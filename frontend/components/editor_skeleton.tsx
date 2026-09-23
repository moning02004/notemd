/**
 * 노트를 여는 동안 보여줄 에디터 뼈대.
 *
 * 전체 화면 로딩 문구로 덮으면 화면이 통째로 바뀌었다가 또 바뀌어 더 오래 걸린 것처럼
 * 보인다. 제목·도구막대·본문 자리를 미리 같은 위치에 그려두면 내용만 채워지는 것처럼 보인다.
 */
export function EditorSkeleton() {
    return (
        <div className="h-screen w-full flex flex-col bg-surface" aria-busy="true" aria-label="노트를 불러오는 중">
            <div className="flex items-center gap-3 border-b border-border px-4 h-14 shrink-0">
                <div className="skeleton w-6 h-6 rounded-lg"/>
                <div className="skeleton h-5 w-1/3 max-w-[16rem]"/>
                <div className="skeleton w-6 h-6 rounded-lg ml-auto"/>
            </div>

            <div className="flex items-center gap-2 border-b border-border px-4 h-11 shrink-0">
                {Array.from({length: 8}).map((_, i) => (
                    <div key={i} className="skeleton w-7 h-6 rounded-md"/>
                ))}
            </div>

            <div className="flex flex-col gap-3 px-6 md:px-10 py-8 max-w-3xl w-full mx-auto">
                {["w-full", "w-11/12", "w-4/5", "w-full", "w-2/3", "w-full", "w-3/4"].map((width, i) => (
                    <div key={i} className={`skeleton h-4 ${width}`}/>
                ))}
            </div>
        </div>
    )
}
