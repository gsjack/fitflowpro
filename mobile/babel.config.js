module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Custom plugin to remove import.meta for web compatibility
      require.resolve('./babel-plugin-remove-import-meta.js'),
    ],
  };
};
