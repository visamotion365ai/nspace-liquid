import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "N Space — Liquid Glass Music",
    short_name: "N Space",
    description:
      "A live music workspace with real catalogue search, hi-res streaming, spatial EQ and offline vault. Built as an installable app for iPhone, iPad and Windows.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#ECEEF3",
    theme_color: "#ECEEF3",
    lang: "en",
    dir: "ltr",
    categories: ["music", "entertainment", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-1024.png", sizes: "1024x1024", type: "image/png", purpose: "any" },
    ],
    shortcuts: [
      { name: "Search music", short_name: "Search", url: "/?tab=search" },
      { name: "Ask the AI DJ", short_name: "AI DJ", url: "/?tab=agent" },
      { name: "Library", short_name: "Library", url: "/?tab=library" },
    ],
  };
}
