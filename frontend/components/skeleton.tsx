export const SkeletonLoading = ({count = 8}: { count?: number }) => {
    return (
        <>
            {Array.from({length: count}).map((_, i) => (
                <div key={i}
                     className="rounded-xl w-full h-[8rem] md:h-[16rem] bg-surface border border-border overflow-hidden relative">
                    <div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-background to-transparent animate-pulse"/>
                </div>
            ))}
        </>
    )
}
