import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FutBolão",
    short_name: "FutBolão",
    description: "Crie ligas e dê seus palpites",
    start_url: "/",
    scope: "/",
    display: "standalone", // requisito importante no iOS
    background_color: "var(--background)",
    theme_color: "var(--surface)",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}