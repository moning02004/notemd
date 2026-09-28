"use client"

import {useEffect, useRef, useState} from "react"
import {createPortal} from "react-dom"
import {ChevronLeft, ChevronRight, ExternalLink, Maximize, Minimize, X} from "lucide-react"

import {useImageViewerStore} from "@/store/imageViewer"

const SWIPE_PX = 50

/**
 * 본문 이미지를 크게 보는 창.
 *
 * 캡처로 가이드를 쓰면 본문에서는 작게 줄어든 캡처의 글씨를 읽기 어렵다.
 * 화면에 맞춰 크게 보여주고, 그래도 작으면 이미지를 눌러 원본 크기로 스크롤하며 읽는다.
 * 캡처가 여러 장이면 ←/→(모바일은 좌우로 밀기)로 차례로 넘긴다.
 * 본문 위에 띄우기만 하므로 본문 배치는 건드리지 않는다.
 */
export function ImageViewer() {
    const {images, index, isOpen, step, close} = useImageViewerStore()
    const [actualSize, setActualSize] = useState(false)
    const [canZoom, setCanZoom] = useState(false)
    const imgRef = useRef<HTMLImageElement>(null)
    const touchStart = useRef<{ x: number, y: number } | null>(null)

    const src = images[index]
    const hasMany = images.length > 1

    // 다른 이미지로 넘어가면 화면 맞춤부터 다시 본다(렌더 중에 앞 이미지와 견줘 맞춘다).
    const [shownSrc, setShownSrc] = useState(src)
    if (shownSrc !== src) {
        setShownSrc(src)
        setActualSize(false)
        setCanZoom(false)
    }

    useEffect(() => {
        if (!isOpen) return

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") close()
            else if (event.key === "ArrowLeft" && hasMany) step(-1)
            else if (event.key === "ArrowRight" && hasMany) step(1)
            else return
            event.preventDefault()
            event.stopPropagation()
        }
        // 에디터(Esc 로 선택 해제 등)나 참조 패널보다 먼저 받는다.
        window.addEventListener("keydown", onKeyDown, true)

        // 뒤의 본문이 같이 스크롤되지 않게 막는다.
        const overflow = document.body.style.overflow
        document.body.style.overflow = "hidden"

        return () => {
            window.removeEventListener("keydown", onKeyDown, true)
            document.body.style.overflow = overflow
        }
    }, [isOpen, hasMany, step, close])

    if (!isOpen || !src || typeof document === "undefined") return null

    // 화면에 맞췄을 때 원본보다 작게 보이는 경우에만 원본 크기로 볼 의미가 있다.
    const measure = () => {
        const img = imgRef.current
        if (!img || actualSize) return
        setCanZoom(img.naturalWidth > img.clientWidth + 1 || img.naturalHeight > img.clientHeight + 1)
    }

    const iconButton = "p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer transition-colors duration-150"

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label="이미지 크게 보기"
            className="image-viewer fixed inset-0 z-[10000] flex flex-col bg-black/90 backdrop-blur-sm"
            onTouchStart={event => {
                const touch = event.touches[0]
                touchStart.current = event.touches.length === 1 ? {x: touch.clientX, y: touch.clientY} : null
            }}
            onTouchEnd={event => {
                const start = touchStart.current
                touchStart.current = null
                // 원본 크기로 볼 때는 손가락이 스크롤에 쓰이므로 넘기지 않는다.
                if (!start || actualSize || !hasMany) return
                const touch = event.changedTouches[0]
                const dx = touch.clientX - start.x
                if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(touch.clientY - start.y)) {
                    step(dx < 0 ? 1 : -1)
                }
            }}
        >
            <div className="flex h-14 shrink-0 items-center gap-1 px-3 text-white">
                <span className="flex-1 px-1 text-[13px] text-white/70 tabular-nums">
                    {hasMany ? `${index + 1} / ${images.length}` : ""}
                </span>
                {canZoom && (
                    <button className={iconButton} title={actualSize ? "화면에 맞추기" : "원본 크기로 보기"}
                            onClick={() => setActualSize(value => !value)}>
                        {actualSize ? <Minimize size={18}/> : <Maximize size={18}/>}
                    </button>
                )}
                <a className={iconButton} href={src} target="_blank" rel="noopener noreferrer" title="새 탭에서 열기">
                    <ExternalLink size={18}/>
                </a>
                <button className={iconButton} title="닫기 (Esc)" onClick={close}>
                    <X size={20}/>
                </button>
            </div>

            <div
                className={`relative min-h-0 flex-1 ${actualSize
                    ? "overflow-auto"
                    : "flex items-center justify-center overflow-hidden px-4 pb-4 md:px-16"}`}
                // 이미지 밖(어두운 곳)을 누르면 닫는다.
                onClick={event => {
                    if (event.target === event.currentTarget) close()
                }}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    ref={imgRef}
                    key={src}
                    src={src}
                    alt=""
                    onLoad={measure}
                    onClick={() => canZoom && setActualSize(value => !value)}
                    className={actualSize
                        ? "m-auto block max-w-none cursor-zoom-out"
                        : `max-h-full max-w-full object-contain ${canZoom ? "cursor-zoom-in" : ""}`}
                />

                {hasMany && !actualSize && (
                    <>
                        <button className={`${iconButton} absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hidden md:block`}
                                title="이전 (←)" onClick={() => step(-1)}>
                            <ChevronLeft size={24}/>
                        </button>
                        <button className={`${iconButton} absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hidden md:block`}
                                title="다음 (→)" onClick={() => step(1)}>
                            <ChevronRight size={24}/>
                        </button>
                    </>
                )}
            </div>
        </div>,
        document.body,
    )
}
