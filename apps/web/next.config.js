/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@veyrapro/domain", "@veyrapro/database", "@veyrapro/accumulator-engine"],
  typedRoutes: true,
};

module.exports = nextConfig;
