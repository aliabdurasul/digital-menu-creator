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
  // Environment variables documentation:
  // NEXT_PUBLIC_APP_URL        — Primary domain (e.g., https://lezzet.app)
  // ENABLE_DOMAIN_ROUTING      — Set to "false" to disable subdomain/custom domain routing (kill switch)
  // NEXT_PUBLIC_SUPABASE_URL   — Supabase project URL
  // NEXT_PUBLIC_SUPABASE_ANON_KEY — Supabase anon key
  // SUPABASE_SERVICE_ROLE_KEY  — Supabase service role key (server-only)
};

module.exports = nextConfig;
