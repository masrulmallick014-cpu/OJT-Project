import React, { useState, useEffect } from 'react';
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
import { WellnessActivityCategory } from '../../types';
import { Icon, BloomingFlowerIllustration } from '../../components/common/Icon';
import {
  triggerHapticNotification,
  triggerHapticSelection,
} from '../../utils/haptics';

const FILTER_CATEGORIES: Array<'All' | WellnessActivityCategory> = [
  'All',
  'Yoga & Breath',
  'Outdoor Walk',
  'Ergonomics',
  'Mindfulness',
  'Team Sport',
];

export const MindfulScreen: React.FC = () => {
  const {
    employee,
    proposedActivities,
    selectedWinningActivity,
    proposeWellnessActivity,
    toggleVoteWellnessActivity,
    toggleJoinWellnessActivity,
    approveActivityByHr,
    mindfulMinutes,
    completeMindfulSession,
  } = useWellness();

  const [selectedCategory, setSelectedCategory] = useState<'All' | WellnessActivityCategory>(
    'All'
  );
  const [proposeModalVisible, setProposeModalVisible] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [timeInput, setTimeInput] = useState('Fri · 4:00 PM');
  const [locInput, setLocInput] = useState('Studio Rooftop Terrace');
  const [catInput, setCatInput] = useState<WellnessActivityCategory>('Yoga & Breath');

  // Interactive Breathing Session State
  const [isBreathing, setIsBreathing] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(120);
  const [phaseLabel, setPhaseLabel] = useState('Tap Start for 4-4-4 Box Breathing');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isBreathing) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsBreathing(false);
          completeMindfulSession(2);
          setPhaseLabel('Session Complete! +2 mindful mins');
          return 120;
        }
        const next = prev - 1;
        const step = (120 - next) % 12;
        if (step < 4) setPhaseLabel('Inhale deeply... (4s)');
        else if (step < 8) setPhaseLabel('Hold gently... (4s)');
        else setPhaseLabel('Exhale slowly... (4s)');
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isBreathing, completeMindfulSession]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg((prev) => (prev === msg ? null : prev)), 3000);
  };

  const sortedActivities = [...proposedActivities]
    .filter((a) => selectedCategory === 'All' || a.category === selectedCategory)
    .sort((a, b) => b.votesCount - a.votesCount);

  const handleCreateActivity = async () => {
    if (!titleInput.trim()) {
      showToast('Please enter a title for your wellness activity.');
      return;
    }
    await triggerHapticNotification();
    proposeWellnessActivity({
      title: titleInput,
      description: descInput,
      suggestedTime: timeInput,
      location: locInput,
      category: catInput,
    });
    setTitleInput('');
    setDescInput('');
    setProposeModalVisible(false);
    showToast('Activity posted to the live office poll!');
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

        <View style={styles.topHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>Find your calm.</Text>
            <Text style={styles.pageSubtitle}>
              Crowd-voted office wellness activities & guided breathing rituals.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.proposeBtn}
            onPress={async () => {
              await triggerHapticSelection();
              setProposeModalVisible(true);
            }}
          >
            <Icon name="plus" size={14} color="#FFFFFF" />
            <Text style={styles.proposeBtnText}>Propose Activity</Text>
          </TouchableOpacity>
        </View>

        {/* 1. Pinned #1 Winning Office Wellness Activity */}
        {selectedWinningActivity ? (
          <LinearGradient
            colors={['#DFECE2', '#EBF3EC']}
            style={styles.winnerHeroCard}
          >
            <View style={styles.winnerBadgeRow}>
              <View style={styles.winnerBadge}>
                <Text style={styles.winnerBadgeText}>
                  🏆 SELECTED OFFICE ACTIVITY (#1 HIGHEST VOTES)
                </Text>
              </View>
              <Text style={styles.winnerVoteCount}>
                {selectedWinningActivity.votesCount} votes
              </Text>
            </View>

            <Text style={styles.winnerTitle}>{selectedWinningActivity.title}</Text>
            <Text style={styles.winnerDesc}>{selectedWinningActivity.description}</Text>
            <Text style={styles.winnerMeta}>
              🗓 {selectedWinningActivity.suggestedTime} · 📍{' '}
              {selectedWinningActivity.location} · Proposed by{' '}
              {selectedWinningActivity.proposedByName}
            </Text>

            <View style={styles.winnerBtnRow}>
              <TouchableOpacity
                style={styles.joinWinnerBtn}
                onPress={async () => {
                  await triggerHapticNotification();
                  toggleJoinWellnessActivity(selectedWinningActivity.id);
                  showToast('Updated your calendar RSVP for the winning activity!');
                }}
              >
                <Icon name="calendar" size={14} color="#FFFFFF" />
                <Text style={styles.joinWinnerBtnText}>
                  {selectedWinningActivity.joinedUserIds.includes(employee.id)
                    ? `Going (${selectedWinningActivity.joinedUserIds.length} colleagues)`
                    : 'Add to Calendar / Join'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.hrApproveBtn}
                onPress={async () => {
                  await triggerHapticSelection();
                  approveActivityByHr(selectedWinningActivity.id);
                  showToast('Toggled HR Schedule Approval status.');
                }}
              >
                <Text style={styles.hrApproveBtnText}>
                  {selectedWinningActivity.hrApproved
                    ? '✓ HR Scheduled'
                    : 'HR Approve'}
                </Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        ) : (
          <View
            style={{
              backgroundColor: '#FFFFFF',
              padding: 16,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: '#EFECE6',
              marginBottom: 14,
            }}
          >
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              No activities have been proposed yet. Tap "Propose Activity" above to create the
              first office wellness activity poll.
            </Text>
          </View>
        )}

        {/* 2. Category Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsRow}
        >
          {FILTER_CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.filterPill, active && styles.filterPillActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    active && styles.filterPillTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 3. Full Crowd-Voted Activity Proposals List */}
        {sortedActivities.map((act, idx) => {
          const hasVoted = act.voterUserIds.includes(employee.id);
          const hasJoined = act.joinedUserIds.includes(employee.id);
          const isTopWinner = act.id === selectedWinningActivity.id;

          return (
            <View
              key={act.id}
              style={[
                styles.activityCard,
                isTopWinner && styles.activityCardWinnerBorder,
              ]}
            >
              <View style={{ flex: 1 }}>
                <View style={styles.activityTagRow}>
                  <Text style={styles.rankChip}>#{idx + 1}</Text>
                  <Text style={styles.catChip}>{act.category}</Text>
                  {isTopWinner && (
                    <Text style={styles.leadingTag}>🏆 Leading Poll</Text>
                  )}
                  {act.hrApproved && (
                    <Text style={styles.hrTag}>✓ HR Approved</Text>
                  )}
                </View>

                <Text style={styles.activityTitle}>{act.title}</Text>
                <Text style={styles.activityDesc}>{act.description}</Text>
                <Text style={styles.activityMeta}>
                  🗓 {act.suggestedTime} · 📍 {act.location} · By {act.proposedByName}
                </Text>

                <View style={styles.cardBottomActions}>
                  <TouchableOpacity
                    style={[styles.rsvpChip, hasJoined && styles.rsvpChipJoined]}
                    onPress={async () => {
                      await triggerHapticSelection();
                      toggleJoinWellnessActivity(act.id);
                    }}
                  >
                    <Text
                      style={[
                        styles.rsvpChipText,
                        hasJoined && styles.rsvpChipTextJoined,
                      ]}
                    >
                      {hasJoined
                        ? `✓ Joined (${act.joinedUserIds.length})`
                        : `+ Join (${act.joinedUserIds.length})`}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.voteColumnBtn, hasVoted && styles.voteColumnBtnActive]}
                onPress={async () => {
                  await triggerHapticSelection();
                  toggleVoteWellnessActivity(act.id);
                }}
              >
                <Text
                  style={[styles.voteArrow, hasVoted && styles.voteTextActive]}
                >
                  ▲
                </Text>
                <Text
                  style={[styles.voteNum, hasVoted && styles.voteTextActive]}
                >
                  {act.votesCount}
                </Text>
                <Text
                  style={[styles.voteSubLabel, hasVoted && styles.voteTextActive]}
                >
                  {hasVoted ? 'Voted' : 'Vote'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* 4. Interactive Guided Breathing Flower Card */}
        <View style={styles.breathingCard}>
          <Text style={styles.sectionEyebrow}>
            DAILY PAUSE · {mindfulMinutes} MINDFUL MINUTES LOGGED
          </Text>
          <Text style={styles.breathingCardTitle}>2-Minute Guided Box Breathing</Text>
          <View style={styles.flowerWrap}>
            <BloomingFlowerIllustration size={126} />
          </View>
          <Text style={styles.phaseText}>{phaseLabel}</Text>
          <Text style={styles.timerDigits}>
            {Math.floor(secondsLeft / 60)}:
            {String(secondsLeft % 60).padStart(2, '0')}
          </Text>

          <View style={styles.breathingBtnsRow}>
            <TouchableOpacity
              style={styles.breathStartBtn}
              onPress={async () => {
                await triggerHapticSelection();
                setIsBreathing((b) => !b);
              }}
            >
              <Text style={styles.breathStartBtnText}>
                {isBreathing ? 'Pause Breathing' : 'Start 4-4-4 Breathing'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.breathLogBtn}
              onPress={async () => {
                await triggerHapticNotification();
                completeMindfulSession(2);
                showToast('+2 mindful minutes added to your profile!');
              }}
            >
              <Text style={styles.breathLogBtnText}>Log +2m Session</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Propose Activity Modal */}
      <Modal
        visible={proposeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProposeModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Propose Wellness Activity</Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setProposeModalVisible(false)}
              >
                <Icon name="close" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>ACTIVITY TITLE</Text>
            <TextInput
              style={styles.input}
              value={titleInput}
              onChangeText={setTitleInput}
              placeholder="e.g., Sunset Sound Bath & Stretch"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.fieldLabel}>DESCRIPTION</Text>
            <TextInput
              style={[styles.input, { minHeight: 56 }]}
              value={descInput}
              onChangeText={setDescInput}
              multiline
              placeholder="Describe the session..."
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.fieldLabel}>SUGGESTED TIME & LOCATION</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={timeInput}
                onChangeText={setTimeInput}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={locInput}
                onChangeText={setLocInput}
              />
            </View>

            <Text style={styles.fieldLabel}>CATEGORY</Text>
            <View style={styles.catChipsWrap}>
              {FILTER_CATEGORIES.filter((c) => c !== 'All').map((cat) => {
                const active = catInput === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.filterPill, active && styles.filterPillActive]}
                    onPress={() => setCatInput(cat as WellnessActivityCategory)}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        active && styles.filterPillTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.submitModalBtn}
              onPress={handleCreateActivity}
            >
              <Text style={styles.submitModalBtnText}>
                Publish Activity Proposal →
              </Text>
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
  topHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
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
  },
  proposeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
  },
  proposeBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  winnerHeroCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#CBE0CF',
    marginBottom: 14,
  },
  winnerBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  winnerBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  winnerBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary,
  },
  winnerVoteCount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  winnerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  winnerDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 17,
  },
  winnerMeta: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 8,
    marginBottom: 12,
  },
  winnerBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  joinWinnerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 12,
  },
  joinWinnerBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  hrApproveBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBE0CF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hrApproveBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  filterPillsRow: {
    gap: 7,
    marginBottom: 12,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  filterPillActive: {
    backgroundColor: colors.primarySoftBg,
    borderColor: colors.primaryGlow,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterPillTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 10,
    gap: 12,
  },
  activityCardWinnerBorder: {
    borderColor: colors.primaryGlow,
    backgroundColor: '#F9FCF9',
  },
  activityTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  rankChip: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  catChip: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primaryGlow,
    backgroundColor: '#EBF3EC',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  leadingTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9A6B1F',
  },
  hrTag: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  activityDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 16,
  },
  activityMeta: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 5,
  },
  cardBottomActions: {
    flexDirection: 'row',
    marginTop: 8,
  },
  rsvpChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#FAF9F5',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  rsvpChipJoined: {
    backgroundColor: '#EBF3EC',
    borderColor: '#CBE0CF',
  },
  rsvpChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  rsvpChipTextJoined: {
    color: colors.primary,
    fontWeight: '700',
  },
  voteColumnBtn: {
    width: 56,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#FAF9F5',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voteColumnBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  voteArrow: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  voteNum: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  voteSubLabel: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: '600',
  },
  voteTextActive: {
    color: '#FFFFFF',
  },
  breathingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
    marginTop: 6,
  },
  sectionEyebrow: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: colors.primaryGlow,
  },
  breathingCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 3,
  },
  flowerWrap: {
    marginVertical: 8,
  },
  phaseText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  timerDigits: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  breathingBtnsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  breathStartBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  breathStartBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  breathLogBtn: {
    backgroundColor: '#EFECE6',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  breathLogBtnText: {
    color: colors.textPrimary,
    fontSize: 12,
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
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EFECE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
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
  submitModalBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  submitModalBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
