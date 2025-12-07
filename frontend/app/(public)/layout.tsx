"use client";

export default function MainLayout({children}: {
    children: React.ReactNode;
}) {

    return (
        <div className="flex flex-col h-screen font-sans bg-gray-50">
            <main className="flex-1 overflow-auto">{children}</main>
        </div>
    );
}
