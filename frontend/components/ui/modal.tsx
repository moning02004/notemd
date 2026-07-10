"use client"

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    /** centered: 데스크톱/모바일 공통 중앙 백드롭 모달. sheet: 모바일 풀스크린 / 데스크톱 카드형 모달. */
    variant?: "centered" | "sheet"
    /** 기본값: centered는 true(백드롭 클릭 시 닫힘), sheet는 false */
    closeOnBackdropClick?: boolean
    /** 모달 카드(내부 wrapper)에 적용할 크기/라운딩 등 클래스 — 사이즈는 항상 호출부가 결정 */
    className?: string
    children: React.ReactNode
}

export function Modal({
                           isOpen,
                           onClose,
                           variant = "centered",
                           closeOnBackdropClick = variant === "centered",
                           className = "",
                           children,
                       }: ModalProps) {
    if (!isOpen) return null

    if (variant === "sheet") {
        return (
            <div
                className="fixed inset-0 z-50 bg-[#23241F]/30 backdrop-blur-[2px] flex items-stretch sm:items-center justify-center sm:p-4"
                onClick={closeOnBackdropClick ? onClose : undefined}
            >
                <div
                    className={`bg-white overflow-hidden flex flex-col ${className}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {children}
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={closeOnBackdropClick ? onClose : undefined}/>
            <div className={`relative bg-white shadow-2xl flex flex-col ${className}`}>
                {children}
            </div>
        </div>
    )
}
