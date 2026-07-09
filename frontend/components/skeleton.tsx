export const SkeletonLoading = ({count = 8}: { count?: number }) => {
    return (
        <>
            {Array.from({length: count}).map((_, i) => (
                <div key={i}
                     className="rounded-2xl w-full h-[8rem] md:h-[16rem] bg-white border border-[#E8E5DD] overflow-hidden relative">
                    <div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-[#F0EEE7] to-transparent animate-pulse"/>
                </div>
            ))}
        </>
    )
}
