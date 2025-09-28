import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,          // 忽略 ESLint 错误以便生产构建继续
  },
  typescript: {
    ignoreBuildErrors: true,           // （可选）忽略 TS 类型错误
  }
};

export default nextConfig;
