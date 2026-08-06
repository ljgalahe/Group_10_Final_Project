import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow 127.0.0.1 in dev — Next blocks /_next chunks as cross-origin vs localhost,
  // which prevents React hydration (tabs/dropdowns/click-intos appear dead).
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
