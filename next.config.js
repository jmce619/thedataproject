/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    config.experiments = { ...(config.experiments || {}), topLevelAwait: true };
    // Alias the Node vega-canvas build to the browser build
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'vega-canvas/build/vega-canvas.node.js': 'vega-canvas/build/vega-canvas.js',
    };
    if (isServer) {
      config.externals = [...(config.externals || []), 'canvas'];
    }
    return config;
  },
};
module.exports = nextConfig;
