const fs = require('fs');
const path = require('path');

/**
 * Checks whether an optional native Expo plugin package is installed inside
 * the local project's node_modules (without traversing parent directories).
 */
function hasLocalPlugin(packageName) {
  const pkgPath = path.join(__dirname, 'node_modules', ...packageName.split('/'), 'package.json');
  return fs.existsSync(pkgPath);
}

/**
 * Dynamic Expo configuration layered over app.json.
 * Registers native Health Connect / HealthKit / build-properties plugins
 * when installed for EAS native builds while keeping Expo Go & Web launches clean.
 */
module.exports = ({ config }) => {
  const plugins = Array.isArray(config.plugins) ? [...config.plugins] : [];

  if (hasLocalPlugin('react-native-health-connect') && !plugins.includes('react-native-health-connect')) {
    plugins.push('react-native-health-connect');
  }

  if (hasLocalPlugin('react-native-health') && !plugins.includes('react-native-health')) {
    plugins.push('react-native-health');
  }

  if (hasLocalPlugin('expo-build-properties')) {
    plugins.push([
      'expo-build-properties',
      {
        android: {
          minSdkVersion: 26,
        },
      },
    ]);
  }

  if (hasLocalPlugin('expo-sensors')) {
    plugins.push([
      'expo-sensors',
      {
        motionPermission: 'Allow PulseCorp to read live step motion telemetry from your device.',
      },
    ]);
  }

  return {
    ...config,
    plugins,
  };
};

