import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  // Keep the Postgres driver out of the bundle so its optional native/dynamic
  // dependencies are resolved at runtime instead of being traced by Turbopack.
  serverExternalPackages: ["pg"],
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
