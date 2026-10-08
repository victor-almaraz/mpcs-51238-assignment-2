/** Static export: every route is prerendered to out/ (repo-structure.md). */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
