/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Tree-shakes these packages so each page only bundles the specific exports
    // it uses (e.g. the motion primitives it renders) instead of the whole
    // library. framer-motion is imported in ~36 files — this is a meaningful
    // first-load JS reduction across the app. Supported in Next 14.2.
    optimizePackageImports: ['framer-motion'],
  },
};
export default nextConfig;
