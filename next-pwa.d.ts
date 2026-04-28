declare module "next-pwa" {
  import type { NextConfig } from "next";

  type WithPWAInit = (options: Record<string, unknown>) => (config: NextConfig) => NextConfig;

  const withPWAInit: WithPWAInit;
  export default withPWAInit;
}

