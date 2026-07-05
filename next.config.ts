import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export — the site deploys as plain files, same as v0.1
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
