import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { PwaBridge } from "@/components/PwaBridge";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "N Space",
  title: {
    default: "N Space — Liquid Glass Music",
    template: "%s · N Space",
  },
  description:
    "Live music workspace: real catalogue search, hi-res streaming, 10-band spatial EQ and an offline vault. Installable on iPhone, iPad and Windows.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "N Space",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false, email: false, address: false },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ECEEF3" },
    { media: "(prefers-color-scheme: dark)", color: "#08080A" },
  ],
};

const themeBootstrap = `
try {
  var raw = localStorage.getItem('nspace.liquid.v1');
  var mode = 'system';
  if (raw) { try { mode = (JSON.parse(raw).settings || {}).theme || 'system'; } catch (e) {} }
  var dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
} catch (e) {}
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="min-h-dvh antialiased">
        <PwaBridge />
        {children}
      </body>
    </html>
  );
}
