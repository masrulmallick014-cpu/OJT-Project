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
import {
  MINDFUL_SESSIONS_LIBRARY,
  useWellness,
} from '../../context/WellnessContext';
import { colors } from '../../theme/colors';
import { Icon, BloomingFlowerIllustration } from '../../components/common/Icon';
import {
  triggerHapticNotification,
  triggerHapticSelection,
} from '../../utils/haptics';

const FILTER_CATEGORIES = [
  'All',
  'Yoga & Breath',
  'Outdoor Walk',
  'Ergonomics',
  'Mindfulness',
  'Team Sport',
];

const SESSION_CATEGORIES = [
  'All',
  'Breathing',
  'Stress Reset',
  'Focus',
  'Desk Stretch',
  'Wind-Down',
];

export const MindfulScreen = ({ initialSection = 'calm' }) => {
  const {
    employee,
    proposedActivities,
    selectedWinningActivity,
    proposeWellnessActivity,
    toggleVoteWellnessActivity,
    toggleJoinWellnessActivity,
    mindfulMinutes,
    mindfulSessionHistory,
    clearMindfulSessionHistory,
    completeMindfulSession,
    logWorkoutActivity,
  } = useWellness();

  const [activeSection, setActiveSection] = useState(
    initialSection === 'activities' ? 'activities' : 'calm'
  );
  const [selectedSessionCategory, setSelectedSessionCategory] = useState('All');
  const [selectedActivityCategory, setSelectedActivityCategory] = useState('All');
  const [proposeModalVisible, setProposeModalVisible] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [timeInput, setTimeInput] = useState('Fri · 4:00 PM');
  const [locInput, setLocInput] = useState('Office Courtyard');
  const [catInput, setCatInput] = useState('Yoga & Breath');

  // Selected Mindful Library Session State
  const [activeLibrarySession, setActiveLibrarySession] = useState(
    MINDFUL_SESSIONS_LIBRARY[0]
  );
  const [sessionState, setSessionState] = useState('idle'); // 'idle' | 'running' | 'paused' | 'completed'
  const [secondsLeft, setSecondsLeft] = useState(
    MINDFUL_SESSIONS_LIBRARY[0].durationMinutes * 60
  );
  const [phaseLabel, setPhaseLabel] = useState('Ready when you are');
  const [completedSummary, setCompletedSummary] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  useEffect(() => {
    setActiveSection(initialSection === 'activities' ? 'activities' : 'calm');
  }, [initialSection]);

  useEffect(() => {
    if (sessionState !== 'running') return;
    const totalSec = activeLibrarySession.durationMinutes * 60;
    const steps = activeLibrarySession.guidanceSteps || [];
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          completeMindfulSession(activeLibrarySession.durationMinutes, {
            title: activeLibrarySession.title,
            category: activeLibrarySession.category,
          });
          setSessionState('completed');
          setCompletedSummary({
            title: activeLibrarySession.title,
            category: activeLibrarySession.category,
            minutesLogged: activeLibrarySession.durationMinutes,
            cyclesCompleted: Math.max(1, Math.round(totalSec / 12)),
            note: 'Taking a dedicated pause helps release workday tension and refresh your focus.',
          });
          return 0;
        }
        const next = prev - 1;
        const elapsed = totalSec - next;
        if (
          activeLibrarySession.category === 'Breathing' ||
          activeLibrarySession.category === 'Stress Reset'
        ) {
          const step = elapsed % 12;
          if (step < 4) setPhaseLabel('Inhale slowly... (4s)');
          else if (step < 8) setPhaseLabel('Hold gently... (4s)');
          else setPhaseLabel('Exhale softly... (4s)');
        } else if (steps.length > 0) {
          const stepIdx = Math.min(
            steps.length - 1,
            Math.floor((elapsed / Math.max(1, totalSec)) * steps.length)
          );
          setPhaseLabel(steps[stepIdx]);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionState, activeLibrarySession, completeMindfulSession]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg((prev) => (prev === msg ? null : prev)), 3000);
  };

  const handleSelectLibrarySession = async (sessionItem) => {
    await triggerHapticSelection();
    setActiveLibrarySession(sessionItem);
    setSecondsLeft(sessionItem.durationMinutes * 60);
    setSessionState('idle');
    setPhaseLabel('Ready when you are');
    setCompletedSummary(null);
  };

  const handleStartSession = async () => {
    await triggerHapticSelection();
    setSecondsLeft(activeLibrarySession.durationMinutes * 60);
    setPhaseLabel(
      activeLibrarySession.guidanceSteps?.[0] || 'Inhale slowly... (4s)'
    );
    setCompletedSummary(null);
    setSessionState('running');
  };

  const handlePauseResumeSession = async () => {
    await triggerHapticSelection();
    if (sessionState === 'running') {
      setSessionState('paused');
      setPhaseLabel('Session paused — take your time');
    } else if (sessionState === 'paused') {
      setSessionState('running');
    }
  };

  const handleFinishSession = async () => {
    await triggerHapticNotification();
    const totalSec = activeLibrarySession.durationMinutes * 60;
    const elapsedSec = Math.max(12, totalSec - secondsLeft);
    const minsEarned = Math.max(
      1,
      Math.round(elapsedSec / 60) || activeLibrarySession.durationMinutes
    );
    completeMindfulSession(minsEarned, {
      title: activeLibrarySession.title,
      category: activeLibrarySession.category,
    });
    setSessionState('completed');
    setCompletedSummary({
      title: activeLibrarySession.title,
      category: activeLibrarySession.category,
      minutesLogged: minsEarned,
      cyclesCompleted: Math.max(1, Math.round(elapsedSec / 12)),
      note: 'Session recorded. Even a brief reset helps you return to your day with clearer focus.',
    });
  };

  const handleExitSession = async () => {
    await triggerHapticSelection();
    setSessionState('idle');
    setSecondsLeft(activeLibrarySession.durationMinutes * 60);
    setPhaseLabel('Ready when you are');
    setCompletedSummary(null);
  };

  const handleCompleteTeamActivity = async (activity) => {
    await triggerHapticNotification();
    completeMindfulSession(15, {
      title: activity.title,
      category: activity.category || 'Group Activity',
    });
    logWorkoutActivity('Walking', 15);
    setCompletedSummary({
      title: activity.title,
      category: activity.category || 'Group Activity',
      minutesLogged: 15,
      cyclesCompleted: null,
      note: `Logged 15 minutes for "${activity.title}" (${activity.location}). Great job taking a real-world wellness break!`,
    });
    setSessionState('completed');
    setActiveSection('calm');
  };

  const filteredLibrarySessions = MINDFUL_SESSIONS_LIBRARY.filter(
    (s) =>
      selectedSessionCategory === 'All' || s.category === selectedSessionCategory
  );

  const sortedActivities = [...proposedActivities]
    .filter(
      (a) =>
        selectedActivityCategory === 'All' ||
        a.category === selectedActivityCategory
    )
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
    showToast('Activity added to the team board!');
  };

  const renderActiveSessionPlayer = () => {
    if (sessionState === 'completed' && completedSummary) {
      return (
        <View style={styles.summaryCard}>
          <View style={styles.summaryBadge}>
            <Text style={styles.summaryBadgeText}>✓ SESSION COMPLETE</Text>
          </View>
          <View style={styles.flowerWrap}>
            <BloomingFlowerIllustration size={110} />
          </View>
          <Text style={styles.summaryTitle}>{completedSummary.title}</Text>
          <Text style={styles.summaryNote}>{completedSummary.note}</Text>

          <View style={styles.summaryStatsGrid}>
            <View style={styles.summaryStatBox}>
              <Text style={styles.summaryStatVal}>
                +{completedSummary.minutesLogged} min
              </Text>
              <Text style={styles.summaryStatLabel}>Logged Today</Text>
            </View>
            {completedSummary.cyclesCompleted !== null && (
              <View style={styles.summaryStatBox}>
                <Text style={styles.summaryStatVal}>
                  {completedSummary.cyclesCompleted}
                </Text>
                <Text style={styles.summaryStatLabel}>Cycles</Text>
              </View>
            )}
            <View style={styles.summaryStatBox}>
              <Text style={styles.summaryStatVal}>{mindfulMinutes} min</Text>
              <Text style={styles.summaryStatLabel}>Total Mindful Time</Text>
            </View>
          </View>

          <View style={styles.breathingBtnsRow}>
            <TouchableOpacity
              style={styles.breathSecondaryBtn}
              onPress={handleExitSession}
              accessibilityRole="button"
              accessibilityLabel="Done viewing summary"
            >
              <Text style={styles.breathSecondaryBtnText}>Done</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.breathStartBtn}
              onPress={handleStartSession}
              accessibilityRole="button"
              accessibilityLabel="Start session again"
            >
              <Text style={styles.breathStartBtnText}>Start Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.breathingCard}>
        <View style={styles.playerTopBadgeRow}>
          <Text style={styles.sectionEyebrow}>
            {activeLibrarySession.kind === 'QUICK_RESET'
              ? '1–2 MIN QUICK RESET'
              : '5–10 MIN GUIDED SESSION'}{' '}
            · {activeLibrarySession.category.toUpperCase()}
          </Text>
          <Text style={styles.totalMindfulPill}>{mindfulMinutes}m total</Text>
        </View>

        <Text style={styles.breathingCardTitle}>{activeLibrarySession.title}</Text>
        <Text style={styles.breathingCardSub}>{activeLibrarySession.subtitle}</Text>

        <View style={styles.flowerWrap}>
          <BloomingFlowerIllustration size={120} />
        </View>

        <Text style={styles.phaseText}>{phaseLabel}</Text>
        <Text style={styles.timerDigits}>
          {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
        </Text>

        {/* Step-by-Step Guidance Checklist */}
        {activeLibrarySession.guidanceSteps && (
          <View style={styles.guidanceStepsBox}>
            {activeLibrarySession.guidanceSteps.map((stepText, idx) => (
              <Text key={stepText} style={styles.guidanceStepLine}>
                {idx + 1}. {stepText}
              </Text>
            ))}
          </View>
        )}

        {sessionState === 'idle' ? (
          <View style={styles.breathingBtnsRow}>
            <TouchableOpacity
              style={styles.breathStartBtn}
              onPress={handleStartSession}
              accessibilityRole="button"
              accessibilityLabel={`Start ${activeLibrarySession.title}`}
            >
              <Text style={styles.breathStartBtnText}>
                Start ({activeLibrarySession.durationMinutes} min)
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.activeSessionControlsCol}>
            <View style={styles.breathingBtnsRow}>
              <TouchableOpacity
                style={styles.breathSecondaryBtn}
                onPress={handlePauseResumeSession}
                accessibilityRole="button"
                accessibilityLabel={
                  sessionState === 'running' ? 'Pause session' : 'Resume session'
                }
              >
                <Text style={styles.breathSecondaryBtnText}>
                  {sessionState === 'running' ? 'Pause' : 'Resume'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.breathStartBtn}
                onPress={handleFinishSession}
                accessibilityRole="button"
                accessibilityLabel="Finish session and view summary"
              >
                <Text style={styles.breathStartBtnText}>Finish &amp; Summary ✓</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.exitSessionBtn}
              onPress={handleExitSession}
              accessibilityRole="button"
              accessibilityLabel="Exit and reset timer without logging"
            >
              <Text style={styles.exitSessionBtnText}>Exit / Reset Timer</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.nonMedicalFootnote}>
          For general workplace relaxation and focus. Not intended to diagnose, treat, or cure any
          medical condition.
        </Text>
      </View>
    );
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

        <View style={styles.topHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>Mindful &amp; Sessions</Text>
            <Text style={styles.pageSubtitle}>
              1–2 minute quick resets, 5–10 minute guided sessions, and team breaks.
            </Text>
          </View>
          {activeSection === 'activities' && (
            <TouchableOpacity
              style={styles.proposeBtn}
              onPress={async () => {
                await triggerHapticSelection();
                setProposeModalVisible(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Propose a new office wellness activity"
            >
              <Icon name="plus" size={14} color="#FFFFFF" />
              <Text style={styles.proposeBtnText}>Propose</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sub-navigation Toggle: Guided Sessions Library vs Office Activities */}
        <View style={styles.sectionToggleBar}>
          <TouchableOpacity
            style={[
              styles.sectionToggleBtn,
              activeSection === 'calm' && styles.sectionToggleBtnActive,
            ]}
            onPress={async () => {
              await triggerHapticSelection();
              setActiveSection('calm');
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeSection === 'calm' }}
          >
            <Text
              style={[
                styles.sectionToggleText,
                activeSection === 'calm' && styles.sectionToggleTextActive,
              ]}
            >
              Mindful Library ({MINDFUL_SESSIONS_LIBRARY.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sectionToggleBtn,
              activeSection === 'activities' && styles.sectionToggleBtnActive,
            ]}
            onPress={async () => {
              await triggerHapticSelection();
              setActiveSection('activities');
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeSection === 'activities' }}
          >
            <Text
              style={[
                styles.sectionToggleText,
                activeSection === 'activities' && styles.sectionToggleTextActive,
              ]}
            >
              Office Activities ({proposedActivities.length})
            </Text>
          </TouchableOpacity>
        </View>

        {activeSection === 'calm' ? (
          <>
            {/* Active Session Player */}
            {renderActiveSessionPlayer()}

            {/* Session Category Filter Pills */}
            <Text style={styles.sectionHeaderLabel}>BROWSE MINDFUL SESSIONS</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterPillsRow}
            >
              {SESSION_CATEGORIES.map((cat) => {
                const active = selectedSessionCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.filterPill, active && styles.filterPillActive]}
                    onPress={() => setSelectedSessionCategory(cat)}
                    accessibilityRole="button"
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

            {/* Library Session Cards */}
            {filteredLibrarySessions.map((item) => {
              const isSelected = activeLibrarySession.id === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.librarySessionCard,
                    isSelected && styles.librarySessionCardSelected,
                  ]}
                  onPress={() => handleSelectLibrarySession(item)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${item.title}, ${item.durationMinutes} minutes`}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.activityTagRow}>
                      <Text style={styles.catChip}>{item.category}</Text>
                      <Text style={styles.durationMetaTag}>
                        {item.durationMinutes} min ·{' '}
                        {item.kind === 'QUICK_RESET' ? 'Quick Reset' : 'Guided Session'}
                      </Text>
                    </View>
                    <Text style={styles.activityTitle}>{item.title}</Text>
                    <Text style={styles.activityDesc}>{item.subtitle}</Text>
                  </View>
                  <View
                    style={[
                      styles.selectSessionPill,
                      isSelected && styles.selectSessionPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.selectSessionPillText,
                        isSelected && { color: '#FFFFFF' },
                      ]}
                    >
                      {isSelected ? 'Selected' : 'Load'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Optional Personal Session History */}
            <View style={styles.historyCard}>
              <View style={styles.historyHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionEyebrow}>OPTIONAL PERSONAL LOG</Text>
                  <Text style={styles.historyTitle}>
                    Recent Mindful Sessions ({mindfulSessionHistory.length})
                  </Text>
                </View>
                {mindfulSessionHistory.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearHistoryBtn}
                    onPress={() => {
                      clearMindfulSessionHistory();
                      showToast('Cleared personal session history.');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Clear personal mindful session history"
                  >
                    <Text style={styles.clearHistoryBtnText}>Clear History</Text>
                  </TouchableOpacity>
                )}
              </View>

              {mindfulSessionHistory.length === 0 ? (
                <Text style={styles.emptyHistoryText}>
                  Completed breathing, focus, and stretch sessions appear here privately on your
                  device.
                </Text>
              ) : (
                mindfulSessionHistory.slice(0, 5).map((h) => (
                  <View key={h.id} style={styles.historyItemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyItemTitle}>{h.title}</Text>
                      <Text style={styles.historyItemSub}>
                        {h.category} ·{' '}
                        {new Date(h.completedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <Text style={styles.historyItemMins}>+{h.durationMinutes} min</Text>
                  </View>
                ))
              )}
            </View>
          </>
        ) : (
          <>
            {/* Pinned Top Voted Office Wellness Activity */}
            {selectedWinningActivity ? (
              <LinearGradient
                colors={['#DFECE2', '#EBF3EC']}
                style={styles.winnerHeroCard}
              >
                <View style={styles.winnerBadgeRow}>
                  <View style={styles.winnerBadge}>
                    <Text style={styles.winnerBadgeText}>FEATURED GROUP ACTIVITY</Text>
                  </View>
                  <Text style={styles.winnerVoteCount}>
                    {selectedWinningActivity.votesCount} votes
                  </Text>
                </View>

                <Text style={styles.winnerTitle}>{selectedWinningActivity.title}</Text>
                <Text style={styles.winnerDesc}>
                  {selectedWinningActivity.description}
                </Text>
                <Text style={styles.winnerMeta}>
                  {selectedWinningActivity.suggestedTime} ·{' '}
                  {selectedWinningActivity.location} · Proposed by{' '}
                  {selectedWinningActivity.proposedByName}
                </Text>

                <View style={styles.winnerBtnRow}>
                  <TouchableOpacity
                    style={styles.joinWinnerBtn}
                    onPress={async () => {
                      await triggerHapticNotification();
                      toggleJoinWellnessActivity(selectedWinningActivity.id);
                      showToast('Updated your participation for this activity.');
                    }}
                    accessibilityRole="button"
                  >
                    <Icon name="calendar" size={14} color="#FFFFFF" />
                    <Text style={styles.joinWinnerBtnText}>
                      {selectedWinningActivity.joinedUserIds.includes(employee.id)
                        ? `Leave Activity (${selectedWinningActivity.joinedUserIds.length} joined)`
                        : 'Join Activity (Opt-In)'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.hrApproveBtn}
                    onPress={() => handleCompleteTeamActivity(selectedWinningActivity)}
                    accessibilityRole="button"
                    accessibilityLabel="Complete activity and view summary"
                  >
                    <Text style={styles.hrApproveBtnText}>Finish &amp; Log ✓</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            ) : (
              <View style={styles.emptyActivityBox}>
                <Text style={styles.emptyActivityText}>
                  No office activities proposed yet. Tap "+ Propose" above to suggest a group walk,
                  stretch, or mindfulness break.
                </Text>
              </View>
            )}

            {/* Category Filter Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterPillsRow}
            >
              {FILTER_CATEGORIES.map((cat) => {
                const active = selectedActivityCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.filterPill, active && styles.filterPillActive]}
                    onPress={() => setSelectedActivityCategory(cat)}
                    accessibilityRole="button"
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

            {/* Proposed Activities List */}
            {sortedActivities.map((act, idx) => {
              const hasVoted = act.voterUserIds.includes(employee.id);
              const hasJoined = act.joinedUserIds.includes(employee.id);
              const isTopWinner =
                selectedWinningActivity && act.id === selectedWinningActivity.id;

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
                      {isTopWinner && <Text style={styles.leadingTag}>Top Voted</Text>}
                    </View>

                    <Text style={styles.activityTitle}>{act.title}</Text>
                    <Text style={styles.activityDesc}>{act.description}</Text>
                    <Text style={styles.activityMeta}>
                      {act.suggestedTime} · {act.location} · By {act.proposedByName}
                    </Text>

                    <View style={styles.cardBottomActions}>
                      <TouchableOpacity
                        style={[styles.rsvpChip, hasJoined && styles.rsvpChipJoined]}
                        onPress={async () => {
                          await triggerHapticSelection();
                          toggleJoinWellnessActivity(act.id);
                        }}
                        accessibilityRole="button"
                      >
                        <Text
                          style={[
                            styles.rsvpChipText,
                            hasJoined && styles.rsvpChipTextJoined,
                          ]}
                        >
                          {hasJoined
                            ? `✓ Joined · Tap to Leave (${act.joinedUserIds.length})`
                            : `+ Join (${act.joinedUserIds.length})`}
                        </Text>
                      </TouchableOpacity>

                      {hasJoined && (
                        <TouchableOpacity
                          style={styles.completeMiniBtn}
                          onPress={() => handleCompleteTeamActivity(act)}
                          accessibilityRole="button"
                        >
                          <Text style={styles.completeMiniBtnText}>Complete ✓</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.voteColumnBtn,
                      hasVoted && styles.voteColumnBtnActive,
                    ]}
                    onPress={async () => {
                      await triggerHapticSelection();
                      toggleVoteWellnessActivity(act.id);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Vote for ${act.title}. Current votes ${act.votesCount}`}
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
                      style={[
                        styles.voteSubLabel,
                        hasVoted && styles.voteTextActive,
                      ]}
                    >
                      {hasVoted ? 'Voted' : 'Vote'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}
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
              <Text style={styles.modalTitle}>Propose Office Activity</Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setProposeModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close propose activity modal"
              >
                <Icon name="close" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>ACTIVITY TITLE</Text>
            <TextInput
              style={styles.input}
              value={titleInput}
              onChangeText={setTitleInput}
              placeholder="e.g., Afternoon Courtyard Walk"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Activity title"
            />

            <Text style={styles.fieldLabel}>DESCRIPTION</Text>
            <TextInput
              style={[styles.input, { minHeight: 56 }]}
              value={descInput}
              onChangeText={setDescInput}
              multiline
              placeholder="What should coworkers know?"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Activity description"
            />

            <Text style={styles.fieldLabel}>SUGGESTED TIME &amp; LOCATION</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={timeInput}
                onChangeText={setTimeInput}
                accessibilityLabel="Suggested time"
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={locInput}
                onChangeText={setLocInput}
                accessibilityLabel="Suggested location"
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
                    onPress={() => setCatInput(cat)}
                    accessibilityRole="button"
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
              accessibilityRole="button"
            >
              <Text style={styles.submitModalBtnText}>Add Activity to Board</Text>
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
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 10,
  },
  toastText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.primary,
  },
  topHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: 12.5,
    color: colors.textSecondary,
    marginTop: 3,
  },
  proposeBtn: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  proposeBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  sectionToggleBar: {
    flexDirection: 'row',
    backgroundColor: '#EFECE6',
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
  },
  sectionToggleBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionToggleBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  sectionToggleText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  sectionToggleTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  sectionHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#5C645E',
    marginBottom: 10,
  },
  playerTopBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 4,
  },
  totalMindfulPill: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: '#EBF3EC',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  guidanceStepsBox: {
    width: '100%',
    backgroundColor: '#FAF9F5',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ECE9E0',
    marginBottom: 10,
    gap: 4,
  },
  guidanceStepLine: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  nonMedicalFootnote: {
    fontSize: 10.5,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 15,
  },
  librarySessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 10,
    gap: 12,
  },
  librarySessionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F4F8F4',
  },
  durationMetaTag: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  selectSessionPill: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#EFECE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectSessionPillActive: {
    backgroundColor: colors.primary,
  },
  selectSessionPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginTop: 8,
    marginBottom: 14,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  clearHistoryBtn: {
    minHeight: 38,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#EFECE6',
    justifyContent: 'center',
  },
  clearHistoryBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  emptyHistoryText: {
    fontSize: 12.5,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  historyItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F2EFE9',
  },
  historyItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  historyItemSub: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 1,
  },
  historyItemMins: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  emptyActivityBox: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EFECE6',
    marginBottom: 14,
  },
  emptyActivityText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  winnerBadgeText: {
    fontSize: 10,
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
    fontSize: 12.5,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  winnerMeta: {
    fontSize: 11.5,
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
    minHeight: 48,
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
    fontSize: 12.5,
    fontWeight: '700',
  },
  hrApproveBtn: {
    minHeight: 48,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBE0CF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hrApproveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  filterPillsRow: {
    gap: 8,
    marginBottom: 12,
  },
  filterPill: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: colors.primarySoftBg,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: 12,
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
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.primaryGlow,
    backgroundColor: '#EBF3EC',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  leadingTag: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#9A6B1F',
  },
  activityTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  activityDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 17,
  },
  activityMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 5,
  },
  cardBottomActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  rsvpChip: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FAF9F5',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    justifyContent: 'center',
  },
  rsvpChipJoined: {
    backgroundColor: '#EBF3EC',
    borderColor: '#CBE0CF',
  },
  rsvpChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  rsvpChipTextJoined: {
    color: colors.primary,
    fontWeight: '700',
  },
  completeMiniBtn: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeMiniBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  voteColumnBtn: {
    minWidth: 58,
    minHeight: 62,
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
    fontSize: 10,
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
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#CBE0CF',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryBadge: {
    backgroundColor: '#EBF3EC',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  summaryBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.8,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 4,
  },
  summaryNote: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 14,
  },
  summaryStatsGrid: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
    marginBottom: 14,
  },
  summaryStatBox: {
    flex: 1,
    backgroundColor: '#FAF9F5',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#ECE9E0',
    alignItems: 'center',
  },
  summaryStatVal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  summaryStatLabel: {
    fontSize: 10.5,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.9,
    color: colors.primaryGlow,
  },
  breathingCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 3,
    textAlign: 'center',
  },
  breathingCardSub: {
    fontSize: 12.5,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  flowerWrap: {
    marginVertical: 8,
  },
  phaseText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
  timerDigits: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    marginVertical: 6,
  },
  activeSessionControlsCol: {
    width: '100%',
    gap: 8,
    marginTop: 6,
  },
  breathingBtnsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
    marginTop: 6,
  },
  breathStartBtn: {
    flex: 1.3,
    minHeight: 48,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  breathStartBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  breathSecondaryBtn: {
    flex: 1,
    minHeight: 48,
    backgroundColor: '#EFECE6',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  breathSecondaryBtnText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  exitSessionBtn: {
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF9F5',
    borderWidth: 1,
    borderColor: '#E5E1D8',
  },
  exitSessionBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textSecondary,
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
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F2EFE9',
    alignItems: 'center',
    justifyContent: 'center',
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
  catChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  submitModalBtn: {
    minHeight: 48,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  submitModalBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
