import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // P0: Enforce TypeScript and ESLint checks during build.
  // All errors must be fixed before deployment.
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
};

export default nextConfig;
