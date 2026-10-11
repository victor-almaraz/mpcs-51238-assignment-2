import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

/**
 * Static export: every route is prerendered to out/ (repo-structure.md).
 * Test pages are named page.dev.jsx, so they are routes under `next dev` only
 * and are left out of the deployment build.
 */
export default function nextConfig(phase) {
  const dev = phase === PHASE_DEVELOPMENT_SERVER;
  return {
    output: 'export',
    trailingSlash: true,
    images: { unoptimized: true },
    pageExtensions: dev ? ['dev.jsx', 'jsx', 'js'] : ['jsx', 'js'],
  };
}
