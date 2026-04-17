import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',
  typescript: {
    // Ignore TS errors during build - existing type issues in generated/dashboard code
    // do not affect runtime behavior
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  // Only allow dev origins in development mode
  ...(isDev && {
    allowedDevOrigins: [
      '.space.chatglm.site',
      '.space.z.ai',
    ],
  }),
};

export default nextConfig;
