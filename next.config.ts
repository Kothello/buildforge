import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: { strict: true },
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    optimizePackageImports: ["@radix-ui/react-*"],
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
}

export default nextConfig
