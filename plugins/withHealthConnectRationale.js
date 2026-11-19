/**
 * Custom Expo Config Plugin for PulseCorp
 * Injects required Android Health Connect Permissions Rationale & Onboarding Intent Filters
 * inside MainActivity and creates the ViewPermissionUsageActivity alias required for Android 14+ Play Store compliance.
 */

let withAndroidManifest;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  withAndroidManifest = require('@expo/config-plugins').withAndroidManifest;
} catch (e) {
  // Graceful fallback for non-prebuild / standalone tooling environments
  withAndroidManifest = (config, fn) => config;
}

const withHealthConnectRationale = (config) => {
  return withAndroidManifest(config, async (manifestConfig) => {
    const androidManifest = manifestConfig.modResults;
    if (!androidManifest || !androidManifest.manifest) {
      return manifestConfig;
    }

    const manifest = androidManifest.manifest;
    const mainApplication = manifest.application?.[0];

    if (!mainApplication) {
      return manifestConfig;
    }

    // 1. Ensure uses-permission declarations exist
    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    const requiredPermissions = [
      'android.permission.health.READ_STEPS',
      'android.permission.health.READ_HEART_RATE',
      'android.permission.health.READ_SLEEP',
      'android.permission.health.READ_ACTIVE_CALORIES_BURNED',
      'android.permission.health.READ_OXYGEN_SATURATION',
      'android.permission.ACTIVITY_RECOGNITION',
    ];

    requiredPermissions.forEach((permName) => {
      const alreadyPresent = manifest['uses-permission'].some(
        (p) => p.$?.['android:name'] === permName
      );
      if (!alreadyPresent) {
        manifest['uses-permission'].push({
          $: { 'android:name': permName },
        });
      }
    });

    // 2. Find MainActivity to attach intent filters
    const mainActivity = mainApplication.activity?.find(
      (a) => a.$?.['android:name'] === '.MainActivity'
    );

    if (mainActivity) {
      if (!mainActivity['intent-filter']) {
        mainActivity['intent-filter'] = [];
      }

      // Add ACTION_SHOW_PERMISSIONS_RATIONALE intent-filter
      const hasRationaleFilter = mainActivity['intent-filter'].some((filter) =>
        filter.action?.some(
          (act) => act.$?.['android:name'] === 'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE'
        )
      );

      if (!hasRationaleFilter) {
        mainActivity['intent-filter'].push({
          action: [
            {
              $: {
                'android:name': 'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE',
              },
            },
          ],
          category: [
            {
              $: {
                'android:name': 'android.intent.category.DEFAULT',
              },
            },
          ],
        });
      }

      // Add START_ONBOARDING intent-filter
      const hasOnboardingFilter = mainActivity['intent-filter'].some((filter) =>
        filter.action?.some(
          (act) => act.$?.['android:name'] === 'android.permission.health.START_ONBOARDING'
        )
      );

      if (!hasOnboardingFilter) {
        mainActivity['intent-filter'].push({
          action: [
            {
              $: {
                'android:name': 'android.permission.health.START_ONBOARDING',
              },
            },
          ],
          category: [
            {
              $: {
                'android:name': 'android.intent.category.DEFAULT',
              },
            },
          ],
        });
      }
    }

    // 3. Android 14 Activity Alias for Health Connect Permission Usage
    if (!mainApplication['activity-alias']) {
      mainApplication['activity-alias'] = [];
    }

    const aliasName = 'ViewPermissionUsageActivity';
    const hasAlias = mainApplication['activity-alias'].some(
      (alias) => alias.$?.['android:name'] === aliasName
    );

    if (!hasAlias) {
      mainApplication['activity-alias'].push({
        $: {
          'android:name': aliasName,
          'android:targetActivity': '.MainActivity',
          'android:permission': 'android.permission.START_VIEW_PERMISSION_USAGE',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.intent.action.VIEW_PERMISSION_USAGE',
                },
              },
            ],
            category: [
              {
                $: {
                  'android:name': 'android.intent.category.HEALTH_PERMISSIONS',
                },
              },
            ],
          },
        ],
      });
    }

    return manifestConfig;
  });
};

module.exports = withHealthConnectRationale;

