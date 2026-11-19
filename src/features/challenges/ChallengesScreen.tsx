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
import { ChallengeItem, CompanyRosterMember } from '../../types';
import { companyService } from '../../services/companyService';
import { Icon } from '../../components/common/Icon';
import {
  triggerHapticImpact,
  triggerHapticNotification,
  triggerHapticSelection,
} from '../../utils/haptics';

const SPRINT_CHALLENGES: ChallengeItem[] = [
  {
    id: 'chg-steps-bloom',
    title: 'Mindful Morning 10K Walk',
    subtitle: 'Sync 10,000 daily steps via Google Health Connect.',
    category: 'Steps',
    targetLabel: 'Daily Steps',
    targetValue: 10000,
    unit: 'steps',
    rewardPoints: 250,
    participantsCount: 42,
    daysRemaining: 5,
  },
  {
    id: 'chg-hydration-bloom',
    title: 'Studio Hydration Ritual',
    subtitle: 'Reach 2,500 ml daily water intake during creative focus blocks.',
    category: 'Hydration',
    targetLabel: 'Daily Water',
    targetValue: 2500,
    unit: 'ml',
    rewardPoints: 180,
    participantsCount: 64,
    daysRemaining: 7,
  },
  {
    id: 'chg-sleep-bloom',
    title: 'Restorative Sleep & Readiness',
    subtitle: 'Maintain an 85%+ readiness score across the work week.',
    category: 'Recovery',
    targetLabel: 'Readiness Score',
    targetValue: 85,
    unit: '%',
    rewardPoints: 300,
    participantsCount: 38,
    daysRemaining: 4,
  },
];

function formatCountdown(totalSec: number): string {
  const safe = Math.max(0, totalSec);
  const days = Math.floor(safe / 86400);
  const hours = Math.floor((safe % 86400) / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return `${String(days).padStart(2, '0')}d : ${String(hours).padStart(2, '0')}h : ${String(
    mins
  ).padStart(2, '0')}m : ${String(secs).padStart(2, '0')}s`;
}

export const ChallengesScreen: React.FC = () => {
  const {
    employee,
    userProfile,
    companyRoster,
    forceSyncNow,
    metrics,
    directoryEmployees,
    walkingCompetition,
    setCompetitionScope,
    simulateCompetitionEnd,
    resetCompetitionTimer,
    joinedChallengeIds,
    toggleJoinChallenge,
    isSyncing,
  } = useWellness();

  const [winnerModalVisible, setWinnerModalVisible] = useState(false);
  const [hrResetModalVisible, setHrResetModalVisible] = useState(false);
  const [compTitleInput, setCompTitleInput] = useState(walkingCompetition.title);
  const [compHoursInput, setCompHoursInput] = useState('72');
  const [compPrizeInput, setCompPrizeInput] = useState(walkingCompetition.prizeBadge);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [liveSubscribedRoster, setLiveSubscribedRoster] = useState<CompanyRosterMember[]>(
    companyRoster,
  );
  const [lastRealtimePushIso, setLastRealtimePushIso] = useState<string>(
    new Date().toISOString(),
  );

  // UPGRADE #7: Direct Real-Time Company Leaderboard Subscription filtered by verified companyId
  useEffect(() => {
    setLiveSubscribedRoster(companyRoster);
  }, [companyRoster]);

  useEffect(() => {
    if (!userProfile?.companyId || userProfile.verificationStatus !== 'VERIFIED') {
      return;
    }
    const unsubscribe = companyService.subscribeToCompanyLeaderboard(
      userProfile.companyId,
      (updatedLeaderboard) => {
        setLiveSubscribedRoster(updatedLeaderboard);
        setLastRealtimePushIso(new Date().toISOString());
      },
    );
    return () => {
      unsubscribe();
    };
  }, [userProfile?.companyId, userProfile?.verificationStatus]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg((prev) => (prev === msg ? null : prev)), 3000);
  };

  // Real Verified Company Leaderboard filtered by userProfile.companyId
  const rankedList = useMemo(() => {
    const sourceRoster =
      liveSubscribedRoster.length > 0 ? liveSubscribedRoster : companyRoster;
    const verifiedMembers = sourceRoster.filter(
      (m) =>
        (!userProfile?.companyId || m.companyId === userProfile.companyId) &&
        m.verificationStatus === 'VERIFIED',
    );

    const mappedFromRoster = verifiedMembers.map((m) => ({
      id: m.uid,
      name: m.fullName,
      department: m.department,
      officeBranch: m.companyName,
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
      .map((item, idx, arr) => {
        const nextAbove = idx > 0 ? arr[idx - 1] : null;
        const deltaToOvertake = nextAbove
          ? Math.max(0, nextAbove.liveSteps - item.liveSteps + 1)
          : 0;
        return {
          ...item,
          rank: idx + 1,
          deltaToOvertake,
        };
      });
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
    showToast('New timed walking competition launched!');
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {toastMsg && (
          <View style={styles.toastBanner}>
            <Icon name="check" size={14} color={colors.primary} />
            <Text style={styles.toastText}>{toastMsg}</Text>
          </View>
        )}

        <Text style={styles.pageTitle}>Workspace challenges.</Text>
        <Text style={styles.pageSubtitle}>
          Real-time Redis O(log N) office step leaderboard & timed walking sprint.
        </Text>

        {/* 1. Office Scope Toggle: My Office vs All Company Offices */}
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
          >
            <Text
              style={[
                styles.scopeBtnText,
                walkingCompetition.officeScope === 'MY_OFFICE' &&
                  styles.scopeBtnTextActive,
              ]}
            >
              My Office ({employee.officeBranch.split('·')[0].trim()})
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
          >
            <Text
              style={[
                styles.scopeBtnText,
                walkingCompetition.officeScope === 'ALL_OFFICES' &&
                  styles.scopeBtnTextActive,
              ]}
            >
              All Company Offices ({directoryEmployees.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* 2. Active Competition Banner & Live Countdown Timer */}
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
              <Text style={styles.compStatusPillText}>
                {walkingCompetition.isEnded
                  ? 'COMPETITION COMPLETED'
                  : `ENDS IN ${formatCountdown(walkingCompetition.remainingSeconds)}`}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.hrConfigBtn}
              onPress={() => setHrResetModalVisible(true)}
            >
              <Text style={styles.hrConfigBtnText}>⚙ Timer Setup</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.compTitle}>{walkingCompetition.title}</Text>
          <Text style={styles.compPrizeText}>
            🎁 Prize: {walkingCompetition.prizeBadge}
          </Text>
          <Text style={styles.compLeaderText}>
            👑 Current #1 Leader: {leaderEntry?.name || 'No verified steps yet'} (
            {(leaderEntry?.liveSteps ?? 0).toLocaleString()} steps)
          </Text>

          {walkingCompetition.isEnded && walkingCompetition.winnerEmployeeName && (
            <View style={styles.declaredWinnerBanner}>
              <Icon name="crown" size={16} color="#9A6B1F" />
              <Text style={styles.declaredWinnerText}>
                OFFICIAL WINNER: {walkingCompetition.winnerEmployeeName} (
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
                showToast('Synced real Hardware Pedometer & Health Store steps to Company Leaderboard.');
              }}
            >
              <Icon name="refresh" size={13} color="#FFFFFF" />
              <Text style={styles.syncMyStepsBtnText}>
                {isSyncing ? 'Syncing...' : 'Force Sync Real Steps'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.simulateEndBtn}
              onPress={handleSimulateEnd}
            >
              <Text style={styles.simulateEndBtnText}>Simulate Competition End 🏆</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* 3. Visual Top-3 Podium (#1 Gold Crown, #2 Silver, #3 Bronze) */}
        <View style={styles.podiumCard}>
          <Text style={styles.sectionHeaderLabel}>TOP 3 WALKING PODIUM</Text>
          <View style={styles.podiumRow}>
            {/* #2 Silver */}
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
                  <Text style={styles.podiumRankBadgeText}>#2 Silver</Text>
                </View>
                <Text style={styles.podiumName} numberOfLines={1}>
                  {topThree[1].name}
                </Text>
                <Text style={styles.podiumSteps}>
                  {topThree[1].liveSteps.toLocaleString()}
                </Text>
              </View>
            )}

            {/* #1 Gold Crown */}
            {topThree[0] && (
              <View style={[styles.podiumColumn, styles.podiumColumnGold]}>
                <Text style={styles.crownEmoji}>👑</Text>
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
                    #1 Gold
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

            {/* #3 Bronze */}
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
                  <Text style={styles.podiumRankBadgeText}>#3 Bronze</Text>
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

        {/* 4. Your Rank & Overtake Delta Banner */}
        {currentUserEntry && (
          <View style={styles.yourRankCard}>
            <View>
              <Text style={styles.yourRankLabel}>YOUR LIVE RANKING</Text>
              <Text style={styles.yourRankMain}>
                Rank #{currentUserEntry.rank} ·{' '}
                {currentUserEntry.liveSteps.toLocaleString()} steps
              </Text>
              <Text style={styles.yourRankDelta}>
                {currentUserEntry.rank === 1
                  ? 'You are in 1st place! Keep walking to defend the crown.'
                  : `${currentUserEntry.deltaToOvertake.toLocaleString()} steps needed to overtake Rank #${
                      currentUserEntry.rank - 1
                    }`}
              </Text>
            </View>
          </View>
        )}

        {/* 5. Full Ranked Employee List (Real-Time Company Leaderboard Subscription) */}
        <View style={styles.listCard}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <Text style={styles.sectionHeaderLabel}>
              LIVE COMPANY STEP RANKINGS ({userProfile?.companyName || 'VERIFIED ROSTER'})
            </Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>
              🟢 LIVE DB SUB
            </Text>
          </View>
          <Text
            style={{
              fontSize: 10,
              color: colors.textSecondary,
              marginBottom: 10,
            }}
          >
            Filtered by Company ID: {userProfile?.companyId || 'N/A'} · Last Realtime Sync:{' '}
            {new Date(lastRealtimePushIso).toLocaleTimeString()}
          </Text>
          {rankedList.map((row) => {
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
                    {row.name} {isMe ? '(You)' : ''}
                  </Text>
                  <Text style={styles.rankDept}>
                    {row.department} · {row.distanceKm} km · {row.activeCalories} kcal ·{' '}
                    {row.rank === 1
                      ? 'Leading sprint'
                      : `${row.deltaToOvertake.toLocaleString()} behind #${row.rank - 1}`}
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
          })}
        </View>

        {/* 6. Enrollable Wellness Challenges (Updates Profile `challenges joined`) */}
        <View style={styles.listCard}>
          <Text style={styles.sectionHeaderLabel}>
            STUDIO WELLBEING CHALLENGES ({joinedChallengeIds.length} JOINED)
          </Text>
          {SPRINT_CHALLENGES.map((chg) => {
            const joined = joinedChallengeIds.includes(chg.id);
            return (
              <View key={chg.id} style={styles.challengeItemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.challengeItemTitle}>{chg.title}</Text>
                  <Text style={styles.challengeItemSub}>{chg.subtitle}</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.joinChallengeBtn,
                    joined && styles.joinChallengeBtnActive,
                  ]}
                  onPress={async () => {
                    await triggerHapticSelection();
                    toggleJoinChallenge(chg.id);
                    showToast(
                      joined
                        ? `Left ${chg.title}`
                        : `Joined ${chg.title}! Profile counter updated.`
                    );
                  }}
                >
                  <Text
                    style={[
                      styles.joinChallengeBtnText,
                      joined && styles.joinChallengeBtnTextActive,
                    ]}
                  >
                    {joined ? 'Joined ✓' : 'Join Challenge'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Winner Celebration Modal */}
      <Modal
        visible={winnerModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setWinnerModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.confettiBanner}>🎉 🏆 🌿 ✨</Text>
            <Text style={styles.winnerModalEyebrow}>
              OFFICIAL WALKING COMPETITION WINNER
            </Text>
            <Text style={styles.winnerModalTitle}>
              {walkingCompetition.winnerEmployeeName || leaderEntry?.name}
            </Text>
            <Text style={styles.winnerModalSub}>
              Crowned #1 with{' '}
              {(
                walkingCompetition.winnerSteps ||
                leaderEntry?.liveSteps ||
                0
              ).toLocaleString()}{' '}
              verified Google Health Connect steps!
            </Text>
            <View style={styles.prizePillBox}>
              <Text style={styles.prizePillText}>
                Awarded: {walkingCompetition.prizeBadge}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={() => setWinnerModalVisible(false)}
            >
              <Text style={styles.modalPrimaryBtnText}>Celebrate & Continue →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* HR Competition Timer Reset Modal */}
      <Modal
        visible={hrResetModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setHrResetModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.winnerModalEyebrow}>HR COMPETITION TIMER CONTROLS</Text>
            <Text style={[styles.winnerModalTitle, { fontSize: 18 }]}>
              Configure Walking Competition
            </Text>

            <Text style={styles.fieldLabel}>COMPETITION TITLE</Text>
            <TextInput
              style={styles.input}
              value={compTitleInput}
              onChangeText={setCompTitleInput}
            />

            <Text style={styles.fieldLabel}>DURATION (HOURS)</Text>
            <TextInput
              style={styles.input}
              value={compHoursInput}
              onChangeText={setCompHoursInput}
              keyboardType="numeric"
            />

            <Text style={styles.fieldLabel}>WINNER PRIZE / BADGE</Text>
            <TextInput
              style={styles.input}
              value={compPrizeInput}
              onChangeText={setCompPrizeInput}
            />

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              <TouchableOpacity
                style={styles.modalSecondaryBtn}
                onPress={() => setHrResetModalVisible(false)}
              >
                <Text style={styles.modalSecondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalPrimaryBtn, { flex: 1, marginTop: 0 }]}
                onPress={handleResetTimer}
              >
                <Text style={styles.modalPrimaryBtnText}>Launch Timer</Text>
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
    paddingVertical: 9,
    borderRadius: 14,
    marginBottom: 10,
  },
  toastText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
    marginBottom: 14,
  },
  scopeToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#EFECE6',
    borderRadius: 14,
    padding: 3,
    marginBottom: 14,
  },
  scopeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 11,
    alignItems: 'center',
  },
  scopeBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  scopeBtnText: {
    fontSize: 11,
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
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  hrConfigBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  hrConfigBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  compTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  compPrizeText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
  },
  compLeaderText: {
    fontSize: 12,
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
    fontSize: 11,
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
    fontSize: 11,
    fontWeight: '700',
  },
  simulateEndBtn: {
    flex: 1,
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
    fontSize: 11,
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
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: colors.textMuted,
    marginBottom: 12,
  },
  podiumRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
  },
  podiumColumn: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  podiumColumnGold: {
    backgroundColor: '#FAF6EB',
    borderRadius: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#EFE2BA',
  },
  crownEmoji: {
    fontSize: 16,
    marginBottom: 2,
  },
  podiumAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  podiumAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  goldBadge: {
    backgroundColor: '#F5E4B8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginBottom: 4,
  },
  silverBadge: {
    backgroundColor: '#E5E8EC',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginBottom: 4,
  },
  bronzeBadge: {
    backgroundColor: '#EFE0D1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginBottom: 4,
  },
  podiumRankBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  podiumName: {
    fontSize: 11,
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
    backgroundColor: '#F5EBE1',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5D5C5',
    marginBottom: 14,
  },
  yourRankLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#7A5C43',
  },
  yourRankMain: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  yourRankDelta: {
    fontSize: 11,
    color: '#634B36',
    marginTop: 2,
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 14,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    marginBottom: 6,
    backgroundColor: '#FAF9F5',
    gap: 10,
  },
  rankRowHighlight: {
    backgroundColor: '#EBF3EC',
    borderWidth: 1,
    borderColor: '#CBE0CF',
  },
  rankNumber: {
    width: 26,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  rankAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.sandAvatarBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankAvatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.sandAvatarText,
  },
  rankName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  rankDept: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rankStepsValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  rankStepsUnit: {
    fontSize: 9,
    color: colors.textMuted,
  },
  challengeItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F2EFE9',
    gap: 10,
  },
  challengeItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  challengeItemSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  joinChallengeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#EFECE6',
  },
  joinChallengeBtnActive: {
    backgroundColor: colors.primary,
  },
  joinChallengeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  joinChallengeBtnTextActive: {
    color: '#FFFFFF',
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
    maxWidth: 380,
    backgroundColor: colors.background,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  confettiBanner: {
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 8,
  },
  winnerModalEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: colors.primaryGlow,
    textAlign: 'center',
  },
  winnerModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 4,
  },
  winnerModalSub: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  prizePillBox: {
    backgroundColor: '#FBF3DC',
    borderWidth: 1,
    borderColor: '#E5CE8B',
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
    alignItems: 'center',
  },
  prizePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#69490F',
  },
  modalPrimaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 14,
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  modalSecondaryBtn: {
    backgroundColor: '#EFECE6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
    alignItems: 'center',
  },
  modalSecondaryBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 10,
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
});
