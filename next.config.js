/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { 
    serverActions: { 
      allowedOrigins: [process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"],
      // Chunked uploads handle large files by sending them in pieces
      bodySizeLimit: '10mb', // Each chunk up to 10MB
    } 
  },
};
module.exports = nextConfig;