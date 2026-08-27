import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    cpus: 4,
    // Exclude large unnecessary files from the server bundle
    outputFileTracingExcludes: {
      "*": [
        // @vercel/og WASM files - we don't use OG image generation
        "**/node_modules/next/dist/compiled/@vercel/og/**",
        // Sharp - not needed in Cloudflare Workers
        "**/node_modules/sharp/**",
        "**/node_modules/@img/**",
      ],
    },
  },
};

export default nextConfig;
