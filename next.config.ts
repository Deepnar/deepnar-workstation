import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static-friendly: no server required. (Vercel deploys as-is;
  // no `output: "export"` lock-in so an optional future /api route works.)
  reactStrictMode: true,
};

export default nextConfig;
