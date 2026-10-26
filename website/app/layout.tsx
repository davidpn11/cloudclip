import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@review/style.css";
import "./global.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://cloudclip.davidpn.com"),
  title: "CloudClip",
  description:
    "Pause a video, mark an area, and type what should change. Your AI agent turns the comments into ffmpeg edits.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    // theme.js sets data-theme on <html> before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Copied from ../skills/cloudclip-review/app by `bun run sync`, the same file the review page uses. */}
        <script src="/app/theme.js" />
      </head>
      <body>{children}</body>
    </html>
  );
}
