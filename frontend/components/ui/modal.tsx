"use client"

import {useEffect, useState} from "react"
import {createPortal} from "react-dom"

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    /** centered: 데스크톱/모바일 공통 중앙 백드롭 모달. sheet: 모바일 풀스크린 / 데스크톱 카드형 모달. */
    variant?: "centered" | "sheet"
    /** 기본값: centered는 true(백드롭 클릭 시 닫힘), sheet는 false */
    closeOnBackdropClick?: boolean
    /**
     * 모바일에서 오른쪽에서 밀려 들어오게 한다. 전체 화면을 덮는 화면(검색, 폴더 이동)은
     * 갑자기 나타나면 어디서 왔는지 알 수 없어, 뒤로 가면 돌아간다는 것을 움직임으로 알린다.
     */
    slide?: boolean
    /** 모달 카드(내부 wrapper)에 적용할 크기/라운딩 등 클래스 — 사이즈는 항상 호출부가 결정 */
    className?: string
    children: React.ReactNode
}

const DURATION_MS = 220

/** 열릴 때는 한 프레임 뒤에 최종 위치로, 닫힐 때는 애니메이션이 끝난 뒤에 언마운트한다. */
function useEnterExit(isOpen: boolean, enabled: boolean) {
    const [mounted, setMounted] = useState(isOpen)
    const [shown, setShown] = useState(isOpen && !enabled)

    useEffect(() => {
        if (isOpen) {
            setMounted(true)
            if (!enabled) {
                setShown(true)
                return
            }
            // 초기 위치로 한 번 그려진 뒤에 전환이 시작되어야 한다.
            const frame = requestAnimationFrame(() => setShown(true))
            return () => cancelAnimationFrame(frame)
        }

        setShown(false)
        if (!enabled) {
            setMounted(false)
            return
        }
        const timer = setTimeout(() => setMounted(false), DURATION_MS)
        return () => clearTimeout(timer)
    }, [isOpen, enabled])

    return {mounted, shown}
}

export function Modal({
                          isOpen,
                          onClose,
                          variant = "centered",
                          closeOnBackdropClick = variant === "centered",
                          slide = false,
                          className = "",
                          children,
                      }: ModalProps) {
    const {mounted, shown} = useEnterExit(isOpen, slide)

    // body 로 빼지 않으면 backdrop-filter/transform 이 걸린 조상 안에서 fixed 가
    // 뷰포트가 아니라 그 조상을 기준으로 잡혀 모달이 헤더 크기로 찌그러진다.
    if (!mounted || typeof document === "undefined") return null

    // motion-reduce 로 움직임을 끈 환경에서는 전환 없이 곧바로 제자리에 놓인다.
    const slideClass = slide
        ? `transition-transform duration-200 ease-out motion-reduce:transition-none
           ${shown ? "translate-x-0" : "max-md:translate-x-full"}`
        : ""
    const fadeClass = slide
        ? `transition-opacity duration-200 motion-reduce:transition-none ${shown ? "opacity-100" : "opacity-0"}`
        : ""

    if (variant === "sheet") {
        return createPortal(
            <div
                className={`fixed inset-0 z-50 bg-foreground/30 backdrop-blur-[2px] flex items-stretch
                            sm:items-center justify-center sm:p-4 ${fadeClass}`}
                onClick={closeOnBackdropClick ? onClose : undefined}
            >
                <div
                    className={`bg-surface overflow-hidden flex flex-col ${slideClass} ${className}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {children}
                </div>
            </div>,
            document.body,
        )
    }

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className={`absolute inset-0 bg-black/30 ${fadeClass}`}
                onClick={closeOnBackdropClick ? onClose : undefined}
            />
            <div className={`relative bg-surface shadow-2xl flex flex-col ${slideClass} ${className}`}>
                {children}
            </div>
        </div>,
        document.body,
    )
}
