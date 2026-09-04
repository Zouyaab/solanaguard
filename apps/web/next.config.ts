import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@solanaguard/sdk", "@solanaguard/types"],
};

export default nextConfig;
