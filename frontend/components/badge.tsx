export const Badge = ({text, isPublic}: { text: string, isPublic?: boolean }) => {
    const colorClass = (isPublic) ? "bg-blue-50 text-gray-600" : ""

    return (
        <>
            <span className={`inline-flex items-center rounded-md  px-2 text-xs font-medium inset-ring inset-ring-gray-500/10
                              ${colorClass}`}>
                <div className="p-0.5 my-auto bg-black rounded-full"></div>
                <div className="ml-1 my-auto ">{text}</div>
            </span>
        </>
    )
}