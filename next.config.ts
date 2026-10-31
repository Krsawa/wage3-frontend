import type { NextConfig } from "next";

// The backend has no CORS layer, so the browser talks to it through this origin.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  // Base Account's Node entry pulls the CDP SDK and its optional x402 deps; keep them out of the SSR bundle.
  serverExternalPackages: ["@base-org/account", "@coinbase/cdp-sdk"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
};

export default nextConfig;
