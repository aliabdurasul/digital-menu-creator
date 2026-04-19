/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // /r/[slug] is the canonical public menu URL — serves from /menu/[slug] internally
      { source: "/r/:slug", destination: "/menu/:slug" },
      { source: "/r/:slug/table/:tableId", destination: "/menu/:slug/table/:tableId" },
    ];
  },
  async redirects() {
    return [
      // Redirect old /menu/[slug] URLs to canonical /r/[slug]
      { source: "/menu/:slug", destination: "/r/:slug", permanent: true },
      { source: "/menu/:slug/table/:tableId", destination: "/r/:slug/table/:tableId", permanent: true },
    ];
  },
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
