import {useEffect, useRef, useState} from "react";
import {useRouter} from "next/navigation";

export default function NotePasswordModal({open, onClose, onSubmit}) {
    const [password, setPassword] = useState("");
    const inputRef = useRef(null);
    const router = useRouter()

    useEffect(() => {
        if (!open) return;
        setPassword("");
        inputRef.current?.focus();

        const handleEsc = (e) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [open, onClose]);

    if (!open) return null;

    const handleSubmit = () => {
        if (!password.trim()) return;
        onSubmit(password);
    };

    return (
        <div
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="note-password-title"
                className="w-full max-w-sm rounded-xl bg-white px-3 py-4 shadow-xl"
            >
                <div
                    id="note-password-title"
                    className="text-lg font-semibold text-gray-900"
                >
                    노트 비밀번호
                </div>

                <input
                    ref={inputRef}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    placeholder="비밀번호를 입력하세요"
                    className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                />

                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!password.trim()}
                    className="mt-5 w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover cursor-pointer disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                    확인
                </button>
            </div>
        </div>
    );
}