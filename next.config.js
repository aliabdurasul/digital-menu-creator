/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "rtglgemdcxajfbmyejuf.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    deviceSizes: [320, 420, 480, 640, 1024],
    imageSizes: [80, 96, 300, 480, 600],
  },
};

module.exports = nextConfig;
