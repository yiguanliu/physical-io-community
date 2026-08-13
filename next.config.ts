import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  serverExternalPackages: ["@libsql/client", "libsql"],
};

export default nextConfig;
