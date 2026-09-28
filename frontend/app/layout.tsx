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
