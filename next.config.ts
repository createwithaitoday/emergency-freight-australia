import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Booking, admin and account pages read the database on each request.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
