import type { NextConfig } from "next";

/** The client is a static export loaded by the Tauri window: there is no Node
 *  server in the product, and nothing may depend on one. */
const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: true,
  images: { unoptimized: true },
  // Tauri serves the export from disk, so every asset is referenced relatively.
  trailingSlash: true,
};

export default nextConfig;
