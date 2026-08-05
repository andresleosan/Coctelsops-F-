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
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      // Genkit's OpenTelemetry SDK loads Jaeger only when explicitly configured.
      // This app uses the default exporter and does not ship Jaeger support.
      '@opentelemetry/exporter-jaeger': false,
    };
    return config;
  },
};

export default nextConfig;
