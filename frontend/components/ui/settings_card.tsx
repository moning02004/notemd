interface SettingsCardProps {
    title: string
    icon?: React.ReactNode
    children: React.ReactNode
    className?: string
}

export function SettingsCard({title, icon, children, className = ""}: SettingsCardProps) {
    return (
        <div className={`bg-surface rounded-xl border border-border p-4 ${className}`}>
            <p className="text-[11px] font-medium text-subtle tracking-widest uppercase mb-3 flex items-center gap-1.5">
                {icon}
                {title}
            </p>
            {children}
        </div>
    )
}
