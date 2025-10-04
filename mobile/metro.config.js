const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Override react-native-screens with web shim for web platform
config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    if (platform === 'web' && moduleName === 'react-native-screens') {
      return {
        filePath: path.resolve(__dirname, 'react-native-screens.web.js'),
        type: 'sourceFile',
      };
    }
    // Use default resolution for other modules
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
