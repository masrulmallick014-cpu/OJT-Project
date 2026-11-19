const { getDefaultConfig } = require('expo/metro-config');
const fs = require('fs');
const path = require('path');

const config = getDefaultConfig(__dirname);

const OPTIONAL_NATIVE_MODULES = new Set([
  'react-native-health-connect',
  'react-native-health',
]);

config.resolver = config.resolver || {};
const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (OPTIONAL_NATIVE_MODULES.has(moduleName)) {
    const pkgJson = path.join(__dirname, 'node_modules', moduleName, 'package.json');
    if (!fs.existsSync(pkgJson)) {
      return { type: 'empty' };
    }
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

