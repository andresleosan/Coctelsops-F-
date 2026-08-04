import type {NextConfig} from 'next';
import { CATALOG_IMAGE_HOSTS } from './src/lib/catalog/image-hosts';

const nextConfig: NextConfig = {
  /* config options here */
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
  images: {
    remotePatterns: [
      ...CATALOG_IMAGE_HOSTS.map((hostname) => ({
        protocol: 'https' as const,
        hostname,
        port: '',
        pathname: '/**',
      })),
    ],
  },
};

export default nextConfig;
