import type { NextConfig } from "next";
import path from "path";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  /** Schlanke Docker-/Selfhost-Images (server.js + getrackte deps). */
  output: process.env.DOCKER_BUILD === "1" ? "standalone" : undefined,
  serverExternalPackages: ["better-sqlite3", "@prisma/client", "@prisma/adapter-better-sqlite3"],
  // next-pwa customizes webpack; we keep Turbopack explicitly configured.
  turbopack: {},
  // Avoid Next picking an unrelated workspace root (lockfile outside project).
  outputFileTracingRoot: path.join(__dirname),
};

export default withPWA(nextConfig);
