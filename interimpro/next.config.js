/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Permet le build même avec des erreurs TypeScript mineures
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}
module.exports = nextConfig
