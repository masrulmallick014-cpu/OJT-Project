import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useWellness } from '../../context/WellnessContext';
import { colors } from '../../theme/colors';
import { Icon, BloomingFlowerIllustration } from '../../components/common/Icon';
import { ProgressRing } from '../../components/common/ProgressRing';
import {
  triggerHapticImpact,
  triggerHapticNotification,
  triggerHapticSelection,
} from '../../utils/haptics';

const FOCUS_OPTIONS = [
  { key: 'balanced', label: 'Balanced Workday' },
  { key: 'calm', label: 'Calm & Stress Reset' },
  { key: 'movement', label: 'Daily Movement' },
  { key: 'hydration', label: 'Steady Hydration' },
];

export const HomeScreen = () => {
  const {
    employee,
    userProfile,
    liveDiagnostics,
    forceSyncNow,
    metrics,
    hydration,
    mindfulMinutes,
    activityLogs,
    joinedChallengeIds,
    personalizationPrefs,
    updatePersonalizationPrefs,
    healthSyncPaused,
    togglePauseHealthSync,
    setActiveTab,
    addWaterIntake,
    logWorkoutActivity,
    completeMindfulSession,
    setStepGoal,
    currentQuote,
    refreshQuote,
    isSyncing,
    syncState,
    proposedActivities,
    selectedWinningActivity,
    walkingCompetition,
    toggleJoinWellnessActivity,
  } = useWellness();

  const [quickToast, setQuickToast] = useState(null);
  const [customizeModalVisible, setCustomizeModalVisible] = useState(false);

  // Interactive 2-Minute Guided Breathing Modal
  const [calmModalVisible, setCalmModalVisible] = useState(false);
  const [breathRunning, setBreathRunning] = useState(true);
  const [breathSecondsLeft, setBreathSecondsLeft] = useState(120);
  const [breathPhase, setBreathPhase] = useState('Inhale (4s)');
  const [breathCompletedSummary, setBreathCompletedSummary] = useState(false);

  // Join / Log a Walk Modal
  const [walkModalVisible, setWalkModalVisible] = useState(false);

  const firstName = (userProfile?.fullName || employee.name || 'Friend').split(' ')[0];
  const visibleMetrics = personalizationPrefs?.visibleHomeMetrics || {
    steps: true,
    hydration: true,
    mindful: true,
    heartRate: false,
    sleep: false,
    weeklyRecap: true,
    teamUpdates: true,
  };
  const activeFocus = personalizationPrefs?.wellnessFocus || 'balanced';

  useEffect(() => {
    if (!calmModalVisible || !breathRunning || breathCompletedSummary) return;
    const interval = setInterval(() => {
      setBreathSecondsLeft((prev) => {
        if (prev <= 1) {
          completeMindfulSession(2, {
            title: '2-Min Box Breathing Reset',
            category: 'Breathing',
          });
          setBreathRunning(false);
          setBreathCompletedSummary(true);
          return 0;
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
  }, [calmModalVisible, breathRunning, breathCompletedSummary, completeMindfulSession]);

  const showToast = (message) => {
    setQuickToast(message);
    setTimeout(() => {
      setQuickToast((prev) => (prev === message ? null : prev));
    }, 3200);
  };

  const handleLogWater = async () => {
    await triggerHapticSelection();
    addWaterIntake(250);
    showToast('Added 250 ml of water. Nice hydration break!');
  };

  const handleStartBreathing = async () => {
    await triggerHapticSelection();
    setBreathSecondsLeft(120);
    setBreathCompletedSummary(false);
    setBreathRunning(true);
    setCalmModalVisible(true);
  };

  const handleQuickWalk = async (minutes) => {
    await triggerHapticNotification();
    logWorkoutActivity('Walking', minutes);
    setWalkModalVisible(false);
    showToast(`Logged a ${minutes}-minute walk!`);
  };

  const handleRefreshReadings = async () => {
    if (healthSyncPaused) {
      togglePauseHealthSync();
      showToast('Resumed health sensor sync.');
      return;
    }
    await triggerHapticImpact();
    await forceSyncNow();
    showToast('Checked device sensors and health store.');
  };

  const toggleVisibleMetric = (metricKey) => {
    updatePersonalizationPrefs({
      visibleHomeMetrics: {
        ...visibleMetrics,
        [metricKey]: !visibleMetrics[metricKey],
      },
    });
  };

  // Derive ONE Clear Recommended Action based on user's chosen Wellness Focus & current progress
  const getRecommendedAction = () => {
    if (activeFocus === 'calm' || (activeFocus === 'balanced' && mindfulMinutes === 0)) {
      return {
        eyebrow: 'RECOMMENDED NEXT STEP · CALM FOCUS',
        title: 'Take a 2-minute breathing reset',
        subtitle:
          'A short 4-4-4 breathing pause helps lower workday tension before your next task.',
        ctaLabel: 'Start 2-Min Breathing',
        onPress: handleStartBreathing,
      };
    }
    if (
      activeFocus === 'hydration' ||
      (activeFocus === 'balanced' && hydration.glassesCount < 3)
    ) {
      return {
        eyebrow: 'RECOMMENDED NEXT STEP · HYDRATION',
        title: 'Drink a glass of water (+250 ml)',
        subtitle: `You have logged ${hydration.glassesCount} glasses (${hydration.currentMl} ml) today.`,
        ctaLabel: 'Log +250 ml Water',
        onPress: handleLogWater,
      };
    }
    return {
      eyebrow: 'RECOMMENDED NEXT STEP · MOVEMENT',
      title: 'Take a 10-minute walk or stretch break',
      subtitle:
        'Stepping away from your desk for a short walk boosts circulation and focus.',
      ctaLabel: 'Log a Short Walk',
      onPress: () => setWalkModalVisible(true),
    };
  };

  const recommended = getRecommendedAction();

  // Derive ONE Gentle Weekly Suggestion from user-allowed data
  const gentleSuggestion =
    mindfulMinutes === 0
      ? 'Gentle suggestion: Try a 1- or 2-minute breathing pause between afternoon meetings.'
      : hydration.glassesCount < 4
      ? 'Gentle suggestion: Keep a water bottle on your desk for an easy mid-day refill.'
      : 'Gentle suggestion: You’re building a steady rhythm—remember that rest days are just as valuable as active days.';

  // Determine clear, truthful status labels for steps and wearable readings
  const perms = liveDiagnostics.permissions;
  const stepPermissionNeeded =
    perms.pedometer === 'DENIED' && perms.steps === 'DENIED';
  const stepSensorActive =
    !healthSyncPaused && liveDiagnostics.sensorStatus === 'LIVE_PEDOMETER_STREAMING';
  const lastUpdatedLabel = metrics.lastSyncedAt
    ? `Last updated ${new Date(metrics.lastSyncedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`
    : 'No reading yet today';

  const stepStatusLabel = healthSyncPaused
    ? 'Health sync paused by you — manual logging active'
    : isSyncing
    ? 'Checking sensors...'
    : syncState === 'failed'
    ? 'Could not read health store — tap Refresh to retry'
    : stepPermissionNeeded
    ? 'Sensor permission off — manual walk logging active'
    : stepSensorActive
    ? 'Device step sensor active'
    : 'Source: Manual logs & device pedometer';

  const hrStatusLabel = metrics.heartRate.hasReading
    ? `${metrics.heartRate.currentBpm} BPM`
    : perms.heartRate === 'DENIED'
    ? 'Permission needed'
    : 'No reading yet';

  const sleepStatusLabel = metrics.sleep.hasReading
    ? metrics.sleep.hoursFormatted
    : perms.sleep === 'DENIED'
    ? 'Permission needed'
    : 'No reading yet';

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {quickToast && (
          <View style={styles.toastBanner} accessibilityRole="alert">
            <Icon name="check" size={15} color={colors.primary} />
            <Text style={styles.toastText}>{quickToast}</Text>
          </View>
        )}

        {/* 1. Friendly Greeting Header + Customize Today Button */}
        <View style={styles.greetingSection}>
          <View style={styles.greetingTitleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greetingTitle}>Welcome back, {firstName}</Text>
              <Text style={styles.greetingSub}>“{currentQuote.quote}”</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <TouchableOpacity
                onPress={async () => {
                  await triggerHapticSelection();
                  refreshQuote();
                  showToast('Refreshed daily thought.');
                }}
                style={styles.sunIconBtn}
                accessibilityRole="button"
                accessibilityLabel="Refresh daily inspiration quote"
              >
                <Icon name="sun" size={20} color="#C9963E" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  await triggerHapticSelection();
                  setCustomizeModalVisible(true);
                }}
                style={styles.customizePillBtn}
                accessibilityRole="button"
                accessibilityLabel="Customize Today screen metrics and focus"
              >
                <Text style={styles.customizePillText}>Customize</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 2. ONE Clear Recommended Action Card */}
        <View style={styles.recommendedCard}>
          <Text style={styles.recommendedEyebrow}>{recommended.eyebrow}</Text>
          <Text style={styles.recommendedTitle}>{recommended.title}</Text>
          <Text style={styles.recommendedSub}>{recommended.subtitle}</Text>
          <TouchableOpacity
            style={styles.recommendedPrimaryBtn}
            onPress={recommended.onPress}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={recommended.ctaLabel}
          >
            <Text style={styles.recommendedPrimaryBtnText}>{recommended.ctaLabel}</Text>
          </TouchableOpacity>
        </View>

        {/* 3. Daily Walking Goal Progress (if visible) */}
        {visibleMetrics.steps && (
          <LinearGradient
            colors={['#DFECE2', '#EBF3EC', '#F4F8F4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryGoalCard}
          >
            <View style={styles.goalCardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.goalEyebrow}>DAILY MOVEMENT GOAL</Text>
                <Text style={styles.goalTitle}>Walking &amp; Active Minutes</Text>
              </View>
              <TouchableOpacity
                style={styles.refreshPillBtn}
                onPress={handleRefreshReadings}
                disabled={isSyncing}
                accessibilityRole="button"
                accessibilityLabel={
                  healthSyncPaused
                    ? 'Resume health sensor sync'
                    : 'Refresh step and health readings'
                }
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Icon name="refresh" size={14} color={colors.primary} />
                    <Text style={styles.refreshPillText}>
                      {healthSyncPaused ? 'Resume Sync' : 'Refresh'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.goalMainRow}>
              <ProgressRing
                radius={54}
                strokeWidth={10}
                progress={metrics.steps.percentage}
                color={colors.primary}
                gradientColors={['#1E3A2F', '#4A7C59']}
                trackColor="#D0E0D3"
              >
                <View style={styles.ringCenter}>
                  <Text style={styles.ringPct}>{metrics.steps.percentage}%</Text>
                </View>
              </ProgressRing>

              <View style={styles.goalNumbersCol}>
                <Text style={styles.bigStepsText}>
                  {metrics.steps.current.toLocaleString()}
                </Text>
                <Text style={styles.goalTargetText}>
                  of {metrics.steps.goal.toLocaleString()} steps goal
                </Text>
                <Text style={styles.goalMetaText}>
                  {metrics.steps.activeMinutes || Math.round(metrics.steps.current / 100)} active
                  mins · {metrics.steps.distanceKm} km
                </Text>
              </View>
            </View>

            {/* Quick Achievable Goal Presets */}
            <View style={styles.goalPresetRow}>
              <Text style={styles.goalPresetLabel}>Goal:</Text>
              {[6000, 8000, 10000].map((target) => {
                const active = metrics.steps.goal === target;
                return (
                  <TouchableOpacity
                    key={target}
                    style={[styles.goalPresetChip, active && styles.goalPresetChipActive]}
                    onPress={async () => {
                      await triggerHapticSelection();
                      setStepGoal(target);
                      showToast(`Daily step goal set to ${target.toLocaleString()} steps.`);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Set daily step goal to ${target} steps`}
                  >
                    <Text
                      style={[
                        styles.goalPresetChipText,
                        active && styles.goalPresetChipTextActive,
                      ]}
                    >
                      {(target / 1000).toFixed(0)}k
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.statusStrip}>
              <View
                style={[
                  styles.statusDot,
                  stepSensorActive
                    ? { backgroundColor: colors.success }
                    : syncState === 'failed'
                    ? { backgroundColor: colors.danger }
                    : { backgroundColor: '#8A8E89' },
                ]}
              />
              <Text style={styles.statusStripText}>
                {stepStatusLabel} · {lastUpdatedLabel}
              </Text>
            </View>
          </LinearGradient>
        )}

        {/* 4. Quick Actions */}
        <Text style={styles.sectionHeaderLabel}>QUICK ACTIONS</Text>
        <View style={styles.quickActionsCol}>
          {visibleMetrics.hydration && (
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={handleLogWater}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Log 250 milliliters of water. Current total ${hydration.currentMl} of ${hydration.goalMl} milliliters`}
            >
              <View style={[styles.quickActionIconBox, { backgroundColor: '#E4F2EF' }]}>
                <Icon name="oxygen" size={20} color="#246358" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.quickActionTitle}>Log water (+250 ml)</Text>
                <Text style={styles.quickActionSub}>
                  {hydration.currentMl} / {hydration.goalMl} ml ({hydration.glassesCount} glasses
                  today)
                </Text>
              </View>
              <View style={styles.quickActionCtaPill}>
                <Text style={styles.quickActionCtaText}>+250 ml</Text>
              </View>
            </TouchableOpacity>
          )}

          {visibleMetrics.mindful && (
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={handleStartBreathing}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Start 2-minute breathing reset"
            >
              <View style={[styles.quickActionIconBox, { backgroundColor: '#DFECE2' }]}>
                <Icon name="lotus" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.quickActionTitle}>2-minute breathing reset</Text>
                <Text style={styles.quickActionSub}>
                  Calm 4-4-4 box breathing ({mindfulMinutes} mindful mins logged)
                </Text>
              </View>
              <Icon name="arrowRight" size={18} color={colors.primary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={async () => {
              await triggerHapticSelection();
              setWalkModalVisible(true);
            }}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Take a short walk"
          >
            <View style={[styles.quickActionIconBox, { backgroundColor: '#F5EBE1' }]}>
              <Icon name="steps" size={20} color="#7A5C43" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.quickActionTitle}>Take a short walk</Text>
              <Text style={styles.quickActionSub}>
                Log a 10, 20, or 30-minute walk or join a team break
              </Text>
            </View>
            <Icon name="arrowRight" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* 5. Weekly Recap with Personal Progress and One Gentle Suggestion */}
        {visibleMetrics.weeklyRecap && (
          <>
            <Text style={styles.sectionHeaderLabel}>WEEKLY RECAP &amp; SUGGESTION</Text>
            <View style={styles.weeklyRecapCard}>
              <View style={styles.weeklyRecapTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.weeklyRecapTitle}>
                    {personalizationPrefs?.showStreaksAndCheckIns !== false
                      ? `${employee.currentStreakDays} Check-In Days Logged`
                      : 'Your Personal Progress'}
                  </Text>
                  <Text style={styles.weeklyRecapSub}>
                    Missed days are neutral and never reset your progress.
                  </Text>
                </View>
                <View style={styles.weeklyBadge}>
                  <Text style={styles.weeklyBadgeText}>No-Guilt Rhythm</Text>
                </View>
              </View>

              <View style={styles.weeklyStatsRow}>
                <View style={styles.weeklyStatItem}>
                  <Text style={styles.weeklyStatVal}>{hydration.glassesCount}</Text>
                  <Text style={styles.weeklyStatLabel}>water glasses</Text>
                </View>
                <View style={styles.weeklyStatItem}>
                  <Text style={styles.weeklyStatVal}>{mindfulMinutes}m</Text>
                  <Text style={styles.weeklyStatLabel}>mindful time</Text>
                </View>
                <View style={styles.weeklyStatItem}>
                  <Text style={styles.weeklyStatVal}>{activityLogs.length}</Text>
                  <Text style={styles.weeklyStatLabel}>walks &amp; logs</Text>
                </View>
                <View style={styles.weeklyStatItem}>
                  <Text style={styles.weeklyStatVal}>{joinedChallengeIds.length}</Text>
                  <Text style={styles.weeklyStatLabel}>challenges</Text>
                </View>
              </View>

              <View style={styles.gentleSuggestionBox}>
                <Text style={styles.gentleSuggestionText}>{gentleSuggestion}</Text>
              </View>
            </View>
          </>
        )}

        {/* 6. Optional Wearable Metrics (Hidden by default unless user enables them in Customize) */}
        {(visibleMetrics.heartRate || visibleMetrics.sleep) && (
          <>
            <Text style={styles.sectionHeaderLabel}>SELECTED WEARABLE READINGS</Text>
            <View style={styles.readingsGrid}>
              {visibleMetrics.heartRate && (
                <View style={styles.readingTile}>
                  <View style={styles.readingTileHeader}>
                    <Icon name="heart" size={16} color={colors.heartRate} />
                    <Text style={styles.readingTileLabel}>Heart Rate</Text>
                  </View>
                  <Text style={styles.readingTileValue}>{hrStatusLabel}</Text>
                  <Text style={styles.readingTileSub}>
                    {metrics.heartRate.hasReading
                      ? `Resting ${metrics.heartRate.restingBpm} BPM · ${lastUpdatedLabel}`
                      : 'Source unavailable — connect Health Connect watch to view'}
                  </Text>
                </View>
              )}

              {visibleMetrics.sleep && (
                <View style={styles.readingTile}>
                  <View style={styles.readingTileHeader}>
                    <Icon name="sleep" size={16} color={colors.sleep} />
                    <Text style={styles.readingTileLabel}>Sleep</Text>
                  </View>
                  <Text style={styles.readingTileValue}>{sleepStatusLabel}</Text>
                  <Text style={styles.readingTileSub}>
                    {metrics.sleep.hasReading
                      ? `${metrics.sleep.qualityLabel || 'Recorded'} · ${lastUpdatedLabel}`
                      : 'No sleep session synced today'}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* 7. Team Updates (if visible) */}
        {visibleMetrics.teamUpdates && (
          <>
            <View style={styles.teamUpdatesHeaderRow}>
              <Text style={styles.sectionHeaderLabel}>TEAM UPDATES</Text>
              <TouchableOpacity
                onPress={() => setActiveTab('leaderboard')}
                style={styles.viewAllBtn}
                accessibilityRole="button"
                accessibilityLabel="Open Challenges tab"
              >
                <Text style={styles.viewAllBtnText}>View Challenges →</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.teamUpdatesCard}>
              <TouchableOpacity
                style={styles.teamUpdateRow}
                onPress={() => setActiveTab('leaderboard')}
                activeOpacity={0.85}
                accessibilityRole="button"
              >
                <View style={[styles.updateIconCircle, { backgroundColor: '#DFECE2' }]}>
                  <Icon name="trophy" size={17} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.teamUpdateTitle}>{walkingCompetition.title}</Text>
                  <Text style={styles.teamUpdateSub}>
                    Opt-in team challenge · Your steps: {metrics.steps.current.toLocaleString()}
                  </Text>
                </View>
                <Icon name="chevronRight" size={16} color={colors.textMuted} />
              </TouchableOpacity>

              <View style={styles.rowDivider} />

              {selectedWinningActivity ? (
                <View style={styles.teamUpdateRow}>
                  <View style={[styles.updateIconCircle, { backgroundColor: '#F5EBE1' }]}>
                    <Icon name="calendar" size={17} color="#7A5C43" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.teamUpdateTitle}>
                      Office Activity: {selectedWinningActivity.title}
                    </Text>
                    <Text style={styles.teamUpdateSub}>
                      {selectedWinningActivity.suggestedTime} ·{' '}
                      {selectedWinningActivity.location} ({selectedWinningActivity.votesCount}{' '}
                      votes)
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.miniJoinBtn,
                      selectedWinningActivity.joinedUserIds.includes(employee.id) &&
                        styles.miniJoinBtnActive,
                    ]}
                    onPress={async () => {
                      await triggerHapticNotification();
                      toggleJoinWellnessActivity(selectedWinningActivity.id);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={
                      selectedWinningActivity.joinedUserIds.includes(employee.id)
                        ? 'Leave office activity'
                        : 'Join office activity'
                    }
                  >
                    <Text
                      style={[
                        styles.miniJoinBtnText,
                        selectedWinningActivity.joinedUserIds.includes(employee.id) &&
                          styles.miniJoinBtnTextActive,
                      ]}
                    >
                      {selectedWinningActivity.joinedUserIds.includes(employee.id)
                        ? '✓ Joined'
                        : '+ Join'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.teamUpdateRow}
                  onPress={() => setActiveTab('calm')}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                >
                  <View style={[styles.updateIconCircle, { backgroundColor: '#F5EBE1' }]}>
                    <Icon name="plus" size={17} color="#7A5C43" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.teamUpdateTitle}>
                      Propose an office wellness activity
                    </Text>
                    <Text style={styles.teamUpdateSub}>
                      Suggest a group walk, stretch, or mindfulness break (
                      {proposedActivities.length} active)
                    </Text>
                  </View>
                  <Icon name="chevronRight" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* MODAL 1: 2-Minute Guided Breathing with Pause, Finish, Exit & Completion Summary */}
      <Modal
        visible={calmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCalmModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalEyebrow}>GUIDED 4-4-4 BOX BREATHING</Text>
                <Text style={styles.modalTitle}>
                  {breathCompletedSummary
                    ? 'Breathing Pause Complete'
                    : '2-Minute Breathing Reset'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeCircle}
                onPress={() => setCalmModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Exit breathing modal"
              >
                <Icon name="close" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {breathCompletedSummary ? (
              <View style={styles.summaryBox}>
                <View style={styles.breathingAuraOuter}>
                  <BloomingFlowerIllustration size={110} />
                </View>
                <Text style={styles.summaryHeadline}>+2 Mindful Minutes Logged</Text>
                <Text style={styles.summaryBody}>
                  Taking a short pause helps you return to your workday feeling steady. Your total
                  mindful time is now {mindfulMinutes} minutes.
                </Text>
                <TouchableOpacity
                  style={[styles.primaryBtn, { width: '100%', marginTop: 12 }]}
                  onPress={() => {
                    setCalmModalVisible(false);
                    showToast('Logged 2 mindful minutes.');
                  }}
                  accessibilityRole="button"
                >
                  <Text style={styles.primaryBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.breathingCenterBox}>
                  <View style={styles.breathingAuraOuter}>
                    <BloomingFlowerIllustration size={130} />
                  </View>
                  <Text style={styles.breathPhaseLabel}>
                    {breathRunning ? breathPhase : 'Paused'}
                  </Text>
                  <Text style={styles.breathTimerValue}>
                    {Math.floor(breathSecondsLeft / 60)}:
                    {String(breathSecondsLeft % 60).padStart(2, '0')}
                  </Text>
                  <Text style={styles.breathSubHint}>
                    Breathe in slowly for 4 seconds, hold for 4 seconds, and exhale gently for 4
                    seconds.
                  </Text>
                </View>

                <View style={styles.modalActionsRow}>
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={() => setBreathRunning((r) => !r)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.secondaryBtnText}>
                      {breathRunning ? 'Pause' : 'Resume'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={async () => {
                      await triggerHapticNotification();
                      completeMindfulSession(2, {
                        title: '2-Min Box Breathing Reset',
                        category: 'Breathing',
                      });
                      setBreathRunning(false);
                      setBreathCompletedSummary(true);
                    }}
                    accessibilityRole="button"
                  >
                    <Text style={styles.primaryBtnText}>Finish &amp; Summary ✓</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Join / Log a Walk */}
      <Modal
        visible={walkModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setWalkModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalEyebrow}>OPT-IN MOVEMENT</Text>
                <Text style={styles.modalTitle}>Take a Short Walk</Text>
              </View>
              <TouchableOpacity
                style={styles.closeCircle}
                onPress={() => setWalkModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close walk modal"
              >
                <Icon name="close" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.walkModalDesc}>
              Log a walk right now to add estimated steps and active minutes to today’s progress,
              or browse team walking activities.
            </Text>

            <View style={styles.walkQuickBtnsCol}>
              {[
                { mins: 10, label: 'Log 10-minute walk (~1,050 steps)' },
                { mins: 20, label: 'Log 20-minute walk (~2,100 steps)' },
                { mins: 30, label: 'Log 30-minute walk (~3,150 steps)' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.mins}
                  style={styles.walkOptionBtn}
                  onPress={() => handleQuickWalk(item.mins)}
                  accessibilityRole="button"
                >
                  <Icon name="steps" size={16} color={colors.primary} />
                  <Text style={styles.walkOptionText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.openMoveModalBtn}
              onPress={() => {
                setWalkModalVisible(false);
                setActiveTab('activities');
              }}
              accessibilityRole="button"
            >
              <Text style={styles.openMoveModalBtnText}>
                Browse Team Walks in Mindful Tab →
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: Customize Today View & Wellness Focus */}
      <Modal
        visible={customizeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomizeModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalEyebrow}>PERSONALIZE TODAY</Text>
                <Text style={styles.modalTitle}>Customize Your Today View</Text>
              </View>
              <TouchableOpacity
                style={styles.closeCircle}
                onPress={() => setCustomizeModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close customize modal"
              >
                <Icon name="close" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.customizeLabel}>YOUR WELLNESS FOCUS</Text>
            <View style={styles.focusChipsWrap}>
              {FOCUS_OPTIONS.map((opt) => {
                const selected = activeFocus === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.focusChip, selected && styles.focusChipActive]}
                    onPress={() => updatePersonalizationPrefs({ wellnessFocus: opt.key })}
                    accessibilityRole="button"
                  >
                    <Text
                      style={[
                        styles.focusChipText,
                        selected && styles.focusChipTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.customizeLabel, { marginTop: 12 }]}>
              SHOW OR HIDE TODAY METRICS
            </Text>
            {[
              { key: 'steps', label: 'Daily Walking & Active Minutes' },
              { key: 'hydration', label: 'Water & Hydration Action' },
              { key: 'mindful', label: '2-Minute Breathing Action' },
              { key: 'weeklyRecap', label: 'Weekly Recap & Gentle Suggestion' },
              { key: 'heartRate', label: 'Optional Heart Rate Tile' },
              { key: 'sleep', label: 'Optional Sleep Duration Tile' },
              { key: 'teamUpdates', label: 'Team Updates Section' },
            ].map((item) => (
              <View key={item.key} style={styles.metricToggleRow}>
                <Text style={styles.metricToggleLabel}>{item.label}</Text>
                <Switch
                  value={Boolean(visibleMetrics[item.key])}
                  onValueChange={() => toggleVisibleMetric(item.key)}
                  trackColor={{ false: '#D8D4CC', true: '#4A7C59' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            ))}

            <TouchableOpacity
              style={[styles.primaryBtn, { marginTop: 14, flex: 0 }]}
              onPress={() => setCustomizeModalVisible(false)}
              accessibilityRole="button"
            >
              <Text style={styles.primaryBtnText}>Save Today Layout</Text>
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
    paddingVertical: 11,
    borderRadius: 14,
    marginBottom: 12,
  },
  toastText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    flex: 1,
  },
  greetingSection: {
    marginBottom: 12,
  },
  greetingTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  greetingTitle: {
    fontSize: 25,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  sunIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customizePillBtn: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#EFECE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customizePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  greetingSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  recommendedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#CBE0CF',
    marginBottom: 16,
  },
  recommendedEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
    color: colors.primary,
  },
  recommendedTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 3,
  },
  recommendedSub: {
    fontSize: 12.5,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 18,
    marginBottom: 12,
  },
  recommendedPrimaryBtn: {
    minHeight: 48,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendedPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  primaryGoalCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#CBE0CF',
    marginBottom: 18,
  },
  goalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalEyebrow: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.0,
    color: colors.primaryGlow,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  refreshPillBtn: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBE0CF',
  },
  refreshPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  goalMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  ringCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPct: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  goalNumbersCol: {
    flex: 1,
  },
  bigStepsText: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.8,
  },
  goalTargetText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  goalMetaText: {
    fontSize: 12.5,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  goalPresetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  goalPresetLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  goalPresetChip: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderColor: '#CBE0CF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalPresetChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  goalPresetChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  goalPresetChipTextActive: {
    color: '#FFFFFF',
  },
  statusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusStripText: {
    fontSize: 11.5,
    color: colors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  sectionHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
    color: '#5C645E',
    marginBottom: 10,
  },
  quickActionsCol: {
    gap: 10,
    marginBottom: 18,
  },
  quickActionCard: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  quickActionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  quickActionSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  quickActionCtaPill: {
    backgroundColor: '#DFECE2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  quickActionCtaText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  weeklyRecapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 18,
  },
  weeklyRecapTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  weeklyRecapTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  weeklyRecapSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 17,
  },
  weeklyBadge: {
    backgroundColor: '#EBF3EC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  weeklyBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.primary,
  },
  weeklyStatsRow: {
    flexDirection: 'row',
    backgroundColor: '#FAF9F5',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#ECE9E0',
    justifyContent: 'space-around',
  },
  weeklyStatItem: {
    alignItems: 'center',
  },
  weeklyStatVal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  weeklyStatLabel: {
    fontSize: 10.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  gentleSuggestionBox: {
    marginTop: 10,
    backgroundColor: '#EBF3EC',
    borderRadius: 12,
    padding: 10,
  },
  gentleSuggestionText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    lineHeight: 17,
  },
  readingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  readingTile: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  readingTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  readingTileLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  readingTileValue: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  readingTileSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 3,
    lineHeight: 15,
  },
  teamUpdatesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  viewAllBtn: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  viewAllBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.primary,
  },
  teamUpdatesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 16,
  },
  teamUpdateRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  updateIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamUpdateTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  teamUpdateSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#EFECE6',
    marginVertical: 10,
  },
  miniJoinBtn: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FAF9F5',
    borderWidth: 1,
    borderColor: '#D8D4CC',
    justifyContent: 'center',
  },
  miniJoinBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  miniJoinBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  miniJoinBtnTextActive: {
    color: '#FFFFFF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 30, 27, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 385,
    backgroundColor: '#FAF8F3',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E5E1D8',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.0,
    color: colors.primaryGlow,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  closeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFECE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breathingCenterBox: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  breathingAuraOuter: {
    width: 148,
    height: 148,
    borderRadius: 74,
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
    fontWeight: '800',
    color: colors.textPrimary,
    marginVertical: 4,
  },
  breathSubHint: {
    fontSize: 12.5,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
  summaryBox: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  summaryHeadline: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 6,
  },
  summaryBody: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 48,
    backgroundColor: '#EFECE6',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  primaryBtn: {
    flex: 1.4,
    minHeight: 48,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  walkModalDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: 14,
  },
  walkQuickBtnsCol: {
    gap: 10,
    marginBottom: 14,
  },
  walkOptionBtn: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE5DC',
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  walkOptionText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  openMoveModalBtn: {
    minHeight: 48,
    backgroundColor: '#DFECE2',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openMoveModalBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.primary,
  },
  customizeLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  focusChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  focusChip: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    justifyContent: 'center',
  },
  focusChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  focusChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  focusChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  metricToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#EFECE6',
  },
  metricToggleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
});
