import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  serverExternalPackages: ["@libsql/client", "libsql"],
  outputFileTracingIncludes: {
    "/*": ["./drizzle/**/*", "./lib/db/fixtures/**/*"],
  },
};

export default nextConfig;
