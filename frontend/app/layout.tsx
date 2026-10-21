import type {Metadata, Viewport} from "next";
import "./globals.css";
import {Toaster} from "react-hot-toast";
import {TopProgress} from "@/components/ui/top_progress";
import {ImageViewer} from "@/components/image_viewer";

export const metadata: Metadata = {
    title: "note.md",
    description: "easy note taking application",
    manifest: "/manifest.webmanifest",
    icons: {
        icon: [{url: "/icons/icon-192.png", sizes: "192x192", type: "image/png"}],
        apple: [{url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png"}],
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "note.md",
    },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    themeColor: "#1f6650",
    /*
     * 키보드가 올라오면 페이지 높이를 키보드 위까지로 줄인다(안드로이드 Chrome).
     * 기본(resizes-visual)은 보이는 영역만 줄고 페이지 높이는 그대로라, 노트 아래쪽을 누르면 Chrome 이 커서를
     * 보이려고 페이지째 위로 밀어 위에 붙은 제목 줄·툴바가 화면 밖으로 나갔다. 줄이면 노트 화면(h-dvh)이
     * 키보드 위에 맞춰지고 본문만 그 안에서 스크롤된다. iOS Safari 는 이 값을 읽지 않는다.
     */
    interactiveWidget: "resizes-content",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
        <body
            className="antialiased"
        >
        <TopProgress/>
        {children}
        <ImageViewer/>
        <Toaster position="bottom-center" containerStyle={{
            bottom: 80
        }}/>
        </body>
        </html>
    );
}
