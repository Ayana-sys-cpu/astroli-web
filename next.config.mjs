/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Tree-shakes these packages so each page only bundles the specific exports
    // it uses (e.g. the motion primitives it renders) instead of the whole
    // library. framer-motion is imported in ~36 files — this is a meaningful
    // first-load JS reduction across the app. Supported in Next 14.2.
    optimizePackageImports: ['framer-motion'],
  },
  async redirects() {
    return [
      // The old static, school-only, unversioned privacy policy is superseded by
      // the versioned /legal/privacy page. Keep the old URL working for anything
      // (e.g. an App Store listing) that still links it. Not permanent while the
      // policy is a draft.
      { source: '/privacy-policy.html', destination: '/legal/privacy', permanent: false },
    ];
  },
};
export default nextConfig;
