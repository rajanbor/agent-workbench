import type { Metadata, Viewport } from "next";
import "../src/styles/tokens.css";
import "../src/styles/app.css";

export const metadata: Metadata = {
  title: "Open Cube",
  description: "One cross-platform agent workbench: Rust core, web client, native window.",
  icons: { icon: "/open-cube.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Applied before paint so a pinned theme never flashes; kept in a file
            rather than inline, and excluded from hydration. */}
        <script src="/pre-paint.js" suppressHydrationWarning />
      </head>
      <body>{children}</body>
    </html>
  );
}
