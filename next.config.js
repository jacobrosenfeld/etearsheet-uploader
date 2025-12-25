/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { 
    serverActions: { 
      allowedOrigins: [process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"],
      // Note: bodySizeLimit is not needed anymore as files are uploaded
      // directly to Google Drive, bypassing Vercel's serverless functions
      bodySizeLimit: '5mb', // Only for metadata/config operations
    } 
  },
};
module.exports = nextConfig;