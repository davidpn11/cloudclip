import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@review/style.css";
import "./global.css";

export const metadata: Metadata = {
  title: "CloudClip",
  description:
    "Pause a video, mark an area, and type what should change. Your AI agent turns the comments into ffmpeg edits.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
