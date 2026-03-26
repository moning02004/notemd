export const Badge = ({texts, isPublic}: { texts: string, isPublic?: boolean }) => {
    const colorVariants = [
        {bg: "bg-blue-100", text: "text-gray-600"},
        {bg: "bg-green-200", text: "text-gray-600"},
        {bg: "bg-yellow-500", text: "text-gray-600"},
        {bg: "bg-red-600", text: "text-gray-600"},
        {bg: "bg-purple-700", text: "text-gray-600"},
        {bg: "bg-pink-800", text: "text-gray-600"},
    ]

    const badge = (text: string, index: number) => {
        if (!text) return;

        const {bg, text: textColor} = colorVariants[index]

        return (
            <span className={`inline-flex items-center rounded-md px-2 text-xs font-medium 
                inset-ring inset-ring-gray-500/10 ${bg} ${textColor}`}>
                <div className="p-0.5 my-auto bg-black rounded-full"></div>
                <div className="ml-1 my-auto">{text}</div>
            </span>
        )
    }
    return (
        <>
            {texts.split(":").map((x, index) => badge(x, index))}
        </>
    )
}