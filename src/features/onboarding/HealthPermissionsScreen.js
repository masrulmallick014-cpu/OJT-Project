import React, { useState } from 'react';
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
import { Icon } from '../../components/common/Icon';
import { triggerHapticSelection, triggerHapticNotification } from '../../utils/haptics';

export const HealthPermissionsScreen = () => {
  const {
    liveDiagnostics,
    requestAllHealthPermissions,
    forceSyncNow,
    completeHealthPermissionsOnboarding,
  } = useWellness();

  const [requesting, setRequesting] = useState(false);
  const [hasRequestedOnce, setHasRequestedOnce] = useState(false);

  const permissions = liveDiagnostics.permissions;

  const plainExplanationItems = [
    {
      key: 'steps_motion',
      icon: 'steps',
      title: 'Step Counter & Motion Sensor',
      whatIsRead: 'Reads your daily step count and walking cadence from your phone.',
      whyNeeded: 'Updates your daily step goal automatically while you walk.',
      status:
        permissions.pedometer === 'GRANTED' || permissions.activityRecognition === 'GRANTED'
          ? 'GRANTED'
          : permissions.pedometer === 'DENIED'
          ? 'DENIED'
          : 'NOT_INITIALIZED',
    },
    {
      key: 'watch_steps_calories',
      icon: 'watch',
      title:
        Platform.OS === 'ios'
          ? 'Apple Health · Steps & Active Calories (Optional)'
          : 'Google Health Connect · Steps & Calories (Optional)',
      whatIsRead: 'Reads step totals, walking distance, and active calories burned.',
      whyNeeded: 'Keeps your step goal accurate if you wear a smartwatch without carrying your phone.',
      status: permissions.steps,
    },
    {
      key: 'heart_sleep_spo2',
      icon: 'heart',
      title:
        Platform.OS === 'ios'
          ? 'Apple Health · Heart Rate, Sleep & Oxygen (Optional)'
          : 'Google Health Connect · Heart Rate, Sleep & Oxygen (Optional)',
      whatIsRead: 'Reads heart rate (BPM), sleep duration, and blood oxygen (SpO2) if recorded.',
      whyNeeded: 'Shows your personal recovery summary on Home. Never shared with HR unless you opt in.',
      status:
        permissions.heartRate === 'GRANTED' || permissions.sleep === 'GRANTED'
          ? 'GRANTED'
          : permissions.heartRate,
    },
  ];

  // Request OS permissions ONLY when the user explicitly taps the button
  const handleGrantPermissionsPress = async () => {
    setRequesting(true);
    try {
      await triggerHapticSelection();
      await requestAllHealthPermissions();
      await forceSyncNow();
      setHasRequestedOnce(true);
      await triggerHapticNotification();
    } finally {
      setRequesting(false);
    }
  };

  const handleContinue = async () => {
    await triggerHapticSelection();
    await completeHealthPermissionsOnboarding();
  };

  const renderStatusPill = (status) => {
    const isGranted = status === 'GRANTED';
    const isDenied = status === 'DENIED';
    const label = isGranted
      ? '✓ Allowed'
      : isDenied
      ? '✕ Declined'
      : 'Not requested yet';
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
          {label}
        </Text>
      </View>
    );
  };

  const anyPermissionGranted =
    permissions.pedometer === 'GRANTED' ||
    permissions.steps === 'GRANTED' ||
    permissions.heartRate === 'GRANTED';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.stepPill}>
        <Text style={styles.stepPillText}>STEP 1 OF 3 · HEALTH &amp; ACTIVITY ACCESS</Text>
      </View>

      <Text style={styles.title}>Choose your health data access</Text>
      <Text style={styles.subtitle}>
        PulseCorp can read your steps and optional smartwatch readings to show your daily
        progress. We never open system permission prompts without your permission, and you can
        use the app with manual logging if you prefer not to connect sensors.
      </Text>

      <View style={styles.matrixCard}>
        <Text style={styles.matrixHeader}>WHAT DATA IS READ &amp; WHY</Text>
        {plainExplanationItems.map((item) => (
          <View key={item.key} style={styles.permRow}>
            <View style={styles.permTopRow}>
              <View style={styles.iconCircle}>
                <Icon name={item.icon} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.permTitle}>{item.title}</Text>
              </View>
              {renderStatusPill(item.status)}
            </View>
            <Text style={styles.permDetail}>
              <Text style={styles.permDetailBold}>What is read: </Text>
              {item.whatIsRead}
            </Text>
            <Text style={styles.permDetail}>
              <Text style={styles.permDetailBold}>Why: </Text>
              {item.whyNeeded}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.privacyReassuranceBox}>
        <Icon name="shield" size={16} color={colors.primary} />
        <Text style={styles.privacyReassuranceText}>
          Your health data stays private by default. Sharing with HR is turned OFF unless you
          explicitly opt in later from your Profile.
        </Text>
      </View>

      {/* Primary Action: Request OS permissions only after user tap, or Continue if already checked */}
      {!hasRequestedOnce && !anyPermissionGranted ? (
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleGrantPermissionsPress}
          disabled={requesting}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Grant health and step permissions"
        >
          {requesting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Icon name="check" size={16} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Grant Health Permissions</Text>
            </>
          )}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleContinue}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Continue to Step 2: Profile and Body Info"
        >
          <Text style={styles.primaryBtnText}>Continue to Step 2: Profile Info</Text>
          <Icon name="arrowRight" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Secondary Action: Re-check permissions or Skip and continue with limited/manual features */}
      {hasRequestedOnce || anyPermissionGranted ? (
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={handleGrantPermissionsPress}
          disabled={requesting}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Re-check health permissions"
        >
          <Text style={styles.secondaryBtnText}>
            {requesting ? 'Checking permissions...' : 'Re-check Health Permissions'}
          </Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        style={styles.skipBtn}
        onPress={handleContinue}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Continue without health permissions and use manual logging"
      >
        <Text style={styles.skipBtnText}>
          {anyPermissionGranted
            ? 'Skip additional permissions & continue'
            : 'Skip for now (use manual water, breathing & workout logging)'}
        </Text>
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
    paddingHorizontal: 20,
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
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 23,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13.5,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  matrixCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFECE6',
    marginBottom: 14,
  },
  matrixHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5C645E',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  permRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2EFE9',
  },
  permTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EBF3EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  permDetail: {
    fontSize: 12.5,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  permDetailBold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 10,
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
    backgroundColor: '#F3F0EA',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextGranted: {
    color: '#1E3A2F',
  },
  statusTextDenied: {
    color: '#9E3333',
  },
  statusTextUninitialized: {
    color: '#5C645E',
  },
  privacyReassuranceBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#EBF3EC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CBE0CF',
    marginBottom: 16,
  },
  privacyReassuranceText: {
    flex: 1,
    fontSize: 12.5,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  primaryBtn: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 10,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBF3EC',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  skipBtn: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFECE6',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  skipBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
