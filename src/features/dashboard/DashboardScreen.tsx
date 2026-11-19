import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useWellness } from '../../context/WellnessContext';
import { colors } from '../../theme/colors';
import { Icon } from '../../components/common/Icon';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { ProgressRing } from '../../components/common/ProgressRing';
import { WearableProvider, WorkoutActivityType } from '../../types/index';
import { HealthDiagnostics, healthService } from '../../services/healthService';
import { triggerHapticImpact, triggerHapticSelection } from '../../utils/haptics';

type GuideTab = 'apple' | 'galaxy' | 'garmin_noise';

const WORKOUT_TYPES: WorkoutActivityType[] = [
  'Walking',
  'Running',
  'Cycling',
  'Strength Training',
  'Desk Mobility',
  'HIIT',
];

const WORKOUT_DURATIONS = [10, 20, 30, 45, 60];

export const DashboardScreen: React.FC = () => {
  const {
    userProfile,
    liveDiagnostics,
    forceSyncNow,
    metrics,
    wearable,
    hydration,
    activityLogs,
    syncState,
    syncWearable,
    selectWearableProvider,
    logWorkoutActivity,
    addWaterIntake,
    isSyncing: isRefreshing,
    pedometerStatus: sensorStatus,
    liveSensorSteps: livePedometerSteps,
  } = useWellness();
  const elapsedMsSinceSensor = liveDiagnostics.lastSensorEventTimestampMs
    ? Math.max(0, Date.now() - liveDiagnostics.lastSensorEventTimestampMs)
    : null;
  const lastSyncMessage = 'Google Health Connect & Apple HealthKit ready.';
  const switchWearableProvider = (provider: WearableProvider) =>
    selectWearableProvider(provider, wearable.modelName);
  const getDiagnostics = () => healthService.getDiagnostics();

  const [hubModalVisible, setHubModalVisible] = useState(false);
  const [troubleshooterVisible, setTroubleshooterVisible] = useState(false);
  const [workoutModalVisible, setWorkoutModalVisible] = useState(false);
  const [selectedWorkoutType, setSelectedWorkoutType] = useState<WorkoutActivityType>('Walking');
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [diagnosticsReport, setDiagnosticsReport] = useState<HealthDiagnostics | null>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);
  const [selectedGuideTab, setSelectedGuideTab] = useState<GuideTab>(
    Platform.OS === 'ios' ? 'apple' : 'galaxy'
  );

  const isSyncing = syncState !== 'idle' && syncState !== 'success' && syncState !== 'failed';

  const handleManualSync = async () => {
    await triggerHapticImpact(Haptics.ImpactFeedbackStyle.Medium);
    await syncWearable();
  };

  const handleSelectProvider = async (provider: WearableProvider) => {
    await triggerHapticSelection();
    await switchWearableProvider(provider);
    setHubModalVisible(false);
  };

  const handleOpenTroubleshooter = async () => {
    await triggerHapticSelection();
    setTroubleshooterVisible(true);
    setLoadingDiagnostics(true);
    const report = await getDiagnostics();
    setDiagnosticsReport(report);
    setLoadingDiagnostics(false);
  };

  const handleSaveWorkout = async () => {
    await triggerHapticImpact(Haptics.ImpactFeedbackStyle.Heavy);
    await logWorkoutActivity(selectedWorkoutType, selectedDuration);
    setWorkoutModalVisible(false);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleManualSync}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <Text style={styles.pageTitle}>Watch & biometrics.</Text>
        <Text style={styles.pageSubtitle}>
          Manage your connected wearable, log workouts, and inspect live health streams.
        </Text>

        {/* UPGRADE #6: LIVE TELEMETRY HUD */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 18,
            padding: 15,
            borderWidth: 1,
            borderColor: '#E5E1D8',
            marginBottom: 14,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '800', color: colors.primary }}>
              LIVE TELEMETRY HUD · SUB-200MS SENSOR FUSION{' '}
              {userProfile?.verificationStatus === 'VERIFIED' ? '· VERIFIED ID' : ''}
            </Text>
            <TouchableOpacity
              onPress={forceSyncNow}
              style={{
                backgroundColor: colors.primary,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>
                Force Sync Now
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }}>
            {liveDiagnostics.sensorStatus === 'LIVE_PEDOMETER_STREAMING'
              ? '🟢 PHONE PEDOMETER ACTIVE (Pedometer.watchStepCount Streaming)'
              : liveDiagnostics.sensorStatus === 'HARDWARE_UNAVAILABLE'
              ? '⚠️ NO USABLE STEP SENSOR ON THIS DEVICE'
              : '🔴 PHONE ACTIVITY PERMISSION REQUIRED / DENIED'}
          </Text>

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
              marginTop: 8,
            }}
          >
            <View
              style={{
                flex: 1,
                minWidth: 130,
                backgroundColor: '#FAF9F5',
                padding: 8,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#ECE9E0',
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: '800', color: '#6E746F' }}>
                LIVE 3-AXIS G-FORCE
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textPrimary }}>
                {liveDiagnostics.accelerationMagnitudeG.toFixed(2)}g{' '}
                <Text style={{ fontSize: 10, fontWeight: '600', color: '#6E746F' }}>
                  (Peak {liveDiagnostics.peakGForce.toFixed(2)}g)
                </Text>
              </Text>
              <Text style={{ fontSize: 9, color: '#6E746F' }}>Valid Gate: 1.10g – 3.00g</Text>
            </View>

            <View
              style={{
                flex: 1,
                minWidth: 130,
                backgroundColor: '#FAF9F5',
                padding: 8,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#ECE9E0',
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: '800', color: '#6E746F' }}>
                LIVE CADENCE &amp; METs
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textPrimary }}>
                {liveDiagnostics.cadenceStepsPerMin} SPM{' '}
                <Text style={{ fontSize: 10, fontWeight: '600', color: colors.primary }}>
                  ({liveDiagnostics.currentDynamicMet} METs)
                </Text>
              </Text>
              <Text style={{ fontSize: 9, color: '#6E746F' }}>Valid Gate: 60 – 210 SPM</Text>
            </View>
          </View>

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
              marginTop: 8,
            }}
          >
            <View
              style={{
                flex: 1,
                minWidth: 130,
                backgroundColor: '#FAF9F5',
                padding: 8,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#ECE9E0',
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: '800', color: '#6E746F' }}>
                MOVEMENT STATE
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary }}>
                {liveDiagnostics.movementState} (+{liveDiagnostics.liveSessionStepDelta} steps)
              </Text>
              <Text style={{ fontSize: 9, color: '#6E746F' }}>
                Anti-Cheat: {liveDiagnostics.antiCheatStatus} (Blocked:{' '}
                {liveDiagnostics.rejectedShakeSteps})
              </Text>
            </View>

            <View
              style={{
                flex: 1,
                minWidth: 130,
                backgroundColor: '#FAF9F5',
                padding: 8,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#ECE9E0',
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: '800', color: '#6E746F' }}>
                CLOUD &amp; STORAGE SYNC
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textPrimary }}>
                {liveDiagnostics.cloudSyncStatus}
              </Text>
              <Text style={{ fontSize: 9, color: '#6E746F' }} numberOfLines={1}>
                Key: {liveDiagnostics.dailyStorageKey}
              </Text>
            </View>
          </View>

          <Text style={{ fontSize: 10, color: '#6E746F', marginTop: 8 }}>
            Last Step Timestamp (ms):{' '}
            <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
              {liveDiagnostics.lastStepTimestampIsoMs || 'Awaiting first valid gait step'}
            </Text>{' '}
            (
            {elapsedMsSinceSensor !== null
              ? `Updated ${elapsedMsSinceSensor} ms ago`
              : 'Updated 0 ms ago'}
            )
          </Text>
        </View>

        {/* Sync Banner */}
        {isSyncing && (
          <View style={styles.syncBanner}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.syncBannerText}>{lastSyncMessage}</Text>
          </View>
        )}

        {/* Connected Watch Hub Card */}
        <LinearGradient
          colors={['#EAF2E6', '#DCE9D6', '#EFF5EC']}
          style={styles.watchHubCard}
        >
          <View style={styles.watchHubTop}>
            <View style={styles.watchHubLeft}>
              <View style={styles.watchIconBox}>
                <Icon name="watch" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.watchModelText}>{wearable.modelName}</Text>
                <Text style={styles.watchBrandText}>
                  {wearable.brand} • Battery {wearable.batteryLevel}%
                </Text>
              </View>
            </View>

            <View style={styles.watchHubBtns}>
              <TouchableOpacity
                onPress={handleOpenTroubleshooter}
                style={styles.guideBtn}
              >
                <Text style={styles.guideBtnText}>Guide</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setHubModalVisible(true)}
                style={styles.changeBtn}
              >
                <Text style={styles.changeBtnText}>Switch</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.watchActionRow}>
            <TouchableOpacity
              onPress={handleManualSync}
              disabled={isSyncing}
              style={styles.syncWatchBtn}
            >
              <Icon name="refresh" size={15} color="#FFFFFF" />
              <Text style={styles.syncWatchBtnText}>
                {isSyncing ? 'Syncing telemetry...' : 'Sync wearable now'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setWorkoutModalVisible(true)}
              style={styles.logActivityBtn}
            >
              <Text style={styles.logActivityBtnText}>+ Log workout</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Daily Steps Ring Card */}
        <Card style={styles.metricCard}>
          <View style={styles.stepsRow}>
            <ProgressRing
              radius={52}
              strokeWidth={10}
              progress={metrics.steps.percentage}
              color={colors.primary}
              gradientColors={['#3B6E4C', '#689F77']}
              trackColor="#EFECE3"
            >
              <View style={styles.ringCenter}>
                <Text style={styles.ringPct}>{metrics.steps.percentage}%</Text>
              </View>
            </ProgressRing>

            <View style={styles.stepsInfo}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.metricLabel}>DAILY MOVEMENT</Text>
                <Badge
                  label={
                    sensorStatus === 'active'
                      ? `LIVE +${livePedometerSteps}`
                      : `${Math.round(metrics.steps.goal / 1000)}K GOAL`
                  }
                  variant="emerald"
                />
              </View>
              <Text style={styles.bigStatValue}>
                {metrics.steps.current.toLocaleString()}{' '}
                <Text style={styles.unitSmall}>/ {metrics.steps.goal.toLocaleString()} steps</Text>
              </Text>
              <Text style={styles.subStat}>
                {metrics.steps.distanceKm} km covered • {metrics.activeCalories.burnedKcal} kcal active burn
              </Text>
            </View>
          </View>
        </Card>

        {/* 2x2 Biometrics Grid: Heart Rate, Sleep, SpO2, Stress */}
        <View style={styles.gridRow}>
          <Card style={styles.halfCard}>
            <View style={[styles.iconBadge, { backgroundColor: '#F9ECEC' }]}>
              <Icon name="heart" size={16} color="#B86B6B" />
            </View>
            <Text style={styles.halfValue}>{metrics.heartRate.currentBpm} BPM</Text>
            <Text style={styles.halfTitle}>Heart rate</Text>
            <Text style={styles.halfSub}>Resting {metrics.heartRate.restingBpm} BPM</Text>
          </Card>

          <Card style={styles.halfCard}>
            <View style={[styles.iconBadge, { backgroundColor: '#EFEcf7' }]}>
              <Icon name="sleep" size={16} color={colors.sleep} />
            </View>
            <Text style={styles.halfValue}>{metrics.sleep.hoursFormatted}</Text>
            <Text style={styles.halfTitle}>Sleep & recovery</Text>
            <Text style={styles.halfSub}>{metrics.sleep.recoveryScore}% readiness</Text>
          </Card>
        </View>

        <View style={styles.gridRow}>
          <Card style={styles.halfCard}>
            <View style={[styles.iconBadge, { backgroundColor: '#E4F2EF' }]}>
              <Icon name="oxygen" size={16} color={colors.cyan} />
            </View>
            <Text style={styles.halfValue}>{metrics.oxygen.spo2Percentage}%</Text>
            <Text style={styles.halfTitle}>Blood oxygen</Text>
            <Text style={styles.halfSub}>Optimal SpO2 saturation</Text>
          </Card>

          <Card style={styles.halfCard}>
            <View style={[styles.iconBadge, { backgroundColor: '#F8F2E7' }]}>
              <Icon name="calories" size={16} color={colors.calories} />
            </View>
            <Text style={styles.halfValue}>{metrics.activeCalories.burnedKcal} kcal</Text>
            <Text style={styles.halfTitle}>Active energy</Text>
            <Text style={styles.halfSub}>Goal {metrics.activeCalories.targetKcal} kcal</Text>
          </Card>
        </View>

        {/* Hydration & Recent Workouts */}
        <Card style={styles.metricCard}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.metricLabel}>HYDRATION LOG</Text>
              <Text style={styles.hydrationText}>
                {hydration.currentMl} / {hydration.goalMl} ml ({hydration.glassesCount} glasses)
              </Text>
            </View>
            <View style={styles.waterBtns}>
              <TouchableOpacity
                onPress={() => {
                  triggerHapticSelection();
                  addWaterIntake(-250);
                }}
                style={styles.waterBtn}
              >
                <Text style={styles.waterBtnText}>-250</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  triggerHapticSelection();
                  addWaterIntake(250);
                }}
                style={[styles.waterBtn, styles.waterBtnPlus]}
              >
                <Text style={[styles.waterBtnText, { color: '#FFFFFF' }]}>+250 ml</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        {activityLogs.length > 0 && (
          <Card style={styles.metricCard}>
            <Text style={styles.metricLabel}>RECENT WORKOUT LOGS</Text>
            {activityLogs.slice(0, 4).map((item) => (
              <View key={item.id} style={styles.logRow}>
                <Text style={styles.logName}>
                  {item.type} • {item.durationMinutes} min
                </Text>
                <Text style={styles.logMeta}>
                  +{item.estimatedSteps.toLocaleString()} steps • +{item.estimatedCalories} kcal
                </Text>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>

      {/* SWITCH WEARABLE SOURCE MODAL */}
      <Modal
        visible={hubModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setHubModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select watch source</Text>
            <Text style={styles.modalSub}>Choose your wearable health adapter</Text>

            {(
              [
                {
                  id: 'apple_health',
                  title: 'Apple HealthKit',
                  desc: 'Apple Watch Series, Ultra & SE',
                },
                {
                  id: 'health_connect',
                  title: 'Google Health Connect',
                  desc: 'Galaxy Watch, Pixel, Garmin, Noise & boAt',
                },
                {
                  id: 'hardware_pedometer',
                  title: 'Hardware Pedometer & Accelerometer',
                  desc: 'Real-time <1s expo-sensors step & cadence stream',
                },
              ] as const
            ).map((opt) => {
              const selected = wearable.provider === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => handleSelectProvider(opt.id)}
                  style={[styles.providerRow, selected && styles.providerRowSelected]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.providerTitle}>{opt.title}</Text>
                    <Text style={styles.providerDesc}>{opt.desc}</Text>
                  </View>
                  {selected && <Icon name="check" size={18} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              onPress={() => setHubModalVisible(false)}
              style={styles.primaryModalBtn}
            >
              <Text style={styles.primaryModalBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* DIAGNOSTICS & PAIRING GUIDE MODAL */}
      <Modal
        visible={troubleshooterVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTroubleshooterVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Watch setup & diagnostics</Text>
            <Text style={styles.modalSub}>
              {loadingDiagnostics
                ? 'Checking bridge status...'
                : diagnosticsReport?.activeSource || 'Health adapter ready.'}
            </Text>

            <View style={styles.tabsRow}>
              {(
                [
                  { key: 'apple', label: 'Apple Watch' },
                  { key: 'galaxy', label: 'Galaxy / WearOS' },
                  { key: 'garmin_noise', label: 'Garmin / Noise' },
                ] as const
              ).map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setSelectedGuideTab(tab.key)}
                  style={[
                    styles.tabBtn,
                    selectedGuideTab === tab.key && styles.tabBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabBtnText,
                      selectedGuideTab === tab.key && styles.tabBtnTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.guideBox}>
              {selectedGuideTab === 'apple' && (
                <Text style={styles.guideStepText}>
                  1. Open iPhone Settings → Health → Data Access & Devices.{'\n'}
                  2. Select PulseCorp and enable all biometric categories.{'\n'}
                  3. Tap "Sync wearable now" to refresh your daily rhythm.
                </Text>
              )}
              {selectedGuideTab === 'galaxy' && (
                <Text style={styles.guideStepText}>
                  1. Install Google Health Connect from the Play Store.{'\n'}
                  2. In Samsung Health → Settings → Connected Services, enable Health Connect.{'\n'}
                  3. Tap "Sync wearable now" inside PulseCorp.
                </Text>
              )}
              {selectedGuideTab === 'garmin_noise' && (
                <Text style={styles.guideStepText}>
                  1. Open Garmin Connect, NoiseFit, or boAt Crest companion app.{'\n'}
                  2. Enable Google Health Connect sync in third-party app settings.{'\n'}
                  3. Tap "Sync wearable now" to ingest steps, HR, and sleep.
                </Text>
              )}
            </View>

            <TouchableOpacity
              onPress={() => setTroubleshooterVisible(false)}
              style={styles.primaryModalBtn}
            >
              <Text style={styles.primaryModalBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* WORKOUT LOGGER MODAL */}
      <Modal
        visible={workoutModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setWorkoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Log workout session</Text>
            <Text style={styles.modalSub}>
              Adds steps & active kcal directly to your daily rhythm.
            </Text>

            <View style={styles.chipsWrap}>
              {WORKOUT_TYPES.map((type) => {
                const active = selectedWorkoutType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setSelectedWorkoutType(type)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.durationRow}>
              {WORKOUT_DURATIONS.map((mins) => {
                const active = selectedDuration === mins;
                return (
                  <TouchableOpacity
                    key={mins}
                    onPress={() => setSelectedDuration(mins)}
                    style={[styles.durBtn, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {mins}m
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setWorkoutModalVisible(false)}
                style={[styles.primaryModalBtn, { flex: 1, backgroundColor: '#EFECE3' }]}
              >
                <Text style={[styles.primaryModalBtnText, { color: colors.textPrimary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveWorkout}
                style={[styles.primaryModalBtn, { flex: 1 }]}
              >
                <Text style={styles.primaryModalBtnText}>Save activity</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 120,
  },
  pageTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  pageSubtitle: {
    color: colors.textSecondary,
    fontSize: 13.5,
    marginTop: 4,
    marginBottom: 18,
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E7F1E5',
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
    gap: 10,
  },
  syncBannerText: {
    color: '#2D5A3C',
    fontSize: 12.5,
    fontWeight: '600',
  },
  watchHubCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#D4E4CF',
    marginBottom: 16,
  },
  watchHubTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  watchHubLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  watchIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchModelText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  watchBrandText: {
    color: '#586B5A',
    fontSize: 12,
    marginTop: 2,
  },
  watchHubBtns: {
    flexDirection: 'row',
    gap: 6,
  },
  guideBtn: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 10,
  },
  guideBtnText: {
    color: colors.textPrimary,
    fontSize: 11.5,
    fontWeight: '600',
  },
  changeBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 10,
  },
  changeBtnText: {
    color: colors.primary,
    fontSize: 11.5,
    fontWeight: '700',
  },
  watchActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  syncWatchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  syncWatchBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  logActivityBtn: {
    backgroundColor: '#FAF9F5',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D6E3D2',
    justifyContent: 'center',
  },
  logActivityBtnText: {
    color: colors.primary,
    fontSize: 12.5,
    fontWeight: '700',
  },
  metricCard: {
    padding: 18,
    borderRadius: 22,
    marginBottom: 12,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ringCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPct: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  stepsInfo: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.9,
  },
  bigStatValue: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
  },
  unitSmall: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  subStat: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  halfCard: {
    flex: 1,
    padding: 16,
    borderRadius: 22,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  halfValue: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  halfTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  halfSub: {
    color: colors.textSecondary,
    fontSize: 11.5,
    marginTop: 2,
  },
  hydrationText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  waterBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  waterBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#EFECE3',
  },
  waterBtnPlus: {
    backgroundColor: colors.cyan,
  },
  waterBtnText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1EFE8',
  },
  logName: {
    color: colors.textPrimary,
    fontSize: 12.5,
    fontWeight: '600',
  },
  logMeta: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 37, 32, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  modalSub: {
    color: colors.textSecondary,
    fontSize: 12.5,
    marginTop: 4,
    marginBottom: 16,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FAF8F4',
    borderWidth: 1,
    borderColor: '#E8E4DA',
    marginBottom: 10,
  },
  providerRowSelected: {
    backgroundColor: '#E7F1E5',
    borderColor: colors.primary,
  },
  providerTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  providerDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#EFECE3',
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#E7F1E5',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  tabBtnText: {
    color: colors.textSecondary,
    fontSize: 11.5,
    fontWeight: '600',
  },
  tabBtnTextActive: {
    color: '#2D5A3C',
    fontWeight: '700',
  },
  guideBox: {
    backgroundColor: '#FAF8F4',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  guideStepText: {
    color: colors.textPrimary,
    fontSize: 12.5,
    lineHeight: 20,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#EFECE3',
  },
  chipActive: {
    backgroundColor: '#E7F1E5',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#2D5A3C',
    fontWeight: '700',
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  durBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#EFECE3',
    alignItems: 'center',
  },
  primaryModalBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryModalBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '600',
  },
});
