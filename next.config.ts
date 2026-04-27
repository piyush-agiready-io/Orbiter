import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ['mongoose'],
  experimental: {
    optimizePackageImports: [
      '@phosphor-icons/react',
      'lucide-react',
      'date-fns',
      '@dnd-kit/core',
      '@dnd-kit/sortable',
    ],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.r2.cloudflarestorage.com' },
    ],
  },
};

export default nextConfig;
