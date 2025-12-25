/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { 
    serverActions: { 
      allowedOrigins: [process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"],
      // Vercel has a hard 4.5MB payload limit for serverless functions
      // We use smaller chunks (2MB) to stay well under this limit
      bodySizeLimit: '3mb',
    } 
  },
};
module.exports = nextConfig;