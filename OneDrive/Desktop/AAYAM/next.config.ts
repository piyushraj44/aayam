import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allows parallel dev servers during development (e.g. NEXT_DIST_DIR=.next-orb).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
