import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Allow the public dev host to load Next.js dev/HMR resources.
  allowedDevOrigins: ["local-os.underlabs.it"],
};

export default nextConfig;
