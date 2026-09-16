/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['tesseract.js', 'sharp'],
    // Incluye los tessdata en el bundle de la función /api/convert en Vercel
    outputFileTracingIncludes: {
      '/api/convert': ['./public/tessdata/**/*'],
    },
  },
}

export default nextConfig
