import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "note.md",
        short_name: "note.md",
        description: "easy note taking application",
        start_url: "/",
        display: "standalone",
        background_color: "#1f6650",
        theme_color: "#1f6650",
        icons: [
            {
                src: "/icons/icon-192.png",
                sizes: "192x192",
                type: "image/png",
            },
            {
                src: "/icons/icon-512.png",
                sizes: "512x512",
                type: "image/png",
            },
        ],
    };
}