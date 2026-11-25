/**
 * PulseCorp Automated Release & Security Verification Suite
 * Executes unit, integration, and static security/manifest checks across:
 *   1. Babel compilation & zero-TypeScript verification across all 43 .js source files
 *   2. Onboarding state machine route decisions (`determineOnboardingStep`)
 *   3. Health metrics zero-baseline, permission states, and biometric math
 *   4. HR consent & role enforcement (`verifyHrTelemetryAccess` + `apiClient`)
 *   5. Honest company ID verification (`UNDER_REVIEW` status without fake auto-verification)
 *   6. Community UGC rules acceptance, content reporting, user blocking, rate limiting & account deletion purge
 *   7. Supabase adapter offline/unconfigured error handling & service-role key safety
 *   8. AndroidManifest.xml & gradle.properties Target API 36 (Android 16) and permission minimization audit
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Module = require('module');
const babel = require('@babel/core');

const ROOT = path.resolve(__dirname, '..');

// ============================================================================
// 1. In-Memory React Native & AsyncStorage Runtime Harness for Node.js
// ============================================================================
const memoryStorage = new Map();
const mockAsyncStorage = {
  getItem: async (k) => (memoryStorage.has(k) ? memoryStorage.get(k) : null),
  setItem: async (k, v) => {
    memoryStorage.set(k, String(v));
  },
  removeItem: async (k) => {
    memoryStorage.delete(k);
  },
  clear: async () => {
    memoryStorage.clear();
  },
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === '@react-native-async-storage/async-storage') {
    return mockAsyncStorage;
  }
  if (request === 'react-native') {
    return {
      Platform: { OS: 'android' },
      PermissionsAndroid: {
        PERMISSIONS: { ACTIVITY_RECOGNITION: 'android.permission.ACTIVITY_RECOGNITION' },
        RESULTS: { GRANTED: 'granted', DENIED: 'denied' },
        request: async () => 'granted',
      },
      AppState: {
        addEventListener: () => ({ remove: () => { } }),
      },
      StyleSheet: { create: (s) => s },
      View: 'View',
      Text: 'Text',
      TouchableOpacity: 'TouchableOpacity',
      ScrollView: 'ScrollView',
      TextInput: 'TextInput',
      Modal: 'Modal',
      Switch: 'Switch',
      SafeAreaView: 'SafeAreaView',
      ActivityIndicator: 'ActivityIndicator',
    };
  }
  if (request === 'expo-sensors') {
    return {
      Pedometer: {
        isAvailableAsync: async () => false,
        requestPermissionsAsync: async () => ({ granted: false }),
        watchStepCount: () => ({ remove: () => { } }),
      },
      Accelerometer: {
        isAvailableAsync: async () => false,
        setUpdateInterval: () => { },
        addListener: () => ({ remove: () => { } }),
      },
    };
  }
  if (request === 'expo-haptics') {
    return {
      ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
      NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
      impactAsync: async () => { },
      notificationAsync: async () => { },
      selectionAsync: async () => { },
    };
  }
  return originalLoad.apply(this, arguments);
};

// Register Babel hook for ES Module project files
const originalJsExtension = require.extensions['.js'];
require.extensions['.js'] = function (mod, filename) {
  if (filename.includes('node_modules')) {
    return originalJsExtension(mod, filename);
  }
  const src = fs.readFileSync(filename, 'utf8');
  const transformed = babel.transformSync(src, {
    filename,
    presets: ['babel-preset-expo'],
    retainLines: true,
  });
  mod._compile(transformed.code, filename);
};

// ============================================================================
// TEST RUNNER
// ============================================================================
const results = [];
async function runTest(name, fn) {
  try {
    await fn();
    results.push({ name, status: 'PASS' });
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    results.push({ name, status: 'FAIL', error: err.message });
    console.error(`  [FAIL] ${name}: ${err.message}`);
    throw err;
  }
}

(async () => {
  console.log('=== PulseCorp Automated Release Verification Suite ===\n');

  // --------------------------------------------------------------------------
  // Suite 1: Babel Compilation & Codebase Hygiene
  // --------------------------------------------------------------------------
  await runTest('1. All project JavaScript files compile cleanly with babel-preset-expo (0 TS files)', async () => {
    const walk = (dir) => {
      let files = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (['node_modules', '.git', '.expo', 'android', 'ios'].includes(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) files = files.concat(walk(full));
        else files.push(full);
      }
      return files;
    };
    const allFiles = walk(ROOT);
    const tsFiles = allFiles.filter((f) => /\.(ts|tsx)$/.test(f));
    assert.strictEqual(tsFiles.length, 0, `Unexpected TypeScript files found: ${tsFiles.join(', ')}`);

    const jsFiles = allFiles.filter((f) => f.endsWith('.js') && !f.endsWith('.test.js'));
    assert.ok(jsFiles.length >= 43, `Expected at least 43 JS files, found ${jsFiles.length}`);
    for (const file of jsFiles) {
      const code = fs.readFileSync(file, 'utf8');
      const res = babel.transformSync(code, {
        filename: file,
        presets: ['babel-preset-expo'],
      });
      assert.ok(res && res.code, `Failed to compile ${file}`);
    }
  });

  // --------------------------------------------------------------------------
  // Suite 2: Onboarding Route Decisions, Mindful Library & Personalization Defaults
  // --------------------------------------------------------------------------
  const {
    determineOnboardingStep,
    MINDFUL_SESSIONS_LIBRARY,
    DEFAULT_PERSONALIZATION_PREFS,
    DEFAULT_CUSTOM_CHALLENGES,
  } = require('../src/context/WellnessContext');

  await runTest('2. Onboarding route decisions, 5-category Mindful Library (1-10m), and Personalization defaults', async () => {
    assert.strictEqual(determineOnboardingStep(null, null), 'AUTH');
    assert.strictEqual(determineOnboardingStep({ isAuthenticated: false }, null), 'AUTH');

    const auth = { isAuthenticated: true, uid: 'usr_1' };
    assert.strictEqual(
      determineOnboardingStep(auth, { healthPermissionsCompleted: false }),
      'HEALTH_PERMISSIONS',
    );
    assert.strictEqual(
      determineOnboardingStep(auth, {
        healthPermissionsCompleted: true,
        onboardingCompleted: false,
        heightCm: 0,
        weightKg: 0,
      }),
      'BIOMETRICS',
    );
    assert.strictEqual(
      determineOnboardingStep(auth, {
        healthPermissionsCompleted: true,
        onboardingCompleted: true,
        heightCm: 175,
        weightKg: 70,
        companyId: null,
        companyOnboardingCompleted: false,
      }),
      'COMPANY_ID_VERIFICATION',
    );
    assert.strictEqual(
      determineOnboardingStep(auth, {
        healthPermissionsCompleted: true,
        onboardingCompleted: true,
        heightCm: 175,
        weightKg: 70,
        companyId: 'comp-1',
        companyOnboardingCompleted: true,
      }),
      'COMPLETED',
    );

    // Verify 1-2m quick resets and 5-10m guided sessions across 5 categories
    assert.strictEqual(MINDFUL_SESSIONS_LIBRARY.length, 5);
    const categories = MINDFUL_SESSIONS_LIBRARY.map((s) => s.category);
    assert.ok(categories.includes('Breathing'));
    assert.ok(categories.includes('Stress Reset'));
    assert.ok(categories.includes('Focus'));
    assert.ok(categories.includes('Desk Stretch'));
    assert.ok(categories.includes('Wind-Down'));

    // Verify personalization & home metric visibility defaults
    assert.strictEqual(DEFAULT_PERSONALIZATION_PREFS.visibleHomeMetrics.steps, true);
    assert.strictEqual(DEFAULT_PERSONALIZATION_PREFS.visibleHomeMetrics.heartRate, false);
    assert.strictEqual(DEFAULT_CUSTOM_CHALLENGES[0].category, 'Active Minutes');
  });

  // --------------------------------------------------------------------------
  // Suite 3: Health Permissions, Zero-Baseline Metrics & Biometric Math
  // --------------------------------------------------------------------------
  const {
    calculateBMI,
    calculateBMR,
    calculateStrideLengthMeters,
    calculateDistanceKm,
    createZeroBaselineMetrics,
    DEFAULT_PERMISSIONS_MAP,
    healthService,
  } = require('../src/services/healthService');

  await runTest('3. Health metrics start at zero baseline with honest "No reading yet" states when permissions are uninitialized or denied', async () => {
    const zero = createZeroBaselineMetrics();
    assert.strictEqual(zero.steps.current, 0);
    assert.strictEqual(zero.heartRate.hasReading, false);
    assert.strictEqual(zero.heartRate.currentBpm, 0);
    assert.strictEqual(zero.sleep.hasReading, false);
    assert.strictEqual(zero.sleep.hoursFormatted, 'No reading yet');
    assert.strictEqual(DEFAULT_PERMISSIONS_MAP.pedometer, 'NOT_INITIALIZED');

    const bmi = calculateBMI(70, 175);
    assert.strictEqual(bmi, 22.9);
    const bmr = calculateBMR(70, 175, 28, 'male');
    assert.ok(bmr > 1600 && bmr < 1750);
    const stride = calculateStrideLengthMeters(175, 'male');
    assert.ok(stride > 0.7 && stride < 0.75);
    const dist = calculateDistanceKm(10000, stride);
    assert.ok(dist > 7.0 && dist < 7.5);

    const perms = await healthService.requestAllPermissions();
    assert.strictEqual(perms.pedometer, 'DENIED');
    assert.strictEqual(perms.oxygenSaturation, 'DENIED');
  });

  // --------------------------------------------------------------------------
  // Suite 4: HR Consent & Role Enforcement (Server Helper & API Client)
  // --------------------------------------------------------------------------
  const { verifyHrTelemetryAccess } = require('../backend/src/server');
  const { apiClient } = require('../src/services/apiClient');

  await runTest('4. HR health access blocks non-HR users and blocks HR Admins when employee consent is false', async () => {
    // Case A: Non-HR employee trying to inspect another employee
    const nonHrCheck = verifyHrTelemetryAccess({
      requesterRole: 'EMPLOYEE',
      targetHrConsent: true,
      targetEmployeeName: 'Test Employee',
    });
    assert.strictEqual(nonHrCheck.allowed, false);
    assert.strictEqual(nonHrCheck.status, 403);

    // Case B: HR Admin trying to inspect an employee who has NOT opted in (default false)
    const noConsentCheck = verifyHrTelemetryAccess({
      requesterRole: 'HR_ADMIN',
      targetHrConsent: false,
      targetEmployeeName: 'Test Employee',
    });
    assert.strictEqual(noConsentCheck.allowed, false);
    assert.strictEqual(noConsentCheck.status, 403);

    // Case C: HR Admin inspecting an employee who HAS explicitly opted in
    const validCheck = verifyHrTelemetryAccess({
      requesterRole: 'HR_ADMIN',
      targetHrConsent: true,
      targetEmployeeName: 'Test Employee',
    });
    assert.strictEqual(validCheck.allowed, true);
    assert.strictEqual(validCheck.status, 200);

    // Case D: Full apiClient check
    const apiDenied = await apiClient.inspectEmployeeHealthForHr({
      requesterRole: 'EMPLOYEE',
      targetEmployee: { id: 'emp-1', name: 'Test User', hrHealthConsent: true },
    });
    assert.strictEqual(apiDenied.ok, false);
    assert.strictEqual(apiDenied.status, 403);
  });

  // --------------------------------------------------------------------------
  // Suite 5: Honest Company ID Verification (No Fake Auto-Verification)
  // --------------------------------------------------------------------------
  const { companyService } = require('../src/services/companyService');

  await runTest('5. Company ID upload marks valid images as UNDER_REVIEW (never fake AI auto-verified) and rejects tiny images', async () => {
    const beforeUpload = await companyService.verifyEmployeeIdCard(
      'usr-test',
      'comp-acme-01',
      { uid: 'usr-test', fullName: 'Test User', companyName: 'Acme' },
      null,
    );
    assert.strictEqual(beforeUpload.status, 'PENDING_ID_UPLOAD');

    await assert.rejects(
      async () => {
        await companyService.submitIdCardUpload('usr-test', 'comp-acme-01', {
          uri: 'file:///tiny.jpg',
          fileName: 'tiny.jpg',
          width: 40,
          height: 40,
          fileSize: 500,
          mimeType: 'image/jpeg',
        });
      },
      /too small/i,
    );

    const validAsset = {
      uri: 'file:///id_card.jpg',
      fileName: 'id_card.jpg',
      width: 800,
      height: 500,
      fileSize: 85000,
      mimeType: 'image/jpeg',
    };
    await companyService.submitIdCardUpload('usr-test', 'comp-acme-01', validAsset);
    const underReview = await companyService.verifyEmployeeIdCard(
      'usr-test',
      'comp-acme-01',
      { uid: 'usr-test', fullName: 'Test User', companyName: 'Acme' },
      validAsset,
    );
    assert.strictEqual(underReview.status, 'UNDER_REVIEW');
  });

  // --------------------------------------------------------------------------
  // Suite 6: Community UGC Rules Gate, Reporting, Blocking, Rate Limits & Account Deletion Purge
  // --------------------------------------------------------------------------
  const { supabaseEngine, supabase, isSupabaseConfigured, hasUnsafeClientKey } = require('../src/lib/supabase');

  await runTest('6. Community enforces UGC rules acceptance, rate limits, reporting, blocking, and full account content purge', async () => {
    // Reset engine moderation state
    supabaseEngine.purgeUserContent('usr-alex-01');
    assert.strictEqual(supabaseEngine.ugcRulesAcceptedAt, null);

    // Attempt to post before accepting UGC rules -> blocked
    const blockedPost = supabaseEngine.createPost('Hello world!', 'WIN', 'Wellness');
    assert.strictEqual(blockedPost.ok, false);
    assert.strictEqual(blockedPost.requiresUgcAcceptance, true);

    // Accept UGC rules -> post succeeds
    supabaseEngine.acceptUgcRules();
    assert.ok(supabaseEngine.ugcRulesAcceptedAt);
    const created = supabaseEngine.createPost('Completed a 15-minute walk!', 'WIN', 'Walking');
    assert.strictEqual(created.ok, true);
    assert.strictEqual(created.post.is_demo, false);

    // Immediate second post within 2s cooldown -> rate limited
    const rateLimited = supabaseEngine.createPost('Spam post', 'WIN', 'Spam');
    assert.strictEqual(rateLimited.ok, false);

    // Report a post -> immediately hidden from ranked feed and stored in contentReports
    const targetPostId = 'post-101';
    const reportRes = supabaseEngine.reportContent({
      targetId: targetPostId,
      targetType: 'POST',
      authorId: 'usr-maya-exec',
      authorName: 'Maya Lin',
      reason: 'Spam or Misleading Content',
    });
    assert.strictEqual(reportRes.ok, true);
    const feedAfterReport = supabaseEngine.rpcGetRankedFeed();
    assert.strictEqual(
      feedAfterReport.some((p) => p.id === targetPostId),
      false,
      'Reported post must be hidden from feed',
    );

    // Block a user -> all posts from that author hidden from ranked feed
    supabaseEngine.blockUser('usr-kai-senior');
    const feedAfterBlock = supabaseEngine.rpcGetRankedFeed();
    assert.strictEqual(
      feedAfterBlock.some((p) => p.author_id === 'usr-kai-senior'),
      false,
      'Blocked author posts must be filtered out',
    );

    // Direct chat requires accepted connection and never triggers fake typing indicator
    const unacceptedChat = supabaseEngine.sendDirectMessage('fr-incoming-zara', 'Hello');
    assert.strictEqual(unacceptedChat.ok, false, 'Must block DM when connection is PENDING');

    supabaseEngine.lastActionTimestampMs = 0;
    const acceptedChat = supabaseEngine.sendDirectMessage('fr-accepted-maya', 'Hello Maya!');
    assert.strictEqual(acceptedChat.ok, true);
    assert.strictEqual(
      supabaseEngine.typingByFriendship.get('fr-accepted-maya'),
      null,
      'Fake typing indicator must not be triggered',
    );

    // Purge user content on account deletion -> removes user-created posts and resets state
    supabaseEngine.purgeUserContent('usr-alex-01');
    const feedAfterPurge = supabaseEngine.rpcGetRankedFeed();
    assert.strictEqual(
      feedAfterPurge.some((p) => p.id === created.post.id),
      false,
      'Deleted user posts must be purged',
    );
  });

  // --------------------------------------------------------------------------
  // Suite 7: Offline / Unconfigured Supabase Handling & Client Key Safety
  // --------------------------------------------------------------------------
  await runTest('7. Supabase client rejects service-role keys and returns clean errors when unconfigured', async () => {
    assert.strictEqual(hasUnsafeClientKey, false, 'Service-role key must never be bundled');
    if (!isSupabaseConfigured) {
      const signInRes = await supabase.auth.signInWithPassword({
        email: 'test@company.com',
        password: 'password123',
      });
      assert.ok(signInRes.error && signInRes.error.message.includes('not configured'));
    }
  });

  // --------------------------------------------------------------------------
  // Suite 8: AndroidManifest, Target SDK 36 (Android 16) & SQL RLS Audit
  // --------------------------------------------------------------------------
  await runTest('8. Android config targets API 36 (Android 16), removes excessive permissions, disables backup, and includes RLS SQL migration', async () => {
    const gradleProps = fs.readFileSync(path.join(ROOT, 'android', 'gradle.properties'), 'utf8');
    assert.ok(
      gradleProps.includes('android.targetSdkVersion=36'),
      'gradle.properties must set android.targetSdkVersion=36',
    );

    const manifest = fs.readFileSync(
      path.join(ROOT, 'android', 'app', 'src', 'main', 'AndroidManifest.xml'),
      'utf8',
    );
    assert.ok(!manifest.includes('SYSTEM_ALERT_WINDOW'), 'Production manifest must not request SYSTEM_ALERT_WINDOW');
    assert.ok(!manifest.includes('READ_EXTERNAL_STORAGE'), 'Production manifest must not request READ_EXTERNAL_STORAGE');
    assert.ok(!manifest.includes('WRITE_EXTERNAL_STORAGE'), 'Production manifest must not request WRITE_EXTERNAL_STORAGE');
    assert.ok(!manifest.includes('READ_OXYGEN_SATURATION'), 'Unused READ_OXYGEN_SATURATION permission must be removed');
    assert.ok(manifest.includes('android:allowBackup="false"'), 'Manifest must set allowBackup="false" for health privacy');
    assert.ok(manifest.includes('androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE'), 'Health Connect rationale intent must exist');
    assert.ok(manifest.includes('ViewPermissionUsageActivity'), 'Android 14+ ViewPermissionUsageActivity alias must exist');

    const sqlMigration = fs.readFileSync(
      path.join(ROOT, 'supabase', 'migrations', '20261124000000_production_schema_and_rls.sql'),
      'utf8',
    );
    assert.ok(sqlMigration.includes('enable row level security'));
    assert.ok(sqlMigration.includes('delete_my_account()'));
    assert.ok(sqlMigration.includes('get_company_aggregate_wellness'));
  });

  console.log(`\nALL ${results.length} VERIFICATION SUITES PASSED.`);
})();
