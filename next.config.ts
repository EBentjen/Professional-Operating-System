import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server-side SQLite via better-sqlite3
  serverExternalPackages: ['better-sqlite3'],
  // Empty turbopack config to silence the webpack/turbopack mismatch warning
  turbopack: {},
};

export default nextConfig;
