import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useWellness } from '../../context/WellnessContext';
import { colors } from '../../theme/colors';
import { companyService } from '../../services/companyService';
import { Icon } from '../../components/common/Icon';
import {
  triggerHapticImpact,
  triggerHapticNotification,
  triggerHapticSelection,
} from '../../utils/haptics';

const SPRINT_CHALLENGES = [
  {
    id: 'chg-steps-bloom',
    title: 'Mindful Morning Walk',
    subtitle: 'Walk at your own pace toward your daily step goal.',
    category: 'Steps',
    targetLabel: 'Goal: Daily Step Target',
    targetValue: 8000,
    unit: 'steps',
  },
  {
    id: 'chg-hydration-bloom',
    title: 'Daily Hydration Habit',
    subtitle: 'Reach 2,500 ml of water across your workday.',
    category: 'Hydration',
    targetLabel: 'Goal: 2,500 ml / day',
    targetValue: 2500,
    unit: 'ml',
  },
  {
    id: 'chg-mindful-bloom',
    title: 'Mindful Pause Routine',
    subtitle: 'Take 6 minutes of guided breathing or screen breaks.',
    category: 'Mindfulness',
    targetLabel: 'Goal: 6 mindful mins',
    targetValue: 6,
    unit: 'mins',
  },
];

function formatDaysHoursLeft(totalSec) {
  const safe = Math.max(0, totalSec);
  const days = Math.floor(safe / 86400);
  const hours = Math.floor((safe % 86400) / 3600);
  return `${days}d ${hours}h remaining`;
}

export const ChallengesScreen = () => {
  const {
    employee,
    userProfile,
    companyRoster,
    forceSyncNow,
    metrics,
    hydration,
    mindfulMinutes,
    walkingCompetition,
    setCompetitionScope,
    simulateCompetitionEnd,
    resetCompetitionTimer,
    joinedChallengeIds,
    customChallenges,
    createCustomChallenge,
    personalizationPrefs,
    updatePersonalizationPrefs,
    toggleJoinChallenge,
    isSyncing,
  } = useWellness();

  const [winnerModalVisible, setWinnerModalVisible] = useState(false);
  const [hrResetModalVisible, setHrResetModalVisible] = useState(false);
  const [createChallengeModalVisible, setCreateChallengeModalVisible] = useState(false);
  const [newChgTitle, setNewChgTitle] = useState('');
  const [newChgCategory, setNewChgCategory] = useState('Active Minutes');
  const [newChgTarget, setNewChgTarget] = useState('20');
  const [newChgDays, setNewChgDays] = useState('7');
  const [newChgScope, setNewChgScope] = useState('PRIVATE_SMALL_TEAM');
  const [compTitleInput, setCompTitleInput] = useState(walkingCompetition.title);
  const [compHoursInput, setCompHoursInput] = useState('72');
  const [compPrizeInput, setCompPrizeInput] = useState(walkingCompetition.prizeBadge);
  const [toastMsg, setToastMsg] = useState(null);
  const [liveSubscribedRoster, setLiveSubscribedRoster] = useState(companyRoster);

  useEffect(() => {
    setLiveSubscribedRoster(companyRoster);
  }, [companyRoster]);

  useEffect(() => {
    if (!userProfile?.companyId) {
      return;
    }
    const unsubscribe = companyService.subscribeToCompanyLeaderboard(
      userProfile.companyId,
      (updatedLeaderboard) => {
        setLiveSubscribedRoster(updatedLeaderboard);
      },
    );
    return () => {
      unsubscribe();
    };
  }, [userProfile?.companyId]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg((prev) => (prev === msg ? null : prev)), 3000);
  };

  const getChallengeProgress = (chg) => {
    if (chg.category === 'Steps') {
      const goal = metrics.steps.goal || chg.targetValue;
      const current = metrics.steps.current;
      const pct = Math.min(100, Math.round((current / Math.max(1, goal)) * 100));
      return {
        currentLabel: `${current.toLocaleString()} / ${goal.toLocaleString()} steps`,
        pct,
      };
    }
    if (chg.category === 'Hydration') {
      const goal = hydration.goalMl || chg.targetValue;
      const current = hydration.currentMl;
      const pct = Math.min(100, Math.round((current / Math.max(1, goal)) * 100));
      return {
        currentLabel: `${current.toLocaleString()} / ${goal.toLocaleString()} ml`,
        pct,
      };
    }
    if (chg.category === 'Active Minutes') {
      const goal = chg.targetValue || 20;
      const current =
        (metrics.steps.activeMinutes || Math.round(metrics.steps.current / 100)) +
        mindfulMinutes;
      const pct = Math.min(100, Math.round((current / Math.max(1, goal)) * 100));
      return {
        currentLabel: `${current} / ${goal} active mins`,
        pct,
      };
    }
    const goal = chg.targetValue;
    const current = mindfulMinutes;
    const pct = Math.min(100, Math.round((current / Math.max(1, goal)) * 100));
    return {
      currentLabel: `${current} / ${goal} mindful mins`,
      pct,
    };
  };

  const rankedList = useMemo(() => {
    const sourceRoster =
      liveSubscribedRoster.length > 0 ? liveSubscribedRoster : companyRoster;
    const companyMembers = sourceRoster.filter(
      (m) => !userProfile?.companyId || m.companyId === userProfile.companyId,
    );

    const mappedFromRoster = companyMembers.map((m) => ({
      id: m.uid,
      name: m.fullName || 'Team Member',
      department: m.department,
      officeBranch: m.companyName,
      verificationStatus: m.verificationStatus,
      liveSteps: m.uid === userProfile?.uid ? metrics.steps.current : m.todaySteps,
      activeCalories:
        m.uid === userProfile?.uid
          ? metrics.activeCalories.burnedKcal
          : m.activeCalories,
      distanceKm:
        m.uid === userProfile?.uid ? metrics.steps.distanceKm : m.distanceKm,
    }));

    return mappedFromRoster
      .sort((a, b) => b.liveSteps - a.liveSteps)
      .map((item, idx) => ({
        ...item,
        rank: idx + 1,
      }));
  }, [
    companyRoster,
    liveSubscribedRoster,
    metrics.activeCalories.burnedKcal,
    metrics.steps.current,
    metrics.steps.distanceKm,
    userProfile?.companyId,
    userProfile?.uid,
  ]);

  const currentUserEntry =
    rankedList.find((r) => r.id === employee.id) || rankedList[0];
  const topThree = rankedList.slice(0, 3);
  const leaderEntry = rankedList[0];
  const timeLeftLabel = walkingCompetition.isEnded
    ? 'Challenge ended'
    : formatDaysHoursLeft(walkingCompetition.remainingSeconds);

  const handleSimulateEnd = async () => {
    await triggerHapticNotification();
    simulateCompetitionEnd();
    setWinnerModalVisible(true);
  };

  const handleResetTimer = async () => {
    await triggerHapticNotification();
    const hrs = parseInt(compHoursInput, 10) || 48;
    resetCompetitionTimer(compTitleInput, hrs, compPrizeInput);
    setHrResetModalVisible(false);
    showToast('Updated team walking challenge.');
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {toastMsg && (
          <View style={styles.toastBanner} accessibilityRole="alert">
            <Icon name="check" size={14} color={colors.primary} />
            <Text style={styles.toastText}>{toastMsg}</Text>
          </View>
        )}

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            marginBottom: 10,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>Challenges</Text>
            <Text style={[styles.pageSubtitle, { marginBottom: 0 }]}>
              Inclusive movement, active-minute, and mindful challenges.
            </Text>
          </View>
          <TouchableOpacity
            style={{
              minHeight: 48,
              backgroundColor: colors.primary,
              paddingHorizontal: 14,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={() => setCreateChallengeModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Create a private small-team or custom challenge"
          >
            <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' }}>
              + Create
            </Text>
          </TouchableOpacity>
        </View>

        {/* Keep Personal Progress Private Toggle */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 18,
            padding: 14,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
            marginBottom: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.textPrimary }}>
              {personalizationPrefs?.keepChallengeProgressPrivate
                ? '🔒 Personal Progress Is Private'
                : 'Share Progress on Team Board'}
            </Text>
            <Text style={{ fontSize: 11.5, color: colors.textSecondary, marginTop: 2 }}>
              {personalizationPrefs?.keepChallengeProgressPrivate
                ? 'Your individual numbers are hidden from rankings while you still earn challenge badges.'
                : 'Tap to hide your personal step count from the workspace leaderboard.'}
            </Text>
          </View>
          <TouchableOpacity
            style={{
              minHeight: 42,
              paddingHorizontal: 12,
              borderRadius: 10,
              backgroundColor: personalizationPrefs?.keepChallengeProgressPrivate
                ? '#EBF3EC'
                : '#EFECE6',
              justifyContent: 'center',
            }}
            onPress={() => {
              const nextPriv = !personalizationPrefs?.keepChallengeProgressPrivate;
              updatePersonalizationPrefs({
                keepChallengeProgressPrivate: nextPriv,
                showLeaderboardRankings: !nextPriv,
              });
              showToast(
                nextPriv
                  ? 'Your challenge progress is now private.'
                  : 'Your progress is visible on the team board.',
              );
            }}
            accessibilityRole="button"
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
              {personalizationPrefs?.keepChallengeProgressPrivate
                ? 'Private ✓'
                : 'Make Private'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Shared Cooperative Small-Team Goal (Non-Competitive) */}
        <View
          style={{
            backgroundColor: '#EBF3EC',
            borderRadius: 20,
            padding: 16,
            borderWidth: 1,
            borderColor: '#CBE0CF',
            marginBottom: 14,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: '800',
              color: colors.primary,
              letterSpacing: 0.8,
            }}
          >
            COOPERATIVE SHARED TEAM GOAL · NO INDIVIDUAL RANKING
          </Text>
          <Text
            style={{
              fontSize: 16.5,
              fontWeight: '700',
              color: colors.textPrimary,
              marginTop: 3,
            }}
          >
            120 Collective Active &amp; Mindful Minutes
          </Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
            Everyone contributes walking, stretching, or breathing minutes to one shared team
            milestone—no individual comparisons.
          </Text>
          {(() => {
            const myMins =
              (metrics.steps.activeMinutes || Math.round(metrics.steps.current / 100)) +
              mindfulMinutes;
            const sharedTotal = Math.min(120, 64 + myMins);
            const pct = Math.min(100, Math.round((sharedTotal / 120) * 100));
            return (
              <View style={{ marginTop: 10 }}>
                <View style={styles.progressLabelsRow}>
                  <Text style={styles.progressCurrentText}>
                    Shared Team Progress: {sharedTotal} / 120 mins (Your contribution: {myMins}m)
                  </Text>
                  <Text style={styles.progressPctText}>{pct}%</Text>
                </View>
                <View style={styles.progressBarTrack}>
                  <View style={[styles.progressBarFill, { width: `${Math.max(6, pct)}%` }]} />
                </View>
              </View>
            );
          })()}
        </View>

        {/* 1. Clear Opt-In Personal & Small-Team Challenges with Goal, Progress, Time Remaining, and Join/Leave */}
        <View style={styles.listCard}>
          <Text style={styles.sectionHeaderLabel}>
            PERSONAL &amp; SMALL-TEAM CHALLENGES ({joinedChallengeIds.length} JOINED)
          </Text>
          {[...(customChallenges || []), ...SPRINT_CHALLENGES].map((chg) => {
            const joined = joinedChallengeIds.includes(chg.id);
            const prog = getChallengeProgress(chg);
            return (
              <View key={chg.id} style={styles.challengeCardItem}>
                <View style={styles.challengeTopMetaRow}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>
                      {chg.category}
                      {chg.scope === 'PRIVATE_SMALL_TEAM' ? ' · Private Team' : ''}
                    </Text>
                  </View>
                  <Text style={styles.timeLeftMetaText}>
                    {chg.durationDays ? `${chg.durationDays}d duration · ` : ''}
                    {timeLeftLabel}
                  </Text>
                </View>

                <Text style={styles.challengeItemTitle}>{chg.title}</Text>
                <Text style={styles.challengeItemSub}>{chg.subtitle}</Text>
                {chg.rules && (
                  <Text
                    style={{
                      fontSize: 11.5,
                      color: colors.primary,
                      marginTop: 3,
                      fontWeight: '600',
                    }}
                  >
                    Rules: {chg.rules}
                  </Text>
                )}

                {/* Progress Bar & Goal Details */}
                <View style={styles.progressSection}>
                  <View style={styles.progressLabelsRow}>
                    <Text style={styles.progressCurrentText}>
                      Progress: {prog.currentLabel}
                    </Text>
                    <Text style={styles.progressPctText}>{prog.pct}%</Text>
                  </View>
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${Math.max(4, prog.pct)}%` },
                      ]}
                    />
                  </View>
                </View>

                <View style={styles.challengeActionRow}>
                  <Text style={styles.membershipStateText}>
                    {joined ? '✓ You are participating' : 'Optional · Not joined'}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.joinChallengeBtn,
                      joined && styles.leaveChallengeBtn,
                    ]}
                    onPress={async () => {
                      await triggerHapticSelection();
                      toggleJoinChallenge(chg.id);
                      showToast(
                        joined
                          ? `Left ${chg.title}. You can rejoin anytime.`
                          : `Joined ${chg.title}! Move at your own pace.`,
                      );
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={
                      joined ? `Leave ${chg.title}` : `Join ${chg.title}`
                    }
                  >
                    <Text
                      style={[
                        styles.joinChallengeBtnText,
                        joined && styles.leaveChallengeBtnText,
                      ]}
                    >
                      {joined ? 'Leave Challenge' : 'Join Challenge'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* 2. Team Walking Sprint Card */}
        <LinearGradient
          colors={['#DFECE2', '#E8F2EA', '#F2F7F3']}
          style={styles.competitionBanner}
        >
          <View style={styles.compTopRow}>
            <View style={styles.compStatusPill}>
              <View
                style={[
                  styles.livePulseDot,
                  walkingCompetition.isEnded && { backgroundColor: colors.warning },
                ]}
              />
              <Text style={styles.compStatusPillText}>{timeLeftLabel}</Text>
            </View>

            <TouchableOpacity
              style={styles.hrConfigBtn}
              onPress={() => setHrResetModalVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Configure walking challenge timer"
            >
              <Text style={styles.hrConfigBtnText}>Edit Sprint</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.compTitle}>{walkingCompetition.title}</Text>
          <Text style={styles.compPrizeText}>
            Goal: Team step activity · Recognition: {walkingCompetition.prizeBadge}
          </Text>
          <Text style={styles.compLeaderText}>
            Current Pacesetter: {leaderEntry?.name || 'No steps logged yet'} (
            {(leaderEntry?.liveSteps ?? 0).toLocaleString()} steps)
          </Text>

          {walkingCompetition.isEnded && walkingCompetition.winnerEmployeeName && (
            <View style={styles.declaredWinnerBanner}>
              <Icon name="crown" size={16} color="#9A6B1F" />
              <Text style={styles.declaredWinnerText}>
                Sprint Pacesetter: {walkingCompetition.winnerEmployeeName} (
                {walkingCompetition.winnerSteps?.toLocaleString()} steps)
              </Text>
            </View>
          )}

          <View style={styles.compButtonsRow}>
            <TouchableOpacity
              style={styles.syncMyStepsBtn}
              onPress={async () => {
                await triggerHapticImpact();
                await forceSyncNow();
                showToast('Updated your steps on the local team board.');
              }}
              accessibilityRole="button"
              accessibilityLabel="Refresh my steps on the team board"
            >
              <Icon name="refresh" size={14} color="#FFFFFF" />
              <Text style={styles.syncMyStepsBtnText}>
                {isSyncing ? 'Updating...' : 'Refresh My Steps'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.simulateEndBtn}
              onPress={handleSimulateEnd}
              accessibilityRole="button"
              accessibilityLabel="Preview challenge completion summary"
            >
              <Text style={styles.simulateEndBtnText}>Preview Summary</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* 3. Office Scope Toggle */}
        <View style={styles.scopeToggleRow}>
          <TouchableOpacity
            style={[
              styles.scopeBtn,
              walkingCompetition.officeScope === 'MY_OFFICE' && styles.scopeBtnActive,
            ]}
            onPress={async () => {
              await triggerHapticSelection();
              setCompetitionScope('MY_OFFICE');
            }}
            accessibilityRole="button"
          >
            <Text
              style={[
                styles.scopeBtnText,
                walkingCompetition.officeScope === 'MY_OFFICE' &&
                  styles.scopeBtnTextActive,
              ]}
            >
              My Workspace ({(employee.officeBranch || 'Team').split('·')[0].trim()})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.scopeBtn,
              walkingCompetition.officeScope === 'ALL_OFFICES' && styles.scopeBtnActive,
            ]}
            onPress={async () => {
              await triggerHapticSelection();
              setCompetitionScope('ALL_OFFICES');
            }}
            accessibilityRole="button"
          >
            <Text
              style={[
                styles.scopeBtnText,
                walkingCompetition.officeScope === 'ALL_OFFICES' &&
                  styles.scopeBtnTextActive,
              ]}
            >
              All Offices
            </Text>
          </TouchableOpacity>
        </View>

        {/* 4. Top-3 Podium */}
        {topThree.length > 0 && (
          <View style={styles.podiumCard}>
            <Text style={styles.sectionHeaderLabel}>TEAM STEP HIGHLIGHTS</Text>
            <View style={styles.podiumRow}>
              {topThree[1] && (
                <View style={[styles.podiumColumn, { marginTop: 18 }]}>
                  <View style={[styles.podiumAvatar, { backgroundColor: '#E5E8EC' }]}>
                    <Text style={styles.podiumAvatarText}>
                      {topThree[1].name
                        .split(' ')
                        .map((p) => p[0])
                        .join('')}
                    </Text>
                  </View>
                  <View style={styles.silverBadge}>
                    <Text style={styles.podiumRankBadgeText}>#2</Text>
                  </View>
                  <Text style={styles.podiumName} numberOfLines={1}>
                    {topThree[1].name}
                  </Text>
                  <Text style={styles.podiumSteps}>
                    {topThree[1].liveSteps.toLocaleString()}
                  </Text>
                </View>
              )}

              {topThree[0] && (
                <View style={[styles.podiumColumn, styles.podiumColumnGold]}>
                  <View
                    style={[
                      styles.podiumAvatar,
                      {
                        width: 52,
                        height: 52,
                        borderRadius: 26,
                        backgroundColor: '#F6E3B4',
                        borderWidth: 2,
                        borderColor: '#D4A843',
                      },
                    ]}
                  >
                    <Text style={[styles.podiumAvatarText, { color: '#5E4310' }]}>
                      {topThree[0].name
                        .split(' ')
                        .map((p) => p[0])
                        .join('')}
                    </Text>
                  </View>
                  <View style={styles.goldBadge}>
                    <Text style={[styles.podiumRankBadgeText, { color: '#69490F' }]}>
                      #1
                    </Text>
                  </View>
                  <Text style={styles.podiumName} numberOfLines={1}>
                    {topThree[0].name}
                  </Text>
                  <Text style={[styles.podiumSteps, { color: colors.primary }]}>
                    {topThree[0].liveSteps.toLocaleString()}
                  </Text>
                </View>
              )}

              {topThree[2] && (
                <View style={[styles.podiumColumn, { marginTop: 24 }]}>
                  <View style={[styles.podiumAvatar, { backgroundColor: '#EFE0D1' }]}>
                    <Text style={styles.podiumAvatarText}>
                      {topThree[2].name
                        .split(' ')
                        .map((p) => p[0])
                        .join('')}
                    </Text>
                  </View>
                  <View style={styles.bronzeBadge}>
                    <Text style={styles.podiumRankBadgeText}>#3</Text>
                  </View>
                  <Text style={styles.podiumName} numberOfLines={1}>
                    {topThree[2].name}
                  </Text>
                  <Text style={styles.podiumSteps}>
                    {topThree[2].liveSteps.toLocaleString()}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* 5. Supportive Personal Progress Banner */}
        {currentUserEntry && (
          <View style={styles.yourRankCard}>
            <Text style={styles.yourRankLabel}>YOUR DAILY STEP PROGRESS</Text>
            <Text style={styles.yourRankMain}>
              {currentUserEntry.liveSteps.toLocaleString()} /{' '}
              {metrics.steps.goal.toLocaleString()} steps ({metrics.steps.percentage}%)
            </Text>
            <Text style={styles.yourRankDelta}>
              Every walk or stretch adds up — move at a pace that feels comfortable for you.
            </Text>
          </View>
        )}

        {/* 6. Workspace Roster List */}
        <View style={styles.listCard}>
          <Text style={styles.sectionHeaderLabel}>
            WORKSPACE PARTICIPANTS ({userProfile?.companyName || 'LOCAL WORKSPACE'})
          </Text>
          {rankedList.length === 0 ? (
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>
              No participants in this workspace yet.
            </Text>
          ) : (
            rankedList.map((row) => {
              const isMe = row.id === employee.id;
              return (
                <View
                  key={row.id}
                  style={[styles.rankRow, isMe && styles.rankRowHighlight]}
                >
                  <Text style={[styles.rankNumber, isMe && { color: colors.primary }]}>
                    #{row.rank}
                  </Text>
                  <View style={styles.rankAvatar}>
                    <Text style={styles.rankAvatarText}>
                      {row.name
                        .split(' ')
                        .map((p) => p[0])
                        .join('')}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rankName}>
                      {row.name} {isMe ? '(You)' : '· Demo'}
                    </Text>
                    <Text style={styles.rankDept}>
                      {row.department} · {row.distanceKm} km · {row.activeCalories} kcal
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.rankStepsValue}>
                      {row.liveSteps.toLocaleString()}
                    </Text>
                    <Text style={styles.rankStepsUnit}>steps</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Celebration Modal */}
      <Modal
        visible={winnerModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setWinnerModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.winnerModalEyebrow}>TEAM WALKING SPRINT SUMMARY</Text>
            <Text style={styles.winnerModalTitle}>
              {walkingCompetition.winnerEmployeeName || leaderEntry?.name || 'Great Effort!'}
            </Text>
            <Text style={styles.winnerModalSub}>
              Completed with{' '}
              {(
                walkingCompetition.winnerSteps ||
                leaderEntry?.liveSteps ||
                0
              ).toLocaleString()}{' '}
              steps logged!
            </Text>
            <View style={styles.prizePillBox}>
              <Text style={styles.prizePillText}>
                Recognition: {walkingCompetition.prizeBadge}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={() => setWinnerModalVisible(false)}
              accessibilityRole="button"
            >
              <Text style={styles.modalPrimaryBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Walking Challenge Modal */}
      <Modal
        visible={hrResetModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setHrResetModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.winnerModalEyebrow}>TEAM SPRINT SETTINGS (LOCAL DEMO)</Text>
            <Text style={[styles.winnerModalTitle, { fontSize: 18 }]}>
              Edit Walking Challenge
            </Text>

            <Text style={styles.fieldLabel}>CHALLENGE TITLE</Text>
            <TextInput
              style={styles.input}
              value={compTitleInput}
              onChangeText={setCompTitleInput}
              accessibilityLabel="Challenge title"
            />

            <Text style={styles.fieldLabel}>DURATION (HOURS)</Text>
            <TextInput
              style={styles.input}
              value={compHoursInput}
              onChangeText={setCompHoursInput}
              keyboardType="numeric"
              accessibilityLabel="Duration in hours"
            />

            <Text style={styles.fieldLabel}>RECOGNITION BADGE</Text>
            <TextInput
              style={styles.input}
              value={compPrizeInput}
              onChangeText={setCompPrizeInput}
              accessibilityLabel="Badge name"
            />

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              <TouchableOpacity
                style={styles.modalSecondaryBtn}
                onPress={() => setHrResetModalVisible(false)}
                accessibilityRole="button"
              >
                <Text style={styles.modalSecondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalPrimaryBtn, { flex: 1, marginTop: 0 }]}
                onPress={handleResetTimer}
                accessibilityRole="button"
              >
                <Text style={styles.modalPrimaryBtnText}>Save Sprint</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Employee / Small-Team Challenge Modal */}
      <Modal
        visible={createChallengeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateChallengeModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.winnerModalEyebrow}>EMPLOYEE-CREATED CHALLENGE</Text>
            <Text style={[styles.winnerModalTitle, { fontSize: 18 }]}>
              Create Private or Team Challenge
            </Text>

            <Text style={styles.fieldLabel}>CHALLENGE TITLE</Text>
            <TextInput
              style={styles.input}
              value={newChgTitle}
              onChangeText={setNewChgTitle}
              placeholder="e.g., Design Team Afternoon Stretch"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="New challenge title"
            />

            <Text style={styles.fieldLabel}>WELLNESS METRIC</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {['Active Minutes', 'Mindfulness', 'Hydration', 'Steps'].map((cat) => {
                const active = newChgCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={{
                      minHeight: 40,
                      paddingHorizontal: 12,
                      borderRadius: 999,
                      backgroundColor: active ? colors.primary : '#FAF9F5',
                      borderWidth: 1,
                      borderColor: active ? colors.primary : colors.surfaceBorder,
                      justifyContent: 'center',
                    }}
                    onPress={() => {
                      setNewChgCategory(cat);
                      setNewChgTarget(
                        cat === 'Steps'
                          ? '6000'
                          : cat === 'Hydration'
                          ? '2000'
                          : cat === 'Active Minutes'
                          ? '20'
                          : '5',
                      );
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: active ? '#FFFFFF' : colors.textSecondary,
                      }}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>DAILY GOAL TARGET</Text>
                <TextInput
                  style={styles.input}
                  value={newChgTarget}
                  onChangeText={setNewChgTarget}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>DURATION (DAYS)</Text>
                <TextInput
                  style={styles.input}
                  value={newChgDays}
                  onChangeText={setNewChgDays}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>VISIBILITY SCOPE</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                { key: 'PRIVATE_SMALL_TEAM', label: 'Private Small-Team' },
                { key: 'SHARED_TEAM', label: 'Workspace Shared' },
              ].map((sc) => {
                const active = newChgScope === sc.key;
                return (
                  <TouchableOpacity
                    key={sc.key}
                    style={{
                      flex: 1,
                      minHeight: 42,
                      borderRadius: 10,
                      backgroundColor: active ? '#DFECE2' : '#FAF9F5',
                      borderWidth: 1,
                      borderColor: active ? colors.primary : colors.surfaceBorder,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onPress={() => setNewChgScope(sc.key)}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: active ? colors.primary : colors.textSecondary,
                      }}
                    >
                      {sc.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              <TouchableOpacity
                style={styles.modalSecondaryBtn}
                onPress={() => setCreateChallengeModalVisible(false)}
                accessibilityRole="button"
              >
                <Text style={styles.modalSecondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalPrimaryBtn, { flex: 1, marginTop: 0 }]}
                onPress={async () => {
                  const res = createCustomChallenge({
                    title: newChgTitle,
                    category: newChgCategory,
                    targetValue: Number(newChgTarget),
                    durationDays: Number(newChgDays),
                    scope: newChgScope,
                  });
                  if (!res.ok) {
                    showToast(res.error);
                    return;
                  }
                  await triggerHapticNotification();
                  setNewChgTitle('');
                  setCreateChallengeModalVisible(false);
                  showToast('Created and joined your new challenge!');
                }}
                accessibilityRole="button"
              >
                <Text style={styles.modalPrimaryBtnText}>Create Challenge</Text>
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
  content: {
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
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 10,
  },
  toastText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.primary,
  },
  pageTitle: {
    fontSize: 25,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 3,
    marginBottom: 14,
    lineHeight: 18,
  },
  scopeToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#EFECE6',
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
  },
  scopeBtn: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 8,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  scopeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  scopeBtnTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  competitionBanner: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#CBE0CF',
    marginBottom: 16,
  },
  compTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  compStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  compStatusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  hrConfigBtn: {
    minHeight: 40,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    justifyContent: 'center',
  },
  hrConfigBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  compTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  compPrizeText: {
    fontSize: 12.5,
    color: colors.textSecondary,
    marginTop: 3,
  },
  compLeaderText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 5,
  },
  declaredWinnerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FBF3DC',
    borderWidth: 1,
    borderColor: '#E5CE8B',
    padding: 10,
    borderRadius: 12,
    marginTop: 10,
  },
  declaredWinnerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#69490F',
    flex: 1,
  },
  compButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  syncMyStepsBtn: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 12,
  },
  syncMyStepsBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  simulateEndBtn: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.primaryGlow,
    paddingVertical: 10,
    borderRadius: 12,
  },
  simulateEndBtnText: {
    color: colors.primary,
    fontSize: 12.5,
    fontWeight: '700',
  },
  podiumCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 14,
  },
  sectionHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#5C645E',
    marginBottom: 12,
  },
  podiumRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
  },
  podiumColumn: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 4,
  },
  podiumColumnGold: {
    marginBottom: 6,
  },
  podiumAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  goldBadge: {
    backgroundColor: '#F6E3B4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginTop: -8,
    marginBottom: 4,
  },
  silverBadge: {
    backgroundColor: '#E5E8EC',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginTop: -8,
    marginBottom: 4,
  },
  bronzeBadge: {
    backgroundColor: '#EFE0D1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginTop: -8,
    marginBottom: 4,
  },
  podiumRankBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  podiumName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  podiumSteps: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 2,
  },
  yourRankCard: {
    backgroundColor: '#EBF3EC',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#CBE0CF',
    marginBottom: 14,
  },
  yourRankLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.primary,
  },
  yourRankMain: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 3,
  },
  yourRankDelta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 17,
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 14,
  },
  challengeCardItem: {
    backgroundColor: '#FAF9F5',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ECE9E0',
    marginBottom: 12,
  },
  challengeTopMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryBadge: {
    backgroundColor: '#DFECE2',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  timeLeftMetaText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  challengeItemTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  challengeItemSub: {
    fontSize: 12.5,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 17,
  },
  progressSection: {
    marginTop: 10,
    marginBottom: 12,
  },
  progressLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  progressCurrentText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  progressPctText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primary,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#E5E1D8',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  challengeActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  membershipStateText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    flex: 1,
  },
  joinChallengeBtn: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveChallengeBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4CEC3',
  },
  joinChallengeBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  leaveChallengeBtnText: {
    color: colors.textPrimary,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F2EFE9',
    gap: 10,
  },
  rankRowHighlight: {
    backgroundColor: '#F4F8F4',
    borderRadius: 14,
    paddingHorizontal: 10,
    borderBottomWidth: 0,
    marginVertical: 2,
  },
  rankNumber: {
    width: 28,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  rankAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.sandAvatarBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankAvatarText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.sandAvatarText,
  },
  rankName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  rankDept: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 1,
  },
  rankStepsValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  rankStepsUnit: {
    fontSize: 10.5,
    color: colors.textMuted,
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
    maxWidth: 370,
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  winnerModalEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.9,
    color: colors.primary,
  },
  winnerModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 4,
  },
  winnerModalSub: {
    fontSize: 13.5,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 14,
  },
  prizePillBox: {
    backgroundColor: '#EBF3EC',
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  prizePillText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  fieldLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.7,
    marginTop: 10,
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#FAF9F5',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
    fontSize: 13,
    color: colors.textPrimary,
  },
  modalPrimaryBtn: {
    minHeight: 48,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalSecondaryBtn: {
    flex: 1,
    minHeight: 48,
    backgroundColor: '#EFECE6',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSecondaryBtnText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
});
