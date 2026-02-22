import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pdfjs-dist", "pdf-parse", "canvas", "pdf-to-img"],
};

export default nextConfig;
