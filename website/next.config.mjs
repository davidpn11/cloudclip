import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const config = {
  output: "export",
  trailingSlash: true,
  reactStrictMode: true,
  images: { unoptimized: true },
  // GitHub Pages serves this repo under /cloudclip. The Pages workflow passes that prefix in, and it is empty on a custom domain.
  basePath: process.env.PAGES_BASE_PATH ?? "",
  // The shared stylesheet lives in ../skills/review/app, outside this folder.
  turbopack: { root: fileURLToPath(new URL("..", import.meta.url)) },
};

export default config;
