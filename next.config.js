/** @type {import('next').NextConfig} */
const nextConfig = {
  // The game uses relative asset URLs, so /crash must be served as /crash/
  skipTrailingSlashRedirect: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.ctfassets.net',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // PTSD Crash runs as its own Node service (game/ptsd-crash) and is mounted here.
  async rewrites() {
    const origin = process.env.CRASH_ORIGIN
    if (!origin) return []
    const target = origin.replace(/\/+$/, '')
    return [
      { source: '/crash', destination: `${target}/crash/` },
      { source: '/crash/:path*', destination: `${target}/crash/:path*` },
    ]
  },
}

export default nextConfig
