/** @type {import('next').NextConfig} */
const apiBase = process.env.NEXT_PUBLIC_ERP_API_URL?.replace(/\/$/, '')

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    const rewrites = [{ source: '/favicon.ico', destination: '/icon.png' }]
    if (apiBase) {
      rewrites.push({
        source: '/erp-api/:path*',
        destination: `${apiBase}/:path*`,
      })
    }
    return rewrites
  },
}

export default nextConfig
