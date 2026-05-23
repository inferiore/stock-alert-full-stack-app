const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// expo-modules-core ships with exports:{} (empty), so Metro's package-exports
// resolver finds no matching condition and fails. We bypass it by resolving
// directly to the TypeScript source that babel-preset-expo can transform.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'expo-modules-core') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/expo-modules-core/src/index.ts'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
