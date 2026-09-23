import {IoIosCheckmarkCircleOutline} from "react-icons/io";
import {IoWarningOutline} from "react-icons/io5";

export function LoadingSpinner() {
    return (
        <div className="ml-auto w-5 h-5 border-2 border-border-strong border-t-gray-500 rounded-full animate-spin"></div>
    );
}

export function Warning() {
    return (
        <IoWarningOutline size={22} className="text-danger"/>
    );
}

export function Complete() {
    return (
        <IoIosCheckmarkCircleOutline size={22} className="text-accent"/>
    );
}

/**
 * 버튼 안에 들어가는 작은 스피너. 글자 색을 그대로 따라간다.
 * (LoadingSpinner 는 에디터 저장 상태 자리에 맞춰진 것이라 따로 둔다.)
 */
export function Spinner({size = 16, className = ""}: { size?: number, className?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden
             className={`animate-spin shrink-0 ${className}`}>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25"/>
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        </svg>
    )
}
