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
} from 'react-native';
import { useWellness } from '../context/WellnessContext';
import { colors } from '../theme/colors';
import { AppTabKey } from '../types';
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

const TAB_ITEMS: Array<{
  key: AppTabKey;
  label: string;
  breadcrumb: string;
  icon: 'home' | 'trophy' | 'lotus' | 'user' | 'chat';
}> = [
  { key: 'home', label: 'Home', breadcrumb: 'Overview', icon: 'home' },
  { key: 'leaderboard', label: 'Leaderboard', breadcrumb: 'Leaderboard', icon: 'trophy' },
  { key: 'activities', label: 'Activities', breadcrumb: 'Activities', icon: 'lotus' },
  { key: 'profile', label: 'Profile', breadcrumb: 'My profile', icon: 'user' },
  { key: 'community', label: 'Community', breadcrumb: 'Community', icon: 'chat' },
];

export const RootNavigator: React.FC = () => {
  const {
    employee,
    userProfile,
    onboardingStep,
    isGateUnlocked,
    activeTab,
    setActiveTab,
    setIsAuthModalOpen,
    notifications,
    markAllNotificationsRead,
    checkInDailyStreak,
  } = useWellness();

  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [streakModalVisible, setStreakModalVisible] = useState(false);
  const [streakStatusMsg, setStreakStatusMsg] = useState<string | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const activeTabMeta = TAB_ITEMS.find((t) => t.key === activeTab) || TAB_ITEMS[0];
  const avatarInitials =
    (userProfile?.fullName || employee.name || 'US')
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'US';

  const handleTabPress = async (tab: AppTabKey) => {
    await triggerHapticSelection();
    setActiveTab(tab);
  };

  const handleStreakCheckIn = async () => {
    await triggerHapticNotification();
    checkInDailyStreak();
    setStreakStatusMsg('Checked in! Your wellness streak is glowing.');
    setTimeout(() => setStreakStatusMsg(null), 3500);
  };

  const isFullyOnboarded = onboardingStep === 'COMPLETED';

  const renderCurrentScreen = () => {
    if (onboardingStep === 'AUTH') {
      return <AuthScreen />;
    }
    if (onboardingStep === 'BIOMETRICS') {
      return <OnboardingScreen />;
    }
    if (onboardingStep === 'COMPANY_ID_VERIFICATION') {
      return <CompanyVerificationScreen />;
    }
    if (onboardingStep === 'HEALTH_PERMISSIONS') {
      return <HealthPermissionsScreen />;
    }
    if (!isGateUnlocked) {
      return <MotivationalGateScreen />;
    }
    switch (activeTab) {
      case 'home':
        return <HomeScreen />;
      case 'leaderboard':
        return <ChallengesScreen />;
      case 'activities':
        return <MindfulScreen />;
      case 'profile':
        return <SettingsScreen />;
      case 'community':
        return <CommunityScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <View style={styles.webCanvas}>
      <View style={styles.phoneHardwareShell}>
        {/* Left & Right Hardware Buttons (visible on Web iPhone frame) */}
        {Platform.OS === 'web' && (
          <>
            <View style={[styles.sideButtonLeft, { top: 110, height: 28 }]} />
            <View style={[styles.sideButtonLeft, { top: 154, height: 50 }]} />
            <View style={[styles.sideButtonLeft, { top: 216, height: 50 }]} />
            <View style={[styles.sideButtonRight, { top: 170, height: 72 }]} />
          </>
        )}

        <SafeAreaView style={styles.phoneScreen}>
          {/* Top Dynamic Island (matches reference iPhone frame) */}
          {Platform.OS === 'web' && (
            <View style={styles.dynamicIsland} pointerEvents="none">
              <View style={styles.dynamicIslandCameraOuter}>
                <View style={styles.dynamicIslandCameraInner} />
              </View>
            </View>
          )}

          {/* Persistent Top Workspace Breadcrumb Bar */}
          <View style={styles.workspaceTopBar}>
            <View style={styles.breadcrumbRow}>
              <TouchableOpacity
                onPress={() => handleTabPress('home')}
                activeOpacity={0.7}
              >
                <Text style={styles.breadcrumbRoot}>My workspace</Text>
              </TouchableOpacity>
              <Text style={styles.breadcrumbSlash}>/</Text>
              <Text style={styles.breadcrumbCurrent}>
                {onboardingStep === 'AUTH'
                  ? 'Authentication'
                  : onboardingStep === 'BIOMETRICS'
                  ? 'Biometric Calibration'
                  : onboardingStep === 'COMPANY_ID_VERIFICATION'
                  ? 'Company ID Verification'
                  : onboardingStep === 'HEALTH_PERMISSIONS'
                  ? 'Sensor Permissions'
                  : isGateUnlocked
                  ? activeTabMeta.breadcrumb
                  : 'Onboarding'}
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
                accessibilityLabel="Open notifications"
              >
                <Icon name="bell" size={18} color="#4A504B" />
                {unreadCount > 0 && <View style={styles.unreadDot} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.avatarCircle}
                onPress={() => setIsAuthModalOpen(true)}
                activeOpacity={0.8}
                accessibilityLabel="Open role login or profile"
              >
                <Text style={styles.avatarText}>{avatarInitials}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sub-Header Row: YOUR WELLNESS, IN BLOOM + 7-day streak pill */}
          {isFullyOnboarded && isGateUnlocked && (
            <View style={styles.bloomSubBar}>
              <TouchableOpacity
                onPress={() => setIsAuthModalOpen(true)}
                activeOpacity={0.75}
              >
                <Text style={styles.bloomTagline}>
                  {userProfile?.verificationStatus === 'VERIFIED'
                    ? '✓ VERIFIED CORPORATE ID · IN BLOOM'
                    : 'YOUR WELLNESS, IN BLOOM'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.streakPill}
                onPress={async () => {
                  await triggerHapticSelection();
                  setStreakModalVisible(true);
                }}
                activeOpacity={0.8}
              >
                <Icon name="flame" size={14} color="#B87D4B" />
                <Text style={styles.streakPillText}>
                  {employee.currentStreakDays}-day streak
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Main Active Screen */}
          <View style={styles.screenArea}>{renderCurrentScreen()}</View>

          {/* Floating 5-Tab Bottom Navigation Bar */}
          {isFullyOnboarded && isGateUnlocked && (
            <View style={styles.floatingDockWrapper} pointerEvents="box-none">
              <View style={styles.floatingDock}>
                {TAB_ITEMS.map((tab) => {
                  const isActive = activeTab === tab.key;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      style={styles.dockTabItem}
                      onPress={() => handleTabPress(tab.key)}
                      activeOpacity={0.8}
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

      {/* Role-Based Login & Demo Switcher Modal */}
      <AuthModal />

      {/* Working Notifications Modal */}
      <Modal
        visible={notificationsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNotificationsModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Workspace Notifications</Text>
                <Text style={styles.modalSubtitle}>
                  {unreadCount > 0
                    ? `${unreadCount} unread wellness updates`
                    : 'All caught up for today'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setNotificationsModalVisible(false)}
              >
                <Icon name="close" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {notifications.map((item) => (
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
              ))}
            </ScrollView>

            <View style={styles.modalFooterRow}>
              <TouchableOpacity
                style={styles.secondaryModalBtn}
                onPress={async () => {
                  await triggerHapticNotification();
                  markAllNotificationsRead();
                }}
              >
                <Text style={styles.secondaryModalBtnText}>Mark all read</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryModalBtn}
                onPress={() => setNotificationsModalVisible(false)}
              >
                <Text style={styles.primaryModalBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Working Daily Streak Check-In Modal */}
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
                <View>
                  <Text style={styles.modalTitle}>
                    {employee.currentStreakDays}-Day Wellness Streak
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    Consistent small habits build lasting calm
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setStreakModalVisible(false)}
              >
                <Icon name="close" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.weekDaysRow}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                <View key={`${day}-${idx}`} style={styles.dayCol}>
                  <View style={styles.dayCheckCircle}>
                    <Icon name="check" size={12} color={colors.primary} />
                  </View>
                  <Text style={styles.dayLabel}>{day}</Text>
                </View>
              ))}
            </View>

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
                  setActiveTab('activities');
                }}
              >
                <Text style={styles.secondaryModalBtnText}>Open Activities</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryModalBtn}
                onPress={handleStreakCheckIn}
              >
                <Text style={styles.primaryModalBtnText}>Log today’s check-in</Text>
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
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 16 : 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFECE6',
    backgroundColor: colors.background,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbRoot: {
    fontSize: 12,
    color: '#8A8E89',
    fontWeight: '500',
  },
  breadcrumbSlash: {
    fontSize: 12,
    color: '#C5C2BA',
    marginHorizontal: 7,
  },
  breadcrumbCurrent: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bellButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D97757',
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D8C3B0',
    borderWidth: 2,
    borderColor: '#EFE7DEC8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3F352C',
    letterSpacing: 0.3,
  },
  bloomSubBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 6,
  },
  bloomTagline: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.4,
    color: '#8A8E89',
    textTransform: 'uppercase',
  },
  streakPill: {
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
    paddingVertical: 8,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockIconPill: {
    width: 44,
    height: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockIconPillActive: {
    backgroundColor: '#DFECE2',
  },
  dockLabel: {
    fontSize: 10,
    marginTop: 3,
  },
  dockLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  dockLabelInactive: {
    color: '#8A8E89',
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 32, 29, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FAF9F5',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8E4DC',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EFECE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ECE8E1',
  },
  notificationItemUnread: {
    borderColor: '#C5DEC0',
    backgroundColor: '#F5FAF4',
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
  },
  notificationTime: {
    fontSize: 11,
    color: colors.textMuted,
  },
  notificationBody: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  modalFooterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  secondaryModalBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#EFECE6',
  },
  secondaryModalBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  primaryModalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  primaryModalBtnText: {
    fontSize: 12,
    fontWeight: '600',
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
    borderRadius: 12,
    backgroundColor: '#F5EFE6',
    borderWidth: 1,
    borderColor: '#EAE0D3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ECE8E1',
    marginVertical: 8,
  },
  dayCol: {
    alignItems: 'center',
    gap: 6,
  },
  dayCheckCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#DFECE2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  streakSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8F3E6',
    padding: 10,
    borderRadius: 12,
    marginTop: 6,
  },
  streakSuccessText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
});
