/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { 
    serverActions: { 
      allowedOrigins: [process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"],
      // Increase body size limit for large file uploads (500MB)
      bodySizeLimit: '500mb',
    } 
  },
};
module.exports = nextConfig;