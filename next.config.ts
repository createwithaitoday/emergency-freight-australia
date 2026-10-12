import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Booking, admin and account pages read the database on each request.
  cacheComponents: false,
  serverExternalPackages: ["@electric-sql/pglite"],
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
