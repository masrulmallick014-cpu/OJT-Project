import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Circle,
  Line,
  Rect,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useWellness } from '../../context/WellnessContext';
import { colors } from '../../theme/colors';
import { RhythmRange, WellnessActivityCategory } from '../../types';
import { Icon, BloomingFlowerIllustration } from '../../components/common/Icon';
import {
  triggerHapticImpact,
  triggerHapticNotification,
  triggerHapticSelection,
} from '../../utils/haptics';

interface ChartPoint {
  label: string;
  bpm: number;
  stress: string;
  x: number;
  y: number;
}

const ZERO_BASELINE_POINTS: ChartPoint[] = [
  { label: '6 am', bpm: 0, stress: 'No reading yet', x: 18, y: 108 },
  { label: '9 am', bpm: 0, stress: 'No reading yet', x: 88, y: 108 },
  { label: '12 pm', bpm: 0, stress: 'No reading yet', x: 158, y: 108 },
  { label: '3 pm', bpm: 0, stress: 'No reading yet', x: 222, y: 108 },
  { label: '6 pm', bpm: 0, stress: 'No reading yet', x: 292, y: 108 },
];

const ACTIVITY_CATEGORIES: WellnessActivityCategory[] = [
  'Yoga & Breath',
  'Outdoor Walk',
  'Ergonomics',
  'Mindfulness',
  'Team Sport',
];

export const HomeScreen: React.FC = () => {
  const {
    employee,
    userProfile,
    liveDiagnostics,
    forceSyncNow,
    metrics,
    hydration,
    rhythmRange,
    setRhythmRange,
    setActiveTab,
    syncWearable,
    addWaterIntake,
    completeMindfulSession,
    currentQuote,
    refreshQuote,
    isSyncing,
    proposedActivities,
    selectedWinningActivity,
    proposeWellnessActivity,
    toggleVoteWellnessActivity,
    toggleJoinWellnessActivity,
  } = useWellness();

  const [useCustomQuote, setUseCustomQuote] = useState(false);
  const [selectedPointIdx, setSelectedPointIdx] = useState<number>(0);
  const [activeMetricPill, setActiveMetricPill] = useState<
    'heart' | 'steps' | 'sleep' | 'calories'
  >('heart');
  const [quickToast, setQuickToast] = useState<string | null>(null);

  // Interactive 2-Minute Guided Breathing Modal (triggered by "Find your calm ->")
  const [calmModalVisible, setCalmModalVisible] = useState(false);
  const [breathRunning, setBreathRunning] = useState(true);
  const [breathSecondsLeft, setBreathSecondsLeft] = useState(120);
  const [breathPhase, setBreathPhase] = useState<'Inhale (4s)' | 'Hold (4s)' | 'Exhale (4s)'>(
    'Inhale (4s)'
  );

  // Propose Wellness Activity Modal
  const [proposeModalVisible, setProposeModalVisible] = useState(false);
  const [newActTitle, setNewActTitle] = useState('');
  const [newActDesc, setNewActDesc] = useState('');
  const [newActTime, setNewActTime] = useState('Fri · 4:30 PM');
  const [newActLocation, setNewActLocation] = useState('Studio Rooftop Deck');
  const [newActCategory, setNewActCategory] =
    useState<WellnessActivityCategory>('Yoga & Breath');

  const firstName = (userProfile?.fullName || employee.name || 'Employee').split(' ')[0];
  const intraday = metrics.heartRate.intradayReadings || [];
  const activePoints: ChartPoint[] =
    intraday.length > 0
      ? intraday.slice(-5).map((r, idx, arr) => {
          const x = 18 + Math.round((idx / Math.max(1, arr.length - 1)) * 274);
          const clampedBpm = Math.max(45, Math.min(160, r.bpm));
          const y = 108 - Math.round(((clampedBpm - 45) / 115) * 76);
          return {
            label: r.time,
            bpm: r.bpm,
            stress: r.bpm > 95 ? 'Elevated' : 'Optimal',
            x,
            y,
          };
        })
      : ZERO_BASELINE_POINTS;
  const safeIdx = Math.min(selectedPointIdx, activePoints.length - 1);
  const activePoint = activePoints[safeIdx];

  const displayedBpm = metrics.heartRate.hasReading ? metrics.heartRate.currentBpm : 0;
  const elapsedMsSinceSensor = liveDiagnostics.lastSensorEventTimestampMs
    ? Math.max(0, Date.now() - liveDiagnostics.lastSensorEventTimestampMs)
    : null;

  // Watch -> App Live Change Detector (logs real changes when Watch / Health Store updates)
  const [watchChangeLog, setWatchChangeLog] = useState<string[]>([]);
  const prevWatchSnapshotRef = useRef<{
    initialized: boolean;
    healthStoreSteps: number;
    mergedSteps: number;
    bpm: number;
    sleepMinutes: number;
    spo2: number;
  }>({
    initialized: false,
    healthStoreSteps: 0,
    mergedSteps: 0,
    bpm: 0,
    sleepMinutes: 0,
    spo2: 0,
  });

  useEffect(() => {
    const prev = prevWatchSnapshotRef.current;
    const currHealthSteps = liveDiagnostics.healthStoreSteps || 0;
    const currMergedSteps = metrics.steps.current || 0;
    const currBpm = metrics.heartRate.hasReading ? metrics.heartRate.currentBpm : 0;
    const currSleep = metrics.sleep.hasReading ? metrics.sleep.totalMinutes : 0;
    const currSpo2 = metrics.oxygen.hasReading ? metrics.oxygen.spo2Percentage : 0;

    if (!prev.initialized) {
      prevWatchSnapshotRef.current = {
        initialized: true,
        healthStoreSteps: currHealthSteps,
        mergedSteps: currMergedSteps,
        bpm: currBpm,
        sleepMinutes: currSleep,
        spo2: currSpo2,
      };
      return;
    }

    const diffs: string[] = [];
    if (currHealthSteps !== prev.healthStoreSteps) {
      const delta = currHealthSteps - prev.healthStoreSteps;
      diffs.push(
        `Watch Store Steps ${prev.healthStoreSteps} -> ${currHealthSteps} (${delta >= 0 ? '+' : ''}${delta})`,
      );
    }
    if (currMergedSteps !== prev.mergedSteps) {
      const delta = currMergedSteps - prev.mergedSteps;
      diffs.push(
        `App Steps ${prev.mergedSteps} -> ${currMergedSteps} (${delta >= 0 ? '+' : ''}${delta})`,
      );
    }
    if (currBpm !== prev.bpm) {
      diffs.push(`HR ${prev.bpm} -> ${currBpm} BPM`);
    }
    if (currSleep !== prev.sleepMinutes) {
      diffs.push(`Sleep ${prev.sleepMinutes}m -> ${currSleep}m`);
    }
    if (currSpo2 !== prev.spo2) {
      diffs.push(`SpO2 ${prev.spo2}% -> ${currSpo2}%`);
    }

    if (diffs.length > 0) {
      const timeStr = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setWatchChangeLog((old) => [`${timeStr} · ${diffs.join(' | ')}`, ...old].slice(0, 5));
      prevWatchSnapshotRef.current = {
        initialized: true,
        healthStoreSteps: currHealthSteps,
        mergedSteps: currMergedSteps,
        bpm: currBpm,
        sleepMinutes: currSleep,
        spo2: currSpo2,
      };
    }
  }, [
    liveDiagnostics.healthStoreSteps,
    metrics.heartRate.currentBpm,
    metrics.heartRate.hasReading,
    metrics.oxygen.hasReading,
    metrics.oxygen.spo2Percentage,
    metrics.sleep.hasReading,
    metrics.sleep.totalMinutes,
    metrics.steps.current,
  ]);

  const buildSmoothHeartPath = (pts: ChartPoint[]): { line: string; area: string } => {
    if (!pts.length) {
      return { line: 'M 18 108 L 292 108', area: 'M 18 108 L 292 108 L 292 112 L 18 112 Z' };
    }
    if (pts.length === 1) {
      const p = pts[0];
      return {
        line: `M 18 ${p.y} L 292 ${p.y}`,
        area: `M 18 ${p.y} L 292 ${p.y} L 292 112 L 18 112 Z`,
      };
    }
    let line = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const midX = Math.round((p0.x + p1.x) / 2);
      line += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    const last = pts[pts.length - 1];
    const area = `${line} L ${last.x} 112 L ${pts[0].x} 112 Z`;
    return { line, area };
  };
  const dynamicChartPaths = buildSmoothHeartPath(activePoints);

  // 2-Minute Breathing Timer inside Find Your Calm modal
  useEffect(() => {
    if (!calmModalVisible || !breathRunning) return;
    const interval = setInterval(() => {
      setBreathSecondsLeft((prev) => {
        if (prev <= 1) {
          completeMindfulSession(2);
          setBreathRunning(false);
          return 120;
        }
        const next = prev - 1;
        const mod = (120 - next) % 12;
        if (mod < 4) setBreathPhase('Inhale (4s)');
        else if (mod < 8) setBreathPhase('Hold (4s)');
        else setBreathPhase('Exhale (4s)');
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [calmModalVisible, breathRunning, completeMindfulSession]);

  const showToast = (message: string) => {
    setQuickToast(message);
    setTimeout(() => {
      setQuickToast((prev) => (prev === message ? null : prev));
    }, 3000);
  };

  const handleFindCalm = async () => {
    await triggerHapticSelection();
    setBreathSecondsLeft(120);
    setBreathRunning(true);
    setCalmModalVisible(true);
  };

  const handleSyncHealthConnect = async () => {
    await triggerHapticImpact();
    await syncWearable();
    showToast('Google Health Connect synced! Steps, BPM & Office Rank updated.');
  };

  const handleProposeSubmit = async () => {
    if (!newActTitle.trim()) {
      showToast('Please enter an activity title.');
      return;
    }
    await triggerHapticNotification();
    proposeWellnessActivity({
      title: newActTitle,
      description: newActDesc,
      suggestedTime: newActTime,
      location: newActLocation,
      category: newActCategory,
    });
    setNewActTitle('');
    setNewActDesc('');
    setProposeModalVisible(false);
    showToast('Wellness activity proposed & added to the live office poll!');
  };

  const sortedActivities = [...proposedActivities].sort(
    (a, b) => b.votesCount - a.votesCount
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {quickToast && (
          <View style={styles.toastBanner}>
            <Icon name="check" size={14} color={colors.primary} />
            <Text style={styles.toastText}>{quickToast}</Text>
          </View>
        )}

        {/* 1. Greeting Header (Matches Screenshot 1) */}
        <View style={styles.greetingSection}>
          <View style={styles.greetingTitleRow}>
            <Text style={styles.greetingTitle}>A fresh start, {firstName}</Text>
            <TouchableOpacity
              onPress={async () => {
                await triggerHapticSelection();
                setUseCustomQuote(true);
                refreshQuote();
                showToast('Refreshed daily inspiration.');
              }}
              style={styles.sunIconBtn}
              accessibilityLabel="Refresh daily inspiration"
            >
              <Icon name="sun" size={24} color="#C9963E" />
            </TouchableOpacity>
          </View>
          <Text style={styles.greetingSub}>
            Small steps today. A healthier, happier you tomorrow.
          </Text>
        </View>

        {/* 2. Soft Sage Hero Inspiration Card (Matches Screenshot 1) */}
        <LinearGradient
          colors={['#DFECE2', '#E8F2EA', '#EFF6F0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTagRow}>
            <View style={styles.heroDot} />
            <Text style={styles.heroTagText}>A LITTLE INSPIRATION</Text>
          </View>

          <Text style={styles.heroQuoteText}>
            {useCustomQuote
              ? currentQuote.quote
              : 'Progress isn’t always a leap.\nSometimes, it’s a deep breath.'}
          </Text>

          <Text style={styles.heroSubCopy}>
            Show up for yourself. The rest will follow.
          </Text>

          <View style={styles.heroBottomRow}>
            <TouchableOpacity
              style={styles.findCalmBtn}
              onPress={handleFindCalm}
              activeOpacity={0.85}
            >
              <Text style={styles.findCalmBtnText}>Find your calm</Text>
              <Icon name="arrowRight" size={15} color={colors.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.flowerArtWrapper}
              onPress={handleFindCalm}
              activeOpacity={0.9}
            >
              <BloomingFlowerIllustration size={120} />
              <Text style={styles.dailyPauseLabel}>YOUR DAILY PAUSE</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* 2.5 LIVE TELEMETRY HUD (Ultra-Low-Latency Sub-200ms Sensor-Fusion Diagnostics) */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 15,
            borderWidth: 1,
            borderColor: '#E5E1D8',
            marginBottom: 18,
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
            <Text
              style={{
                fontSize: 10,
                fontWeight: '800',
                letterSpacing: 0.9,
                color: colors.primary,
              }}
            >
              LIVE TELEMETRY HUD · SUB-200MS FUSION
            </Text>
            <TouchableOpacity
              onPress={async () => {
                await triggerHapticImpact();
                await forceSyncNow();
                showToast('Forced native Health Store & Pedometer sync complete.');
              }}
              style={{
                backgroundColor: colors.primary,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>
                {isSyncing ? 'Syncing...' : 'Force Sync Now'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }}>
            {liveDiagnostics.sensorStatus === 'LIVE_PEDOMETER_STREAMING'
              ? '🟢 LIVE PEDOMETER + ACCELEROMETER (150ms) STREAMING'
              : '🔴 PERMISSION REQUIRED'}
          </Text>

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 10,
              marginTop: 8,
            }}
          >
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>
              G-Force:{' '}
              <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
                {liveDiagnostics.accelerationMagnitudeG.toFixed(2)}g (Peak{' '}
                {liveDiagnostics.peakGForce.toFixed(2)}g)
              </Text>
            </Text>
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>
              Cadence:{' '}
              <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
                {liveDiagnostics.cadenceStepsPerMin} SPM ({liveDiagnostics.currentDynamicMet} METs)
              </Text>
            </Text>
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>
              State:{' '}
              <Text style={{ fontWeight: '700', color: colors.primary }}>
                {liveDiagnostics.movementState} (+{liveDiagnostics.liveSessionStepDelta} steps)
              </Text>
            </Text>
          </View>

          <Text style={{ fontSize: 10, color: '#6E746F', marginTop: 4 }}>
            Anti-Cheat Gate (1.1g–3.0g &amp; 60–210 SPM):{' '}
            <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
              {liveDiagnostics.antiCheatStatus}
            </Text>{' '}
            · Cloud:{' '}
            <Text style={{ fontWeight: '700', color: colors.primary }}>
              {liveDiagnostics.cloudSyncStatus}
            </Text>{' '}
            ({liveDiagnostics.dailyStorageKey})
          </Text>

          <Text style={{ fontSize: 10, color: '#6E746F', marginTop: 3 }}>
            Last Step Timestamp (ms):{' '}
            <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
              {liveDiagnostics.lastStepTimestampIsoMs || 'Awaiting physical step'}
            </Text>{' '}
            ·{' '}
            {elapsedMsSinceSensor !== null
              ? `Updated ${elapsedMsSinceSensor} ms ago · Stride ${
                  userProfile?.strideLengthCm ||
                  Math.round((userProfile?.strideLengthMeters || 0.72) * 100)
                }cm`
              : 'Updated 0 ms ago'}
          </Text>

          {/* Watch -> App Live Change Verifier */}
          <View
            style={{
              marginTop: 10,
              padding: 10,
              borderRadius: 12,
              backgroundColor: '#FAF9F5',
              borderWidth: 1,
              borderColor: '#E5E1D8',
            }}
          >
            <Text
              style={{
                fontSize: 9,
                fontWeight: '800',
                letterSpacing: 0.7,
                color: colors.primary,
                marginBottom: 4,
              }}
            >
              WATCH → APP LIVE SYNC VERIFIER (AUTO-POLLS EVERY 10s)
            </Text>
            <Text style={{ fontSize: 10, color: colors.textPrimary, fontWeight: '600' }}>
              Watch Store ({liveDiagnostics.nativeHealthStoreStatus}):{' '}
              {liveDiagnostics.healthStoreSteps.toLocaleString()} steps · Phone Pedometer:{' '}
              {(
                liveDiagnostics.todayBaselineSteps + liveDiagnostics.liveSessionStepDelta
              ).toLocaleString()}{' '}
              steps → Merged: {liveDiagnostics.mergedTotalSteps.toLocaleString()} steps
            </Text>
            <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>
              Last Health Store Poll:{' '}
              {liveDiagnostics.lastNativeSyncTimestampMs
                ? new Date(liveDiagnostics.lastNativeSyncTimestampMs).toLocaleTimeString()
                : 'Awaiting first poll'}
            </Text>
            {watchChangeLog.length === 0 ? (
              <Text style={{ fontSize: 10, color: '#6E746F', marginTop: 4 }}>
                No change detected yet in this session — walk or update Health Connect /
                HealthKit data on your watch, then wait 10s or tap "Force Sync Now".
              </Text>
            ) : (
              watchChangeLog.map((entry, idx) => (
                <Text
                  key={`${entry}-${idx}`}
                  style={{ fontSize: 10, color: '#2E5C3E', fontWeight: '700', marginTop: 3 }}
                >
                  ✅ {entry}
                </Text>
              ))
            )}
          </View>
        </View>

        {/* 3. Your Daily Rhythm Header + Watch Connected + Segmented Toggle */}
        <View style={styles.rhythmHeaderBlock}>
          <View style={styles.rhythmTopTitleRow}>
            <Text style={styles.rhythmTitle}>Your daily rhythm</Text>
            <TouchableOpacity
              style={styles.syncHealthConnectBtn}
              onPress={handleSyncHealthConnect}
              activeOpacity={0.8}
            >
              <Icon name="refresh" size={13} color={colors.primary} />
              <Text style={styles.syncHealthConnectText}>
                {isSyncing ? 'Syncing...' : 'Sync Health Store'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.rhythmControlsRow}>
            <TouchableOpacity
              style={styles.watchStatusTouch}
              onPress={handleSyncHealthConnect}
              activeOpacity={0.75}
            >
              <View style={styles.connectedGreenDot} />
              <Text style={styles.watchConnectedText}>
                {metrics.heartRate.hasReading
                  ? 'Wearable connected'
                  : 'Hardware Pedometer Active'}
              </Text>
              {userProfile?.verificationStatus === 'VERIFIED' && (
                <View style={styles.demoMiniPill}>
                  <Text style={styles.demoMiniPillText}>VERIFIED ID</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.rangeToggleContainer}>
              {(['today', 'week', 'month'] as RhythmRange[]).map((rangeKey) => {
                const active = rhythmRange === rangeKey;
                const label =
                  rangeKey === 'today'
                    ? 'Today'
                    : rangeKey === 'week'
                    ? 'This week'
                    : 'Month';
                return (
                  <TouchableOpacity
                    key={rangeKey}
                    style={[
                      styles.rangeSegmentBtn,
                      active && styles.rangeSegmentBtnActive,
                    ]}
                    onPress={async () => {
                      await triggerHapticSelection();
                      setRhythmRange(rangeKey);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.rangeSegmentText,
                        active && styles.rangeSegmentTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Switchable Metric Pills to inspect all personal health telemetry on Page 1 */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.metricPillsRow}
          >
            {[
              {
                key: 'heart' as const,
                label: metrics.heartRate.hasReading
                  ? `Heart & Stress (${displayedBpm} BPM)`
                  : 'Heart & Stress (0 BPM · No reading yet)',
              },
              {
                key: 'steps' as const,
                label: `Steps (${metrics.steps.current.toLocaleString()})`,
              },
              {
                key: 'sleep' as const,
                label: `Sleep (${metrics.sleep.hoursFormatted})`,
              },
              {
                key: 'calories' as const,
                label: metrics.oxygen.hasReading
                  ? `Calories & SpO2 (${metrics.oxygen.spo2Percentage}%)`
                  : `Calories (${metrics.activeCalories.burnedKcal} kcal) · SpO2 (0%)`,
              },
            ].map((pill) => {
              const isSelected = activeMetricPill === pill.key;
              return (
                <TouchableOpacity
                  key={pill.key}
                  style={[
                    styles.metricPill,
                    isSelected && styles.metricPillSelected,
                  ]}
                  onPress={async () => {
                    await triggerHapticSelection();
                    setActiveMetricPill(pill.key);
                  }}
                >
                  <Text
                    style={[
                      styles.metricPillText,
                      isSelected && styles.metricPillTextSelected,
                    ]}
                  >
                    {pill.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 4. Heart Rate & Stress Card (Zero-Mock Real Telemetry) */}
        <View style={styles.heartRateCard}>
          <View style={styles.hrCardHeaderRow}>
            <View style={styles.hrIconTitleRow}>
              <View style={styles.blushHeartBox}>
                <Icon name="heart" size={16} color={colors.heartRate} />
              </View>
              <Text style={styles.hrCardTitle}>Heart rate & stress</Text>
            </View>
            <TouchableOpacity
              onPress={() => setActiveTab('leaderboard')}
              style={styles.chevronBtn}
            >
              <Icon name="chevronRight" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.hrValueRow}>
            <View>
              <View style={styles.bpmNumberRow}>
                <Text style={styles.bpmBigValue}>{displayedBpm}</Text>
                <Text style={styles.bpmUnitText}>BPM</Text>
              </View>
              <View style={styles.restingStatusRow}>
                <View style={styles.restingDot} />
                <Text style={styles.restingStatusText}>
                  {metrics.heartRate.hasReading
                    ? `Real wearable reading · ${activePoint.label} (${activePoint.bpm} BPM)`
                    : 'No reading yet · Sync Health Connect / Apple HealthKit wearable'}
                </Text>
              </View>
            </View>

            <View style={styles.lowStressPill}>
              <Text style={styles.lowStressPillText}>
                {metrics.heartRate.hasReading ? metrics.stress.label : 'No reading yet'}
              </Text>
              <Icon name="smile" size={14} color={colors.primaryGlow} />
            </View>
          </View>

          {/* Smooth Teal SVG Wave Area Chart */}
          <View style={styles.chartWrapper}>
            <Svg width="100%" height={124} viewBox="0 0 320 124">
              <Defs>
                <SvgGradient id="tealAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#52948E" stopOpacity="0.32" />
                  <Stop offset="100%" stopColor="#52948E" stopOpacity="0.02" />
                </SvgGradient>
              </Defs>

              {/* Dashed Horizontal Reference Lines (100 and 75) */}
              <Line
                x1="8"
                y1="28"
                x2="294"
                y2="28"
                stroke="#EAE6DF"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <Line
                x1="8"
                y1="86"
                x2="294"
                y2="86"
                stroke="#EAE6DF"
                strokeWidth="1"
                strokeDasharray="3 3"
              />

              {/* Smooth Wave Area Fill & Stroke (100% Real Watch Data — Flat Baseline Until Reading Arrives) */}
              {metrics.heartRate.hasReading ? (
                <>
                  <Path
                    d={dynamicChartPaths.area}
                    fill="url(#tealAreaGrad)"
                  />
                  <Path
                    d={dynamicChartPaths.line}
                    fill="none"
                    stroke="#52948E"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                </>
              ) : (
                <Path
                  d="M 18 108 L 292 108"
                  fill="none"
                  stroke="#C9D8D6"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                />
              )}

              {/* Interactive Highlighted Point */}
              <Circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="6"
                fill="#FFFFFF"
                stroke="#52948E"
                strokeWidth="3"
              />
            </Svg>

            <Text style={[styles.yAxisLabel, { top: 18 }]}>100</Text>
            <Text style={[styles.yAxisLabel, { top: 76 }]}>75</Text>

            {/* Interactive X-Axis Time Labels */}
            <View style={styles.xAxisRow}>
              {activePoints.map((pt, idx) => {
                const selected = idx === safeIdx;
                return (
                  <TouchableOpacity
                    key={pt.label}
                    onPress={async () => {
                      await triggerHapticSelection();
                      setSelectedPointIdx(idx);
                    }}
                    style={styles.xAxisSlot}
                  >
                    <Text
                      style={[
                        styles.xAxisText,
                        selected && styles.xAxisTextSelected,
                      ]}
                    >
                      {pt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* 5. Multi-Metric Personal Health Cards (Steps Hourly Bar Chart + Sleep & SpO2) */}
        <View style={styles.telemetryGridCard}>
          <View style={styles.telemetryCardHeader}>
            <View>
              <Text style={styles.telemetryCardTitle}>
                {activeMetricPill === 'steps'
                  ? 'Step Count & Distance (Google Health Connect)'
                  : activeMetricPill === 'sleep'
                  ? 'Sleep Architecture & Readiness'
                  : activeMetricPill === 'calories'
                  ? 'Active Calories, SpO2 & Hydration'
                  : 'Daily Steps, Sleep & Hydration Overview'}
              </Text>
              <Text style={styles.telemetryCardSub}>
                {metrics.steps.current.toLocaleString()} / {metrics.steps.goal.toLocaleString()}{' '}
                steps ({metrics.steps.distanceKm} km) · {metrics.sleep.hoursFormatted} sleep
              </Text>
            </View>
            <TouchableOpacity
              style={styles.waterQuickBtn}
              onPress={async () => {
                await triggerHapticSelection();
                addWaterIntake(250);
                showToast('+250 ml hydration logged!');
              }}
            >
              <Text style={styles.waterQuickBtnText}>+250 ml 💧</Text>
            </TouchableOpacity>
          </View>

          {/* Hourly Step Bar Chart */}
          <View style={styles.barChartContainer}>
            <Svg width="100%" height={76} viewBox="0 0 300 76">
              {metrics.steps.hourlyBreakdown.map((item, idx) => {
                const maxBar = 2800;
                const barHeight = Math.max(
                  10,
                  Math.min(54, Math.round((item.steps / maxBar) * 54))
                );
                const x = 22 + idx * 58;
                const y = 58 - barHeight;
                return (
                  <React.Fragment key={item.hour}>
                    <Rect
                      x={x}
                      y={y}
                      width={26}
                      height={barHeight}
                      rx={6}
                      fill={idx === 3 ? colors.primaryGlow : '#CBE0CF'}
                    />
                  </React.Fragment>
                );
              })}
            </Svg>
            <View style={styles.barLabelsRow}>
              {metrics.steps.hourlyBreakdown.map((item) => (
                <Text key={item.hour} style={styles.barHourLabel}>
                  {item.hour} ({item.steps})
                </Text>
              ))}
            </View>
          </View>

          {/* Summary 4-Stat Strip */}
          <View style={styles.fourStatRow}>
            <View style={styles.miniStatBox}>
              <Text style={styles.miniStatValue}>
                {metrics.steps.current.toLocaleString()}
              </Text>
              <Text style={styles.miniStatLabel}>Steps ({metrics.steps.percentage}%)</Text>
            </View>
            <View style={styles.miniStatBox}>
              <Text style={styles.miniStatValue}>{metrics.sleep.hoursFormatted}</Text>
              <Text style={styles.miniStatLabel}>
                Deep {metrics.sleep.deepSleepMinutes}m · REM {metrics.sleep.remSleepMinutes}m
              </Text>
            </View>
            <View style={styles.miniStatBox}>
              <Text style={styles.miniStatValue}>
                {metrics.activeCalories.burnedKcal} kcal
              </Text>
              <Text style={styles.miniStatLabel}>
                SpO2 {metrics.oxygen.spo2Percentage}%
              </Text>
            </View>
            <View style={styles.miniStatBox}>
              <Text style={styles.miniStatValue}>{hydration.currentMl} ml</Text>
              <Text style={styles.miniStatLabel}>Water Intake</Text>
            </View>
          </View>
        </View>

        {/* ================================================================= */}
        {/* 6. BOTTOM BAR SECTION ON HOME PAGE: CROWD-VOTED WELLNESS ACTIVITY */}
        {/* ================================================================= */}
        <View style={styles.activityPollSection}>
          <View style={styles.pollHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pollEyebrow}>CROWD-VOTED OFFICE WELLNESS POLL</Text>
              <Text style={styles.pollTitle}>Office wellness activity voting</Text>
              <Text style={styles.pollSub}>
                1 vote per colleague. The #1 highest-voted activity is selected for the office!
              </Text>
            </View>
            <TouchableOpacity
              style={styles.proposeBtn}
              onPress={async () => {
                await triggerHapticSelection();
                setProposeModalVisible(true);
              }}
              activeOpacity={0.85}
            >
              <Icon name="plus" size={14} color="#FFFFFF" />
              <Text style={styles.proposeBtnText}>Propose Activity</Text>
            </TouchableOpacity>
          </View>

          {/* Pinned #1 Winner Card */}
          {selectedWinningActivity ? (
            <LinearGradient
              colors={['#DFECE2', '#EBF3EC']}
              style={styles.winningActivityCard}
            >
              <View style={styles.winnerTopBadgeRow}>
                <View style={styles.winnerCrownPill}>
                  <Text style={styles.winnerCrownPillText}>
                    🏆 SELECTED OFFICE ACTIVITY (#1 MOST VOTES)
                  </Text>
                </View>
                <Text style={styles.winnerVotesBadge}>
                  {selectedWinningActivity.votesCount} votes
                </Text>
              </View>

              <Text style={styles.winnerTitle}>{selectedWinningActivity.title}</Text>
              <Text style={styles.winnerDesc}>{selectedWinningActivity.description}</Text>

              <View style={styles.winnerMetaRow}>
                <Text style={styles.winnerMetaText}>
                  🗓 {selectedWinningActivity.suggestedTime} · 📍{' '}
                  {selectedWinningActivity.location}
                </Text>
              </View>

              <View style={styles.winnerActionsRow}>
                <TouchableOpacity
                  style={[
                    styles.joinWinnerBtn,
                    selectedWinningActivity.joinedUserIds.includes(employee.id) &&
                      styles.joinWinnerBtnJoined,
                  ]}
                  onPress={async () => {
                    await triggerHapticNotification();
                    toggleJoinWellnessActivity(selectedWinningActivity.id);
                    showToast(
                      selectedWinningActivity.joinedUserIds.includes(employee.id)
                        ? 'Removed from your calendar.'
                        : 'Added winning activity to your calendar!'
                    );
                  }}
                >
                  <Icon
                    name={
                      selectedWinningActivity.joinedUserIds.includes(employee.id)
                        ? 'check'
                        : 'calendar'
                    }
                    size={14}
                    color="#FFFFFF"
                  />
                  <Text style={styles.joinWinnerBtnText}>
                    {selectedWinningActivity.joinedUserIds.includes(employee.id)
                      ? `Joined (${selectedWinningActivity.joinedUserIds.length} going)`
                      : 'Add to Calendar / Join'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.viewAllPollsLink}
                  onPress={() => setActiveTab('activities')}
                >
                  <Text style={styles.viewAllPollsLinkText}>Open full poll →</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          ) : (
            <View
              style={{
                backgroundColor: '#FAF9F5',
                padding: 16,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#E5E1D8',
                marginTop: 10,
              }}
            >
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                No wellness activities have been proposed yet. Tap "Propose Activity" above to
                create the first company poll!
              </Text>
            </View>
          )}

          {/* Live Voteable Activity Proposals List */}
          {sortedActivities.slice(0, 3).map((act, index) => {
            const hasVoted = act.voterUserIds.includes(employee.id);
            return (
              <View key={act.id} style={styles.proposalRowCard}>
                <View style={{ flex: 1 }}>
                  <View style={styles.proposalTitleRow}>
                    <Text style={styles.proposalRankTag}>#{index + 1}</Text>
                    <Text style={styles.proposalCategoryPill}>{act.category}</Text>
                    {act.hrApproved && (
                      <Text style={styles.hrApprovedMini}>✓ HR Approved</Text>
                    )}
                  </View>
                  <Text style={styles.proposalTitle}>{act.title}</Text>
                  <Text style={styles.proposalMeta}>
                    {act.suggestedTime} · By {act.proposedByName}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.voteBtn, hasVoted && styles.voteBtnActive]}
                  onPress={async () => {
                    await triggerHapticSelection();
                    toggleVoteWellnessActivity(act.id);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.voteArrow, hasVoted && styles.voteArrowActive]}>
                    ▲
                  </Text>
                  <Text style={[styles.voteCount, hasVoted && styles.voteCountActive]}>
                    {act.votesCount}
                  </Text>
                  <Text style={[styles.voteSub, hasVoted && styles.voteCountActive]}>
                    {hasVoted ? 'Voted' : 'Vote'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* ================================================================= */}
      {/* MODAL 1: 2-MINUTE GUIDED BREATHING ("Find your calm ->")           */}
      {/* ================================================================= */}
      <Modal
        visible={calmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCalmModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>GUIDED 4-4-4 BOX BREATHING</Text>
                <Text style={styles.modalTitle}>Find your calm.</Text>
              </View>
              <TouchableOpacity
                style={styles.closeCircle}
                onPress={() => setCalmModalVisible(false)}
              >
                <Icon name="close" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.breathingCenterBox}>
              <View style={styles.breathingAuraOuter}>
                <BloomingFlowerIllustration size={136} />
              </View>
              <Text style={styles.breathPhaseLabel}>{breathPhase}</Text>
              <Text style={styles.breathTimerValue}>
                {Math.floor(breathSecondsLeft / 60)}:
                {String(breathSecondsLeft % 60).padStart(2, '0')}
              </Text>
              <Text style={styles.breathSubHint}>
                Slow nasal breathing lowers cortisol and steadies heart rate variability.
              </Text>
            </View>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => setBreathRunning((r) => !r)}
              >
                <Text style={styles.secondaryBtnText}>
                  {breathRunning ? 'Pause Timer' : 'Resume Timer'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={async () => {
                  await triggerHapticNotification();
                  completeMindfulSession(2);
                  setCalmModalVisible(false);
                  showToast('+2 mindful minutes logged! Readiness & calm updated.');
                }}
              >
                <Text style={styles.primaryBtnText}>Complete 2-Min Reset ✓</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================================================================= */}
      {/* MODAL 2: PROPOSE NEW OFFICE WELLNESS ACTIVITY                     */}
      {/* ================================================================= */}
      <Modal
        visible={proposeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProposeModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>CROWD-VOTED ACTIVITY ENGINE</Text>
                <Text style={styles.modalTitle}>Propose Wellness Activity</Text>
              </View>
              <TouchableOpacity
                style={styles.closeCircle}
                onPress={() => setProposeModalVisible(false)}
              >
                <Icon name="close" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>ACTIVITY TITLE</Text>
            <TextInput
              style={styles.input}
              value={newActTitle}
              onChangeText={setNewActTitle}
              placeholder="e.g., Friday 4 PM Rooftop Yoga"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.fieldLabel}>DESCRIPTION</Text>
            <TextInput
              style={[styles.input, { minHeight: 60 }]}
              value={newActDesc}
              onChangeText={setNewActDesc}
              multiline
              placeholder="Why will the team love this session?"
              placeholderTextColor={colors.textMuted}
            />

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>SUGGESTED TIME</Text>
                <TextInput
                  style={styles.input}
                  value={newActTime}
                  onChangeText={setNewActTime}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>LOCATION</Text>
                <TextInput
                  style={styles.input}
                  value={newActLocation}
                  onChangeText={setNewActLocation}
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>CATEGORY</Text>
            <View style={styles.catChipsWrap}>
              {ACTIVITY_CATEGORIES.map((cat) => {
                const selected = newActCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catChip, selected && styles.catChipSelected]}
                    onPress={() => setNewActCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        selected && styles.catChipTextSelected,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.primaryBtnFull} onPress={handleProposeSubmit}>
              <Text style={styles.primaryBtnText}>Submit Activity to Office Poll →</Text>
            </TouchableOpacity>
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
    paddingBottom: 112,
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E3EFE0',
    borderWidth: 1,
    borderColor: '#C5DEC0',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    marginBottom: 10,
  },
  toastText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    flex: 1,
  },
  greetingSection: {
    marginBottom: 16,
  },
  greetingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  greetingTitle: {
    fontSize: 27,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  sunIconBtn: {
    padding: 4,
  },
  greetingSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#D5E5D8',
    marginBottom: 22,
    overflow: 'hidden',
  },
  heroTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  heroDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primaryGlow,
  },
  heroTagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.primaryGlow,
  },
  heroQuoteText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 27,
    letterSpacing: -0.3,
  },
  heroSubCopy: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 14,
  },
  heroBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  findCalmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2EAE0',
    shadowColor: '#1E3A2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  findCalmBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  flowerArtWrapper: {
    alignItems: 'center',
    marginRight: -6,
    marginBottom: -6,
  },
  dailyPauseLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: '#6C846E',
    marginTop: -4,
  },
  rhythmHeaderBlock: {
    marginBottom: 12,
  },
  rhythmTopTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rhythmTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  syncHealthConnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E8F2EA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBE0CF',
  },
  syncHealthConnectText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  rhythmControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  watchStatusTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  connectedGreenDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  watchConnectedText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  demoMiniPill: {
    backgroundColor: '#F1EFEA',
    borderWidth: 1,
    borderColor: '#E2DFD7',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  demoMiniPillText: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  rangeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0EDE6',
    borderRadius: 11,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E5E1D8',
  },
  rangeSegmentBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  rangeSegmentBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  rangeSegmentText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  rangeSegmentTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  metricPillsRow: {
    gap: 7,
    paddingVertical: 2,
  },
  metricPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  metricPillSelected: {
    backgroundColor: colors.primarySoftBg,
    borderColor: colors.primaryGlow,
  },
  metricPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  metricPillTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  heartRateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 14,
  },
  hrCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  hrIconTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  blushHeartBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.heartRateSoftBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hrCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  chevronBtn: {
    padding: 4,
  },
  hrValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bpmNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  bpmBigValue: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -1,
  },
  bpmUnitText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  restingStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  restingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  restingStatusText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  lowStressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E8F2EA',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },
  lowStressPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryGlow,
  },
  chartWrapper: {
    position: 'relative',
    marginTop: 4,
  },
  yAxisLabel: {
    position: 'absolute',
    right: 2,
    fontSize: 10,
    color: colors.textMuted,
  },
  xAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    marginTop: 4,
  },
  xAxisSlot: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  xAxisText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500',
  },
  xAxisTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  telemetryGridCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 18,
  },
  telemetryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  telemetryCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  telemetryCardSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  waterQuickBtn: {
    backgroundColor: '#EBF3EC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBE0CF',
  },
  waterQuickBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  barChartContainer: {
    backgroundColor: '#FAF9F5',
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
  },
  barLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  barHourLabel: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: '600',
  },
  fourStatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  miniStatBox: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#FAF9F5',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  miniStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  miniStatLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  activityPollSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  pollHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  pollEyebrow: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: colors.primaryGlow,
  },
  pollTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  pollSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  proposeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  proposeBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  winningActivityCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#C5DEC0',
    marginBottom: 12,
  },
  winnerTopBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  winnerCrownPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  winnerCrownPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.4,
  },
  winnerVotesBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  winnerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  winnerDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 17,
  },
  winnerMetaRow: {
    marginTop: 8,
    marginBottom: 10,
  },
  winnerMetaText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  winnerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  joinWinnerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  joinWinnerBtnJoined: {
    backgroundColor: colors.primaryGlow,
  },
  joinWinnerBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  viewAllPollsLink: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  viewAllPollsLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  proposalRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF9F5',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 8,
    gap: 10,
  },
  proposalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  proposalRankTag: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  proposalCategoryPill: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primaryGlow,
    backgroundColor: '#E8F2EA',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  hrApprovedMini: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
  },
  proposalTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  proposalMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  voteBtn: {
    width: 54,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voteBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  voteArrow: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  voteArrowActive: {
    color: '#FFFFFF',
  },
  voteCount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  voteCountActive: {
    color: '#FFFFFF',
  },
  voteSub: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(22, 28, 24, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 386,
    backgroundColor: colors.background,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: colors.primaryGlow,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  closeCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EFECE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breathingCenterBox: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  breathingAuraOuter: {
    width: 156,
    height: 156,
    borderRadius: 78,
    backgroundColor: '#E8F2EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  breathPhaseLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  breathTimerValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 4,
  },
  breathSubHint: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 12,
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  secondaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#EFECE6',
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  primaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  primaryBtnFull: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  primaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.9,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: colors.textPrimary,
  },
  catChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  catChipSelected: {
    backgroundColor: colors.primarySoftBg,
    borderColor: colors.primaryGlow,
  },
  catChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  catChipTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
});
