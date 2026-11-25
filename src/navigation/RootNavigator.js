import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Modal,
  ScrollView,
  Switch,
} from 'react-native';
import { useWellness } from '../context/WellnessContext';
import { colors } from '../theme/colors';
import { Icon } from '../components/common/Icon';
import { MotivationalGateScreen } from '../features/gate/MotivationalGateScreen';
import { HomeScreen } from '../features/dashboard/HomeScreen';
import { ChallengesScreen } from '../features/challenges/ChallengesScreen';
import { MindfulScreen } from '../features/mindful/MindfulScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { CommunityScreen } from '../features/community/CommunityScreen';
import { AuthModal } from '../features/auth/AuthModal';
import { AuthScreen } from '../features/auth/AuthScreen';
import { OnboardingScreen } from '../features/onboarding/OnboardingScreen';
import { CompanyVerificationScreen } from '../features/onboarding/CompanyVerificationScreen';
import { HealthPermissionsScreen } from '../features/onboarding/HealthPermissionsScreen';
import { triggerHapticSelection, triggerHapticNotification } from '../utils/haptics';

const TAB_ITEMS = [
  { key: 'home', label: 'Today', breadcrumb: 'Today', icon: 'home' },
  { key: 'leaderboard', label: 'Challenges', breadcrumb: 'Challenges', icon: 'trophy' },
  { key: 'calm', label: 'Mindful', breadcrumb: 'Mindful & Activities', icon: 'lotus' },
  { key: 'community', label: 'Community', breadcrumb: 'Community', icon: 'chat' },
];

export const RootNavigator = () => {
  const {
    employee,
    userProfile,
    onboardingStep,
    isGateUnlocked,
    activeTab,
    setActiveTab,
    moveSubTab,
    notifications,
    notificationPrefs,
    updateNotificationPrefs,
    personalizationPrefs,
    markAllNotificationsRead,
    checkInDailyStreak,
  } = useWellness();

  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [streakModalVisible, setStreakModalVisible] = useState(false);
  const [streakStatusMsg, setStreakStatusMsg] = useState(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Normalize tab keys so legacy calls ('profile', 'settings', 'activities', 'move') work seamlessly
  const resolvedTab =
    activeTab === 'profile' || activeTab === 'settings'
      ? 'profile'
      : activeTab === 'activities' ||
        (activeTab === 'leaderboard' &&
          (moveSubTab === 'calm' || moveSubTab === 'activities'))
        ? 'calm'
        : activeTab === 'move'
          ? 'leaderboard'
          : activeTab;

  const activeTabMeta =
    resolvedTab === 'profile'
      ? { key: 'profile', label: 'Profile', breadcrumb: 'Profile & Settings', icon: 'user' }
      : TAB_ITEMS.find((t) => t.key === resolvedTab) || TAB_ITEMS[0];

  const avatarInitials =
    (userProfile?.fullName || employee.name || 'US')
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'US';

  const handleTabPress = async (tabKey) => {
    await triggerHapticSelection();
    setActiveTab(tabKey);
  };

  const handleStreakCheckIn = async () => {
    await triggerHapticNotification();
    checkInDailyStreak();
    setStreakStatusMsg('Check-in logged! Every small step counts.');
    setTimeout(() => setStreakStatusMsg(null), 3500);
  };

  const allRemindersPaused =
    !notificationPrefs.dailyCheckInReminders &&
    !notificationPrefs.teamActivityUpdates &&
    !notificationPrefs.communityReplies;

  const handleTogglePauseAllReminders = async (pauseAll) => {
    await triggerHapticSelection();
    updateNotificationPrefs({
      dailyCheckInReminders: !pauseAll,
      teamActivityUpdates: !pauseAll,
      communityReplies: !pauseAll,
    });
  };

  const isFullyOnboarded = onboardingStep === 'COMPLETED';

  const renderCurrentScreen = () => {
    if (onboardingStep === 'AUTH') {
      return <AuthScreen />;
    }
    if (onboardingStep === 'HEALTH_PERMISSIONS') {
      return <HealthPermissionsScreen />;
    }
    if (onboardingStep === 'BIOMETRICS') {
      return <OnboardingScreen />;
    }
    if (onboardingStep === 'COMPANY_ID_VERIFICATION') {
      return <CompanyVerificationScreen />;
    }
    if (!isGateUnlocked) {
      return <MotivationalGateScreen />;
    }
    switch (resolvedTab) {
      case 'home':
        return <HomeScreen />;
      case 'leaderboard':
        return <ChallengesScreen />;
      case 'calm':
        return (
          <MindfulScreen
            initialSection={moveSubTab === 'activities' ? 'activities' : 'calm'}
          />
        );
      case 'community':
        return <CommunityScreen />;
      case 'profile':
        return <SettingsScreen />;
      default:
        return <HomeScreen />;
    }
  };

  const statusTagline =
    userProfile?.verificationStatus === 'VERIFIED'
      ? '✓ ID VERIFIED · WORKSPACE'
      : userProfile?.verificationStatus === 'UNDER_REVIEW'
        ? 'ID PENDING HR REVIEW'
        : 'CALM WORKPLACE WELLNESS';

  return (
    <View style={styles.webCanvas}>
      <View style={styles.phoneHardwareShell}>
        {Platform.OS === 'web' && (
          <>
            <View style={[styles.sideButtonLeft, { top: 110, height: 28 }]} />
            <View style={[styles.sideButtonLeft, { top: 154, height: 50 }]} />
            <View style={[styles.sideButtonLeft, { top: 216, height: 50 }]} />
            <View style={[styles.sideButtonRight, { top: 170, height: 72 }]} />
          </>
        )}

        <SafeAreaView style={styles.phoneScreen}>
          {Platform.OS === 'web' && (
            <View style={styles.dynamicIsland} pointerEvents="none">
              <View style={styles.dynamicIslandCameraOuter}>
                <View style={styles.dynamicIslandCameraInner} />
              </View>
            </View>
          )}

          {/* Persistent Top Workspace Bar with Profile & Settings Avatar Button */}
          <View style={styles.workspaceTopBar}>
            <View style={styles.breadcrumbRow}>
              <TouchableOpacity
                onPress={() => handleTabPress('home')}
                activeOpacity={0.7}
                style={styles.breadcrumbTouch}
                accessibilityRole="button"
                accessibilityLabel="Go to Today screen"
              >
                <Text style={styles.breadcrumbRoot}>PulseCorp</Text>
              </TouchableOpacity>
              <Text style={styles.breadcrumbSlash}>/</Text>
              <Text style={styles.breadcrumbCurrent} numberOfLines={1}>
                {onboardingStep === 'AUTH'
                  ? 'Sign In'
                  : onboardingStep === 'HEALTH_PERMISSIONS'
                    ? 'Step 1 of 3 · Permissions'
                    : onboardingStep === 'BIOMETRICS'
                      ? 'Step 2 of 3 · Profile'
                      : onboardingStep === 'COMPANY_ID_VERIFICATION'
                        ? 'Step 3 of 3 · Workspace'
                        : isGateUnlocked
                          ? activeTabMeta.breadcrumb
                          : 'Daily Check-In'}
              </Text>
            </View>

            <View style={styles.topActionsRow}>
              <TouchableOpacity
                style={styles.bellButton}
                onPress={async () => {
                  await triggerHapticSelection();
                  setNotificationsModalVisible(true);
                }}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Open reminders and notifications"
              >
                <Icon name="bell" size={19} color="#4A504B" />
                {unreadCount > 0 && !allRemindersPaused && (
                  <View style={styles.unreadDot} />
                )}
              </TouchableOpacity>

              {isFullyOnboarded && isGateUnlocked && (
                <TouchableOpacity
                  style={[
                    styles.profileHeaderBtn,
                    resolvedTab === 'profile' && styles.profileHeaderBtnActive,
                  ]}
                  onPress={() => handleTabPress('profile')}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Open Profile and Settings"
                >
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{avatarInitials}</Text>
                  </View>
                  <Text
                    style={[
                      styles.profileHeaderLabel,
                      resolvedTab === 'profile' && styles.profileHeaderLabelActive,
                    ]}
                  >
                    Profile
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Sub-Header Row */}
          {isFullyOnboarded && isGateUnlocked && (
            <View style={styles.bloomSubBar}>
              <TouchableOpacity
                onPress={() => handleTabPress('profile')}
                activeOpacity={0.75}
                style={styles.taglineTouch}
                accessibilityRole="button"
                accessibilityLabel="Open profile and privacy settings"
              >
                <Text style={styles.bloomTagline}>{statusTagline}</Text>
              </TouchableOpacity>

              {personalizationPrefs?.showStreaksAndCheckIns !== false && (
                <TouchableOpacity
                  style={styles.streakPill}
                  onPress={async () => {
                    await triggerHapticSelection();
                    setStreakModalVisible(true);
                  }}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`Active days logged: ${employee.currentStreakDays}. Tap for daily check-in`}
                >
                  <Icon name="flame" size={14} color="#B87D4B" />
                  <Text style={styles.streakPillText}>
                    {employee.currentStreakDays} check-ins
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Main Active Screen */}
          <View style={styles.screenArea}>{renderCurrentScreen()}</View>

          {/* 4-Tab Bottom Navigation Bar: Today, Challenges, Mindful, Community */}
          {isFullyOnboarded && isGateUnlocked && (
            <View style={styles.floatingDockWrapper} pointerEvents="box-none">
              <View style={styles.floatingDock}>
                {TAB_ITEMS.map((tab) => {
                  const isActive = resolvedTab === tab.key;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      style={styles.dockTabItem}
                      onPress={() => handleTabPress(tab.key)}
                      activeOpacity={0.8}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: isActive }}
                      accessibilityLabel={`${tab.label} tab`}
                    >
                      <View
                        style={[
                          styles.dockIconPill,
                          isActive && styles.dockIconPillActive,
                        ]}
                      >
                        <Icon
                          name={tab.icon}
                          size={19}
                          color={isActive ? colors.primary : '#737974'}
                        />
                      </View>
                      <Text
                        style={[
                          styles.dockLabel,
                          isActive ? styles.dockLabelActive : styles.dockLabelInactive,
                        ]}
                      >
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </SafeAreaView>
      </View>

      <AuthModal />

      {/* Notifications & Opt-In Reminder Controls Modal */}
      <Modal
        visible={notificationsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNotificationsModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Reminders &amp; Notifications</Text>
                <Text style={styles.modalSubtitle}>
                  Opt-in reminders you can pause or change anytime
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setNotificationsModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close notifications"
              >
                <Icon name="close" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.prefBox}>
              <View style={styles.prefRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.prefLabel, { fontWeight: '700' }]}>
                    Pause all reminders
                  </Text>
                  <Text style={styles.prefSubNote}>
                    Quiet mode for focus hours or time off
                  </Text>
                </View>
                <Switch
                  value={allRemindersPaused}
                  onValueChange={handleTogglePauseAllReminders}
                  trackColor={{ false: '#D8D4CC', true: '#4A7C59' }}
                  thumbColor="#FFFFFF"
                  accessibilityLabel="Pause all reminders"
                />
              </View>

              <View style={styles.prefDivider} />

              <View style={styles.prefRow}>
                <Text style={styles.prefLabel}>Daily check-in reminders</Text>
                <Switch
                  value={notificationPrefs.dailyCheckInReminders}
                  onValueChange={(v) =>
                    updateNotificationPrefs({ dailyCheckInReminders: v })
                  }
                  trackColor={{ false: '#D8D4CC', true: '#4A7C59' }}
                  thumbColor="#FFFFFF"
                />
              </View>
              <View style={styles.prefRow}>
                <Text style={styles.prefLabel}>Team activity updates</Text>
                <Switch
                  value={notificationPrefs.teamActivityUpdates}
                  onValueChange={(v) =>
                    updateNotificationPrefs({ teamActivityUpdates: v })
                  }
                  trackColor={{ false: '#D8D4CC', true: '#4A7C59' }}
                  thumbColor="#FFFFFF"
                />
              </View>
              <View style={styles.prefRow}>
                <Text style={styles.prefLabel}>Community replies</Text>
                <Switch
                  value={notificationPrefs.communityReplies}
                  onValueChange={(v) =>
                    updateNotificationPrefs({ communityReplies: v })
                  }
                  trackColor={{ false: '#D8D4CC', true: '#4A7C59' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            <ScrollView style={{ maxHeight: 190 }} showsVerticalScrollIndicator={false}>
              {notifications.length === 0 ? (
                <View style={styles.emptyNoticeBox}>
                  <Text style={styles.emptyNoticeText}>
                    No notifications right now. Enjoy a calm workday!
                  </Text>
                </View>
              ) : (
                notifications.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.notificationItem,
                      !item.read && styles.notificationItemUnread,
                    ]}
                    onPress={async () => {
                      await triggerHapticSelection();
                      markAllNotificationsRead();
                      setNotificationsModalVisible(false);
                      if (item.targetTab) {
                        setActiveTab(item.targetTab);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.notificationTopRow}>
                      <Text style={styles.notificationTitle}>{item.title}</Text>
                      <Text style={styles.notificationTime}>{item.timeAgo}</Text>
                    </View>
                    <Text style={styles.notificationBody}>{item.body}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <View style={styles.modalFooterRow}>
              {notifications.length > 0 && (
                <TouchableOpacity
                  style={styles.secondaryModalBtn}
                  onPress={async () => {
                    await triggerHapticNotification();
                    markAllNotificationsRead();
                  }}
                  accessibilityRole="button"
                >
                  <Text style={styles.secondaryModalBtnText}>Mark all read</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.primaryModalBtn}
                onPress={() => setNotificationsModalVisible(false)}
                accessibilityRole="button"
              >
                <Text style={styles.primaryModalBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Flexible, Guilt-Free Daily Check-In Modal */}
      <Modal
        visible={streakModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStreakModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.streakModalTitleRow}>
                <View style={styles.streakFlameBadge}>
                  <Icon name="flame" size={18} color="#B87D4B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>
                    {employee.currentStreakDays} Wellness Check-Ins
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    Flexible rhythm — missed days never reset your progress
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setStreakModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close check-in modal"
              >
                <Icon name="close" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.flexibleNote}>
              Rest days are a normal part of staying well. Log a check-in whenever you take a
              mindful pause, drink water, or go for a walk.
            </Text>

            {streakStatusMsg && (
              <View style={styles.streakSuccessBanner}>
                <Icon name="check" size={14} color={colors.primary} />
                <Text style={styles.streakSuccessText}>{streakStatusMsg}</Text>
              </View>
            )}

            <View style={styles.modalFooterRow}>
              <TouchableOpacity
                style={styles.secondaryModalBtn}
                onPress={() => {
                  setStreakModalVisible(false);
                  setActiveTab('calm');
                }}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryModalBtnText}>Open Mindful Tab</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryModalBtn}
                onPress={handleStreakCheckIn}
                accessibilityRole="button"
              >
                <Text style={styles.primaryModalBtnText}>Log Today’s Check-In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  webCanvas: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#2A2B2E' : colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Platform.OS === 'web' ? 14 : 0,
  },
  phoneHardwareShell: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 426 : undefined,
    maxHeight: Platform.OS === 'web' ? 892 : undefined,
    backgroundColor: Platform.OS === 'web' ? '#121315' : colors.background,
    borderRadius: Platform.OS === 'web' ? 54 : 0,
    padding: Platform.OS === 'web' ? 11 : 0,
    borderWidth: Platform.OS === 'web' ? 2 : 0,
    borderColor: '#3A3C40',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: Platform.OS === 'web' ? 0.45 : 0,
    shadowRadius: 36,
    elevation: 16,
  },
  sideButtonLeft: {
    position: 'absolute',
    left: -4,
    width: 3,
    backgroundColor: '#484A4E',
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
  },
  sideButtonRight: {
    position: 'absolute',
    right: -4,
    width: 3,
    backgroundColor: '#484A4E',
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  phoneScreen: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: Platform.OS === 'web' ? 43 : 0,
    overflow: 'hidden',
    position: 'relative',
  },
  dynamicIsland: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    width: 112,
    height: 31,
    borderRadius: 18,
    backgroundColor: '#000000',
    zIndex: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 10,
  },
  dynamicIslandCameraOuter: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#121629',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dynamicIslandCameraInner: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#253B80',
  },
  workspaceTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 14 : 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EFECE6',
    backgroundColor: colors.background,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  breadcrumbTouch: {
    minHeight: 48,
    justifyContent: 'center',
    paddingRight: 4,
  },
  breadcrumbRoot: {
    fontSize: 13,
    color: '#6E746F',
    fontWeight: '600',
  },
  breadcrumbSlash: {
    fontSize: 13,
    color: '#C5C2BA',
    marginHorizontal: 5,
  },
  breadcrumbCurrent: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '700',
    flexShrink: 1,
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bellButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#D97757',
  },
  profileHeaderBtn: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F2EFE9',
    borderWidth: 1,
    borderColor: '#E3DEC3',
  },
  profileHeaderBtnActive: {
    backgroundColor: '#DFECE2',
    borderColor: colors.primary,
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D8C3B0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#3F352C',
  },
  profileHeaderLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  profileHeaderLabelActive: {
    color: colors.primary,
  },
  bloomSubBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
  },
  taglineTouch: {
    minHeight: 40,
    justifyContent: 'center',
  },
  bloomTagline: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.0,
    color: '#6E746F',
    textTransform: 'uppercase',
  },
  streakPill: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5EBE1',
    borderWidth: 1,
    borderColor: '#D5C3B0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 6,
  },
  streakPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7A5C43',
  },
  screenArea: {
    flex: 1,
  },
  floatingDockWrapper: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 10,
  },
  floatingDock: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#EFECE6',
    shadowColor: '#1E2420',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  dockTabItem: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockIconPill: {
    width: 46,
    height: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockIconPillActive: {
    backgroundColor: '#DFECE2',
  },
  dockLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  dockLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  dockLabelInactive: {
    color: '#6E746F',
    fontWeight: '500',
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
    backgroundColor: '#FAF8F3',
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E1D8',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFECE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8E4DA',
    marginBottom: 12,
    gap: 8,
  },
  prefDivider: {
    height: 1,
    backgroundColor: '#EFECE6',
    marginVertical: 2,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  prefLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  prefSubNote: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  emptyNoticeBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFECE6',
  },
  emptyNoticeText: {
    fontSize: 12.5,
    color: colors.textSecondary,
  },
  notificationItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EFECE6',
  },
  notificationItemUnread: {
    borderColor: '#C5DEC0',
    backgroundColor: '#F3F8F2',
  },
  notificationTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  notificationTime: {
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: 8,
  },
  notificationBody: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  modalFooterRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  secondaryModalBtn: {
    flex: 1,
    minHeight: 48,
    backgroundColor: '#EFECE6',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  secondaryModalBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  primaryModalBtn: {
    flex: 1,
    minHeight: 48,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  primaryModalBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  streakModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  streakFlameBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5EBE1',
    borderWidth: 1,
    borderColor: '#D5C3B0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexibleNote: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: 10,
  },
  streakSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E3EFE0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 6,
  },
  streakSuccessText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    flex: 1,
  },
});
