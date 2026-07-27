interface ToggleSwitchProps {
    checked: boolean
    onClick: () => void
    activeColor?: string
}

export function ToggleSwitch({checked, onClick, activeColor = "bg-accent"}: ToggleSwitchProps) {
    return (
        <div className="cursor-pointer select-none shrink-0" onClick={onClick}>
            <div className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors duration-300
                    ${checked ? activeColor : "bg-border"}`}>
                <div className={`w-5 h-5 bg-surface rounded-full shadow-sm transform transition-transform duration-300
                        ${checked ? "translate-x-5" : "translate-x-0"}`}/>
            </div>
        </div>
    )
}
