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
  // next-pwa customizes webpack; we keep Turbopack explicitly configured.
  turbopack: {},
  // Avoid Next picking an unrelated workspace root (lockfile outside project).
  outputFileTracingRoot: path.join(__dirname),
};

export default withPWA(nextConfig);
