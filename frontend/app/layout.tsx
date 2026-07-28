import type {Metadata, Viewport} from "next";
import {Geist, Geist_Mono} from "next/font/google";
import "./globals.css";
import {Toaster} from "react-hot-toast";
import {Providers} from "@/app/(main)/providers";
import {RegisterServiceWorker} from "@/app/register-service-worker";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

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
            className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
        {children}
        <Toaster position="bottom-center" containerStyle={{
            bottom: 80
        }}/>
        <RegisterServiceWorker/>
        </body>
        </html>
    );
}
