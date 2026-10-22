import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Trace files from the monorepo root so @immofilter/db ends up in the standalone bundle
  outputFileTracingRoot: fileURLToPath(new URL("..", import.meta.url)),
  serverExternalPackages: ["postgres"],
};

export default nextConfig;
