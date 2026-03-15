import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  transpilePackages: ['@shiftsync/shared-types'],
  // Required for monorepo: traces files outside apps/web (e.g. shared packages)
  outputFileTracingRoot: path.join(__dirname, '../../'),
};

export default nextConfig;
