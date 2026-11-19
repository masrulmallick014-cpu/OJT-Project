import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useWellness } from '../../context/WellnessContext';
import { colors } from '../../theme/colors';
import { PermissionGrantStatus } from '../../types';
import { Icon } from '../../components/common/Icon';
import { triggerHapticSelection, triggerHapticNotification } from '../../utils/haptics';

export const HealthPermissionsScreen: React.FC = () => {
  const {
    userProfile,
    metrics,
    liveDiagnostics,
    requestAllHealthPermissions,
    forceSyncNow,
    completeHealthPermissionsOnboarding,
  } = useWellness();

  const [requesting, setRequesting] = useState(false);
  const [autoPrompted, setAutoPrompted] = useState(false);
  const didAutoRequestRef = useRef(false);

  const permissions = liveDiagnostics.permissions;

  const permissionItems: Array<{
    key: string;
    title: string;
    subtitle: string;
    status: PermissionGrantStatus;
  }> = [
    {
      key: 'activityRecognition',
      title:
        Platform.OS === 'android'
          ? 'android.permission.ACTIVITY_RECOGNITION'
          : 'CoreMotion Activity Recognition',
      subtitle: 'Required for <1s real-time hardware pedometer & cadence detection',
      status: permissions.activityRecognition,
    },
    {
      key: 'pedometer',
      title: 'Phone Built-in Pedometer (expo-sensors)',
      subtitle: 'Counts steps from this phone while the app is open',
      status: permissions.pedometer,
    },
    {
      key: 'accelerometer',
      title: 'expo-sensors 3-Axis Accelerometer (200ms)',
      subtitle: 'Detects IDLE, WALKING, BRISK_WALK, and RUNNING movement states',
      status: permissions.accelerometer,
    },
    {
      key: 'steps',
      title:
        Platform.OS === 'ios'
          ? 'Apple HealthKit · StepCount & Distance'
          : 'Google Health Connect · Steps & Distance',
      subtitle: 'Optional external history; never added to the phone-only step total',
      status: permissions.steps,
    },
    {
      key: 'heartRate',
      title:
        Platform.OS === 'ios'
          ? 'Apple HealthKit · HeartRate & RestingHeartRate'
          : 'Google Health Connect · HeartRate & RestingHeartRate',
      subtitle: 'Reads real BPM samples (displays 0 if no wearable reading exists)',
      status: permissions.heartRate,
    },
    {
      key: 'sleep',
      title:
        Platform.OS === 'ios'
          ? 'Apple HealthKit · SleepAnalysis'
          : 'Google Health Connect · SleepSession',
      subtitle: 'Reads real sleep duration (displays "No reading yet" if none)',
      status: permissions.sleep,
    },
    {
      key: 'activeCalories',
      title:
        Platform.OS === 'ios'
          ? 'Apple HealthKit · ActiveEnergyBurned'
          : 'Google Health Connect · ActiveCaloriesBurned',
      subtitle: 'Merges native calorie records with BMR + Stride MET calculations',
      status: permissions.activeCalories,
    },
    {
      key: 'oxygenSaturation',
      title:
        Platform.OS === 'ios'
          ? 'Apple HealthKit · OxygenSaturation (SpO2)'
          : 'Google Health Connect · OxygenSaturation (SpO2)',
      subtitle: 'Reads blood oxygen percentage from connected wearable',
      status: permissions.oxygenSaturation,
    },
  ];

  const handleRequestPermissions = async () => {
    setRequesting(true);
    try {
      await triggerHapticSelection();
      await requestAllHealthPermissions();
      await forceSyncNow();
      await triggerHapticNotification();
    } finally {
      setRequesting(false);
    }
  };

  // Automatically ask for phone motion and optional health-store permissions after login
  useEffect(() => {
    if (didAutoRequestRef.current) return;
    didAutoRequestRef.current = true;
    setAutoPrompted(true);
    handleRequestPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderStatusPill = (status: PermissionGrantStatus) => {
    const isGranted = status === 'GRANTED';
    const isDenied = status === 'DENIED';
    return (
      <View
        style={[
          styles.statusBadge,
          isGranted
            ? styles.statusBadgeGranted
            : isDenied
            ? styles.statusBadgeDenied
            : styles.statusBadgeUninitialized,
        ]}
      >
        <Text
          style={[
            styles.statusBadgeText,
            isGranted
              ? styles.statusTextGranted
              : isDenied
              ? styles.statusTextDenied
              : styles.statusTextUninitialized,
          ]}
        >
          {status}
        </Text>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.stepPill}>
        <Text style={styles.stepPillText}>
          STEP 1 OF 3 · PHONE BUILT-IN PEDOMETER &amp; MOTION PERMISSIONS
        </Text>
      </View>

      <Text style={styles.title}>Allow Phone Step Counter Permission.</Text>
      <Text style={styles.subtitle}>
        PulseCorp counts your steps directly using your phone’s built-in hardware pedometer (
        {Platform.OS === 'android'
          ? 'android.permission.ACTIVITY_RECOGNITION + TYPE_STEP_COUNTER'
          : Platform.OS === 'ios'
          ? 'Apple CoreMotion Pedometer'
          : 'expo-sensors Pedometer'}
        ). No smartwatch is required, and no fake or simulated steps are used.
      </Text>

      {autoPrompted && (
        <View style={styles.watchPipelineCard}>
          <Text style={styles.watchPipelineTitle}>
            {requesting
              ? '⏳ Requesting Phone Activity / Motion Permission...'
              : liveDiagnostics.sensorStatus === 'LIVE_PEDOMETER_STREAMING'
              ? '🟢 PHONE PEDOMETER ACTIVE & STREAMING'
              : liveDiagnostics.sensorStatus === 'HARDWARE_UNAVAILABLE'
              ? '⚠️ NO USABLE STEP SENSOR ON THIS DEVICE'
              : '🔴 PHONE ACTIVITY PERMISSION REQUIRED / DENIED'}
          </Text>
          <Text style={styles.watchPipelineSub}>
            Step Source: Phone Built-in Pedometer (`Pedometer.watchStepCount`) — Single Source
            (Accelerometer is used for G-force diagnostics only, never double-counted).
          </Text>
          <Text style={styles.watchPipelineStatus}>
            Sensor Status: {liveDiagnostics.sensorStatus} · Hardware Available:{' '}
            {liveDiagnostics.pedometerHardwareAvailable ? 'YES' : 'NO'}
          </Text>
          {liveDiagnostics.sensorStatus === 'PERMISSION_REQUIRED' && (
            <Text style={[styles.watchPipelineStatus, { color: '#9E3333', fontWeight: '700' }]}>
              Permission Denied / Needed: Tap the button below and select "Allow" on the Physical
              Activity prompt (or open Phone Settings → Apps → Expo Go / PulseCorp → Permissions →
              Physical activity → Allow).
            </Text>
          )}
          {liveDiagnostics.sensorStatus === 'HARDWARE_UNAVAILABLE' && (
            <Text style={[styles.watchPipelineStatus, { color: '#7A5C43', fontWeight: '700' }]}>
              This device or browser does not expose a hardware step counter sensor. Open the app
              on a physical Android or iOS phone to count real steps.
            </Text>
          )}
          <Text style={styles.watchPipelineMetrics}>
            Phone Pedometer Steps Today: {metrics.steps.current.toLocaleString()} (Session +
            {liveDiagnostics.liveSessionStepDelta}) · Separate Health Store Record:{' '}
            {liveDiagnostics.healthStoreSteps.toLocaleString()} steps
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.requestBtn}
        onPress={handleRequestPermissions}
        disabled={requesting}
        activeOpacity={0.85}
      >
        {requesting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Icon name="activity" size={16} color="#FFFFFF" />
            <Text style={styles.requestBtnText}>
              Grant / Re-Check Phone Activity &amp; Step Sensor Permission
            </Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.matrixCard}>
        <Text style={styles.matrixHeader}>REAL-TIME PERMISSION STATUS MATRIX</Text>
        {permissionItems.map((item) => (
          <View key={item.key} style={styles.permRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.permTitle}>{item.title}</Text>
              <Text style={styles.permSub}>{item.subtitle}</Text>
            </View>
            {renderStatusPill(item.status)}
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.continueBtn}
        onPress={async () => {
          await triggerHapticNotification();
          await completeHealthPermissionsOnboarding();
        }}
        activeOpacity={0.85}
      >
        <Text style={styles.continueBtnText}>
          {!userProfile?.onboardingCompleted || (userProfile?.heightCm || 0) < 140
            ? 'Save Permissions & Continue to Biometric Calibration'
            : !userProfile?.companyId || userProfile?.verificationStatus !== 'VERIFIED'
            ? 'Save Permissions & Continue to Company ID Verification'
            : 'Launch Real-Time Telemetry Engine & Enter PulseCorp'}
        </Text>
        <Icon name="arrow-right" size={16} color="#FFFFFF" />
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 42,
  },
  stepPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#DFECE2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 12,
  },
  stepPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  watchPipelineCard: {
    backgroundColor: '#EBF3EC',
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: '#C5DEC0',
    marginBottom: 14,
  },
  watchPipelineTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.4,
  },
  watchPipelineSub: {
    fontSize: 11,
    color: colors.textPrimary,
    marginTop: 4,
    fontWeight: '600',
  },
  watchPipelineStatus: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 3,
  },
  watchPipelineMetrics: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 4,
  },
  requestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 14,
  },
  requestBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  matrixCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFECE6',
    marginBottom: 16,
  },
  matrixHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6E746F',
    letterSpacing: 0.9,
    marginBottom: 10,
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F2EFE9',
  },
  permTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  permSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusBadgeGranted: {
    backgroundColor: '#DFECE2',
  },
  statusBadgeDenied: {
    backgroundColor: '#FCE8E8',
  },
  statusBadgeUninitialized: {
    backgroundColor: '#F5EBE1',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusTextGranted: {
    color: '#1E3A2F',
  },
  statusTextDenied: {
    color: '#9E3333',
  },
  statusTextUninitialized: {
    color: '#7A5C43',
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E3A2F',
    paddingVertical: 15,
    borderRadius: 14,
  },
  continueBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

