export const LoadingPage = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-8 bg-[#FAFAF4]">
            <style>{`
                @keyframes pulse-dot {
                    0%, 100% { opacity: 0.2; transform: scale(1); }
                    50%      { opacity: 1;   transform: scale(1.3); }
                }
                @keyframes appear {
                    from { opacity: 0; transform: translateY(8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .dot:nth-child(1) { animation: pulse-dot 1.4s ease-in-out infinite 0.0s; }
                .dot:nth-child(2) { animation: pulse-dot 1.4s ease-in-out infinite 0.2s; }
                .dot:nth-child(3) { animation: pulse-dot 1.4s ease-in-out infinite 0.4s; }
                .caption { animation: appear 0.6s ease both; }
            `}</style>

            <div className="caption flex flex-col items-center gap-3">
                <span className="text-[15px] font-medium text-[#2C2C2A] tracking-tight">
                    잠시만 기다려 주세요
                </span>
                <div className="flex gap-[6px]">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="dot w-[5px] h-[5px] rounded-full bg-[#888780]" />
                    ))}
                </div>
            </div>
        </div>
    )
}