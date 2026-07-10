import {useEffect, useRef, RefObject} from "react"

export function useClickOutside<T extends HTMLElement = HTMLElement>(
    onOutsideClick: () => void,
    active: boolean = true,
): RefObject<T | null> {
    const ref = useRef<T>(null)

    useEffect(() => {
        if (!active) return

        function handler(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onOutsideClick()
            }
        }

        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [active, onOutsideClick])

    return ref
}
