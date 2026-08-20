import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "resources.finalsite.net",
      },
    ],
  },
};

export default nextConfig;
