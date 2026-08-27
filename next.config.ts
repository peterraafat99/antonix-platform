import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    cpus: 4,
  },
  // Exclude large unused files from the server bundle to stay under 3 MiB free limit
  outputFileTracingExcludes: {
    "*": [
      // @vercel/og WASM files - we don't use OG image generation
      "**/node_modules/next/dist/compiled/@vercel/og/**",
      // Sharp / image processing - not needed in Cloudflare Workers
      "**/node_modules/sharp/**",
      "**/node_modules/@img/**",
    ],
  },
};

export default nextConfig;
