import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,          // Ignore ESLint errors to allow production build to continue
  },
  typescript: {
    ignoreBuildErrors: true,           // (Optional) Ignore TypeScript type errors
  }
};

export default nextConfig;
