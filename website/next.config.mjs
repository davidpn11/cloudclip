import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const config = {
  output: "export",
  trailingSlash: true,
  reactStrictMode: true,
  images: { unoptimized: true },
  // The shared stylesheet lives in ../skills/cloudclip-review/app, outside this folder.
  turbopack: { root: fileURLToPath(new URL("..", import.meta.url)) },
};

export default config;
