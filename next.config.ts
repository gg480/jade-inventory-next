import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',
  typescript: {
    // Only ignore build errors in development
    ignoreBuildErrors: isDev,
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
