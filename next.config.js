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
    deviceSizes: [320, 420, 480],
    imageSizes: [80, 96, 480],
  },
};

module.exports = nextConfig;
