import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useWellness } from '../../context/WellnessContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { getDailyStepStorageKey } from '../../services/healthService';
import { colors } from '../../theme/colors';
import { Icon } from '../../components/common/Icon';
import {
  triggerHapticNotification,
  triggerHapticSelection,
} from '../../utils/haptics';

const DEPARTMENTS = [
  'Design & Creative',
  'Engineering',
  'Product & Design',
  'Executive Leadership',
  'People & HR',
  'Global Operations',
];

export const SettingsScreen = () => {
  const {
    employee,
    userProfile,
    liveDiagnostics,
    setOnboardingStep,
    requestAllHealthPermissions,
    forceSyncNow,
    logout,
    goals,
    joinedChallengeIds,
    directoryEmployees,
    privacyAuditLogs,
    notificationPrefs,
    updateNotificationPrefs,
    setActiveTab,
    setIsAuthModalOpen,
    loginAsDemoEmployee,
    loginAsDemoHrAdmin,
    updateProfileAndGoals,
    updateHrPrivacyConsent,
    inspectEmployeeHealthForHr,
    deleteAccount,
    blockedUsers,
    unblockCommunityUser,
    moderationReports,
    getCompanyAggregateInsights,
    personalizationPrefs,
    updatePersonalizationPrefs,
    healthSyncPaused,
    togglePauseHealthSync,
    disconnectHealthSource,
  } = useWellness();

  const [toastMsg, setToastMsg] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteConfirmModalVisible, setDeleteConfirmModalVisible] = useState(false);
  const [diagnosticsExpanded, setDiagnosticsExpanded] = useState(false);
  const [dbInspectorVisible, setDbInspectorVisible] = useState(false);
  const [dbSnapshot, setDbSnapshot] = useState([]);

  // HR Inspector Modal State
  const [inspectedEmployee, setInspectedEmployee] = useState(null);
  const [hrForbiddenError, setHrForbiddenError] = useState(null);

  // Edit profile form
  const [nameInput, setNameInput] = useState(userProfile?.fullName || employee.name);
  const [emailInput, setEmailInput] = useState(userProfile?.email || employee.email);
  const [companyInput, setCompanyInput] = useState(
    userProfile?.companyName || employee.companyName,
  );
  const [deptInput, setDeptInput] = useState(
    userProfile?.department || employee.department,
  );
  const [stepGoalInput, setStepGoalInput] = useState(String(goals.dailyStepsGoal));

  const initials =
    (userProfile?.fullName || employee.name || 'US')
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'US';

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg((prev) => (prev === msg ? null : prev)), 3200);
  };

  const handleToggleMasterHrConsent = async (nextValue) => {
    await triggerHapticNotification();
    await updateHrPrivacyConsent(nextValue, {
      shareSteps: nextValue,
      shareHeartRateAndStress: nextValue,
      shareSleepAndRecovery: nextValue,
    });
    showToast(
      nextValue
        ? 'You opted in to share selected health metrics with HR.'
        : 'Health sharing turned OFF. HR cannot view your personal readings.',
    );
  };

  const handleToggleGranular = async (key) => {
    await triggerHapticSelection();
    const updatedValue = !employee.granularConsent[key];
    const nextGranular = {
      ...employee.granularConsent,
      [key]: updatedValue,
    };
    const anyEnabled =
      nextGranular.shareSteps ||
      nextGranular.shareHeartRateAndStress ||
      nextGranular.shareSleepAndRecovery;
    await updateHrPrivacyConsent(anyEnabled, nextGranular);
    showToast('Updated your health sharing preferences.');
  };

  const handleInspectEmployee = async (target) => {
    await triggerHapticSelection();
    const result = await inspectEmployeeHealthForHr(target.id);
    if (!result.allowed) {
      setInspectedEmployee(null);
      setHrForbiddenError(
        result.errorMessage ||
        'Access blocked: Employee has not opted in to share health data with HR.',
      );
    } else {
      setHrForbiddenError(null);
      setInspectedEmployee(result.employee || target);
    }
  };

  const handleInspectDatabase = async () => {
    await triggerHapticSelection();
    const stepKey = getDailyStepStorageKey();
    const uidStepKey = userProfile?.uid ? `${stepKey}_${userProfile.uid}` : null;
    const keysToInspect = [
      '@pulsecorp_auth_accounts_v2',
      '@pulsecorp_active_session_v2',
      '@pulsecorp_user_profiles_v2',
      '@pulsecorp_companies_db_v2',
      '@pulsecorp_company_roster_db_v2',
      '@pulsecorp_id_submissions_db_v2',
      '@pulsecorp_health_permissions_v2',
      stepKey,
      ...(uidStepKey ? [uidStepKey] : []),
      '@pulsecorp_app_workspace_v2',
    ];

    const rows = [];
    for (const k of keysToInspect) {
      try {
        const raw = await AsyncStorage.getItem(k);
        if (!raw) {
          rows.push({
            key: k,
            status: 'EMPTY',
            preview: 'No data saved under this key yet.',
          });
          continue;
        }
        let parsed = JSON.parse(raw);
        if (k === '@pulsecorp_auth_accounts_v2' && Array.isArray(parsed)) {
          parsed = parsed.map((acc) => ({
            uid: acc.uid,
            email: acc.email,
            passwordHash: acc.passwordHash ? 'fnv1a_***' : 'none',
            createdAt: acc.createdAt,
          }));
        }
        const pretty = JSON.stringify(parsed, null, 2);
        rows.push({
          key: k,
          status: `SAVED (${raw.length} chars)`,
          preview: pretty.length > 650 ? `${pretty.slice(0, 650)}\n...` : pretty,
        });
      } catch {
        rows.push({
          key: k,
          status: 'ERROR',
          preview: 'Failed to read AsyncStorage key.',
        });
      }
    }
    setDbSnapshot(rows);
    setDbInspectorVisible(true);
  };

  const handleSaveProfile = async () => {
    await triggerHapticNotification();
    updateProfileAndGoals(
      {
        name: nameInput.trim() || employee.name || 'Employee',
        email: emailInput.trim() || employee.email,
        companyName: companyInput.trim() || employee.companyName || 'Workspace',
        department: deptInput,
        officeBranch: `${companyInput.trim() || 'Workspace'} · ${deptInput}`,
      },
      {
        dailyStepsGoal: parseInt(stepGoalInput, 10) || 10000,
      },
    );
    setEditModalVisible(false);
    showToast('Profile and daily step goal saved.');
  };

  const idStatusLabel =
    userProfile?.verificationStatus === 'VERIFIED'
      ? '✓ ID Verified by HR'
      : userProfile?.verificationStatus === 'UNDER_REVIEW'
        ? 'ID Uploaded · Pending HR Review'
        : 'ID Upload Optional (Not Submitted)';

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

        <Text style={styles.storyTitle}>Profile &amp; Privacy</Text>
        <Text style={styles.storySubtitle}>
          Manage your personal goals, notification choices, and health data privacy.
        </Text>

        {/* 1. Profile Card */}
        <View style={styles.profileCardOuter}>
          <LinearGradient
            colors={['#EFF5EC', '#F9FBF8', '#FFFFFF']}
            locations={[0, 0.35, 1]}
            style={styles.profileCard}
          >
            <TouchableOpacity
              onPress={() => {
                triggerHapticSelection();
                setEditModalVisible(true);
              }}
              activeOpacity={0.85}
              style={styles.avatarOuterRing}
              accessibilityRole="button"
              accessibilityLabel="Edit profile and goals"
            >
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.profileName}>
              {userProfile?.fullName || employee.name || 'Signed-In User'}
            </Text>
            <Text style={styles.profileEmail}>
              {userProfile?.email || employee.email}
            </Text>

            <View style={styles.idStatusPill}>
              <Text style={styles.idStatusPillText}>{idStatusLabel}</Text>
            </View>

            <TouchableOpacity
              style={styles.deptBadge}
              onPress={() => setEditModalVisible(true)}
              accessibilityRole="button"
            >
              <Text style={styles.deptBadgeText}>
                {userProfile?.companyName || employee.companyName || 'Company'} ·{' '}
                {userProfile?.department || employee.department}
              </Text>
            </TouchableOpacity>

            <View style={styles.dividerLine} />

            {/* 3-Column Stats Row */}
            <View style={styles.statsThreeColRow}>
              <TouchableOpacity
                style={styles.statColumn}
                onPress={() => setActiveTab('home')}
                accessibilityRole="button"
              >
                <Text style={styles.statBigValue}>{employee.currentStreakDays}</Text>
                <Text style={styles.statSubLabel}>check-ins</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.statColumn}
                onPress={() => setActiveTab('leaderboard')}
                accessibilityRole="button"
              >
                <Text style={styles.statBigValue}>{joinedChallengeIds.length}</Text>
                <Text style={styles.statSubLabel}>challenges joined</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.statColumn}
                onPress={() => setEditModalVisible(true)}
                accessibilityRole="button"
              >
                <Text style={styles.statBigValue}>
                  {goals.dailyStepsGoal.toLocaleString()}
                </Text>
                <Text style={styles.statSubLabel}>daily step goal</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dividerLine} />

            {/* Quick Setup & Account Buttons */}
            <View style={styles.quickSetupBtnsWrap}>
              <TouchableOpacity
                style={styles.exploreOnboardingBtn}
                onPress={() => setEditModalVisible(true)}
                accessibilityRole="button"
              >
                <Text style={styles.exploreOnboardingText}>Edit Profile &amp; Goal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.exploreOnboardingBtn}
                onPress={() => setOnboardingStep('BIOMETRICS')}
                accessibilityRole="button"
              >
                <Text style={styles.exploreOnboardingText}>Body &amp; Stride Info</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.exploreOnboardingBtn}
                onPress={() => setOnboardingStep('COMPANY_ID_VERIFICATION')}
                accessibilityRole="button"
              >
                <Text style={styles.exploreOnboardingText}>Workspace &amp; ID</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.exploreOnboardingBtn}
                onPress={() => setOnboardingStep('HEALTH_PERMISSIONS')}
                accessibilityRole="button"
              >
                <Text style={styles.exploreOnboardingText}>Health Permissions</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.exploreOnboardingBtn, { borderColor: '#E5B8B8' }]}
                onPress={logout}
                accessibilityRole="button"
              >
                <Text style={[styles.exploreOnboardingText, { color: '#9E3333' }]}>
                  Sign Out
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.exploreOnboardingBtn,
                  { borderColor: '#D98282', backgroundColor: '#FDF2F2' },
                ]}
                onPress={() => setDeleteConfirmModalVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="Delete account and all personal data"
              >
                <Text style={[styles.exploreOnboardingText, { color: '#9E3333' }]}>
                  Delete Account &amp; Data
                </Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Non-Medical Wellness Disclaimer */}
        <View style={styles.privacyCard}>
          <Text style={styles.privacyEyebrow}>WELLNESS &amp; SAFETY NOTICE</Text>
          <Text style={styles.privacyTitle}>Non-Medical Wellness Companion</Text>
          <Text style={styles.privacyDesc}>
            PulseCorp is designed for general workplace wellness, movement, hydration, and
            mindfulness habits. It is not a medical device and does not provide medical diagnosis,
            clinical monitoring, or treatment advice.
          </Text>
        </View>

        {/* Health Connection Controls: Pause Sync, Manage Permissions & Disconnect */}
        <View style={styles.privacyCard}>
          <Text style={styles.privacyEyebrow}>HEALTH CONNECTION CONTROLS</Text>
          <Text style={styles.privacyTitle}>Sensor &amp; Health Connect Sync</Text>
          <Text style={styles.privacyDesc}>
            {healthSyncPaused
              ? '⏸ Sync is currently PAUSED. No background sensor or Health Connect reads occur while paused. You can still log water, walks, and breathing manually.'
              : '🟢 Sync is active for permitted sensors. You can pause sync or disconnect your health source at any time.'}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <TouchableOpacity
              style={[
                styles.exploreOnboardingBtn,
                healthSyncPaused && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => {
                togglePauseHealthSync();
                showToast(
                  healthSyncPaused
                    ? 'Resumed health sensor sync.'
                    : 'Paused automatic health sync.',
                );
              }}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.exploreOnboardingText,
                  healthSyncPaused && { color: '#FFFFFF' },
                ]}
              >
                {healthSyncPaused ? 'Resume Health Sync' : 'Pause Health Sync'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.exploreOnboardingBtn}
              onPress={() => setOnboardingStep('HEALTH_PERMISSIONS')}
              accessibilityRole="button"
            >
              <Text style={styles.exploreOnboardingText}>Manage Permissions</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.exploreOnboardingBtn, { borderColor: '#E5B8B8' }]}
              onPress={async () => {
                await disconnectHealthSource();
                showToast('Disconnected health source and switched to manual mode.');
              }}
              accessibilityRole="button"
            >
              <Text style={[styles.exploreOnboardingText, { color: '#9E3333' }]}>
                Disconnect Source
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Personalization, Preferred Reminder Schedule & Feature Opt-Outs */}
        <View style={styles.privacyCard}>
          <Text style={styles.privacyEyebrow}>PERSONALIZATION &amp; OPT-OUT CONTROLS</Text>
          <Text style={styles.privacyTitle}>Your Experience Preferences</Text>
          <Text style={styles.privacyDesc}>
            Choose your preferred reminder time and opt out of streaks, leaderboards, or social
            prompts whenever you prefer a quieter experience.
          </Text>

          <Text style={[styles.fieldLabel, { marginTop: 4 }]}>PREFERRED REMINDER TIME</Text>
          <View style={styles.granularRow}>
            {['09:30 AM', '12:30 PM', '03:30 PM', '05:30 PM'].map((t) => {
              const active = personalizationPrefs?.preferredReminderTime === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.granularChip, active && styles.granularChipActive]}
                  onPress={() => updatePersonalizationPrefs({ preferredReminderTime: t })}
                >
                  <Text
                    style={[
                      styles.granularChipText,
                      active && styles.granularChipTextActive,
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.prefSwitchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.prefSwitchTitle}>Show check-in counter &amp; streaks</Text>
              <Text style={styles.prefSwitchSub}>
                Turn off to hide check-in counts from the top bar and Today screen
              </Text>
            </View>
            <Switch
              value={personalizationPrefs?.showStreaksAndCheckIns !== false}
              onValueChange={(v) =>
                updatePersonalizationPrefs({ showStreaksAndCheckIns: v })
              }
              trackColor={{ false: '#D8D4CC', true: '#4A7C59' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.prefSwitchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.prefSwitchTitle}>Keep challenge progress private</Text>
              <Text style={styles.prefSwitchSub}>
                Participate in challenges while hiding your numbers from team rankings
              </Text>
            </View>
            <Switch
              value={Boolean(personalizationPrefs?.keepChallengeProgressPrivate)}
              onValueChange={(v) =>
                updatePersonalizationPrefs({
                  keepChallengeProgressPrivate: v,
                  showLeaderboardRankings: !v,
                })
              }
              trackColor={{ false: '#D8D4CC', true: '#4A7C59' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Community Safety: Blocked Users & Moderation Reports */}
        <View style={styles.privacyCard}>
          <Text style={styles.privacyEyebrow}>COMMUNITY SAFETY &amp; MODERATION</Text>
          <Text style={styles.privacyTitle}>Blocked Users &amp; Content Reports</Text>
          <Text style={styles.privacyDesc}>
            Posts and messages from users you block are hidden across the app. Reported items are
            hidden immediately and logged for moderation review.
          </Text>

          {blockedUsers.length === 0 ? (
            <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>
              No blocked users.
            </Text>
          ) : (
            blockedUsers.map((bu) => (
              <View
                key={bu.id}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: '#EFECE6',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textPrimary }}>
                  {bu.name}
                </Text>
                <TouchableOpacity
                  style={{
                    minHeight: 40,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    backgroundColor: '#EFECE6',
                    justifyContent: 'center',
                  }}
                  onPress={() => {
                    unblockCommunityUser(bu.id);
                    showToast(`Unblocked ${bu.name}.`);
                  }}
                  accessibilityRole="button"
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }}>
                    Unblock
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}

          {moderationReports.length > 0 && (
            <View style={styles.auditLogBox}>
              <Text style={styles.auditLogTitle}>
                SUBMITTED CONTENT REPORTS ({moderationReports.length})
              </Text>
              {moderationReports.slice(0, 4).map((rep) => (
                <Text key={rep.id} style={styles.auditLogLine}>
                  • [{rep.status}] {rep.targetType} by {rep.authorName} — Reason: {rep.reason}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* 2. Explicit HR Health Data Permission Toggle (Defaults to FALSE) */}
        <View style={styles.privacyCard}>
          <View style={styles.privacyHeaderRow}>
            <View style={styles.shieldIconBox}>
              <Icon name="shield" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.privacyEyebrow}>PRIVACY &amp; SHARING CONTROL</Text>
              <Text style={styles.privacyTitle}>Share My Health Data with HR</Text>
            </View>
            <Switch
              value={employee.hrHealthConsent}
              onValueChange={handleToggleMasterHrConsent}
              trackColor={{ false: '#D8D4CC', true: '#4A7C59' }}
              thumbColor="#FFFFFF"
              accessibilityLabel="Share my health data with HR"
            />
          </View>

          <Text style={styles.privacyDesc}>
            {employee.hrHealthConsent
              ? '✓ Opted In: HR Admin roles in this demo can view the health categories you check below.'
              : '🔒 Private (Default): Turned OFF by default. HR Admins are blocked from viewing your personal health metrics.'}
          </Text>

          <View style={styles.granularRow}>
            {[
              {
                key: 'shareSteps',
                label: 'Steps & Distance',
                checked: employee.granularConsent.shareSteps,
              },
              {
                key: 'shareHeartRateAndStress',
                label: 'Heart Rate & Stress',
                checked: employee.granularConsent.shareHeartRateAndStress,
              },
              {
                key: 'shareSleepAndRecovery',
                label: 'Sleep & Recovery',
                checked: employee.granularConsent.shareSleepAndRecovery,
              },
            ].map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.granularChip,
                  item.checked && employee.hrHealthConsent && styles.granularChipActive,
                ]}
                onPress={() => handleToggleGranular(item.key)}
                accessibilityRole="button"
                accessibilityLabel={`Toggle sharing ${item.label}`}
              >
                <Text
                  style={[
                    styles.granularChipText,
                    item.checked &&
                    employee.hrHealthConsent &&
                    styles.granularChipTextActive,
                  ]}
                >
                  {item.checked && employee.hrHealthConsent ? '☑ ' : '☐ '}
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {privacyAuditLogs.length > 0 && (
            <View style={styles.auditLogBox}>
              <Text style={styles.auditLogTitle}>RECENT CONSENT CHANGES (LOCAL LOG)</Text>
              {privacyAuditLogs.slice(0, 3).map((entry) => (
                <Text key={entry.id} style={styles.auditLogLine}>
                  • [{entry.timestamp}] {entry.details}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* 3. Notification & Reminder Controls */}
        <View style={styles.privacyCard}>
          <Text style={styles.privacyEyebrow}>NOTIFICATION CHOICES</Text>
          <Text style={styles.privacyTitle}>Reminders &amp; Updates</Text>
          <Text style={styles.privacyDesc}>
            Choose which reminders you want to see. We never send guilt-based streak alerts.
          </Text>

          <View style={styles.prefSwitchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.prefSwitchTitle}>Daily check-in reminders</Text>
              <Text style={styles.prefSwitchSub}>
                Gentle reminder to pause, breathe, or log water
              </Text>
            </View>
            <Switch
              value={notificationPrefs.dailyCheckInReminders}
              onValueChange={(v) =>
                updateNotificationPrefs({ dailyCheckInReminders: v })
              }
              trackColor={{ false: '#D8D4CC', true: '#4A7C59' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.prefSwitchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.prefSwitchTitle}>Team activity updates</Text>
              <Text style={styles.prefSwitchSub}>
                Updates when coworkers propose a new group walk or session
              </Text>
            </View>
            <Switch
              value={notificationPrefs.teamActivityUpdates}
              onValueChange={(v) => updateNotificationPrefs({ teamActivityUpdates: v })}
              trackColor={{ false: '#D8D4CC', true: '#4A7C59' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.prefSwitchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.prefSwitchTitle}>Community replies</Text>
              <Text style={styles.prefSwitchSub}>
                Alerts when someone replies to your community post
              </Text>
            </View>
            <Switch
              value={notificationPrefs.communityReplies}
              onValueChange={(v) => updateNotificationPrefs({ communityReplies: v })}
              trackColor={{ false: '#D8D4CC', true: '#4A7C59' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* 4. HR Consent & Role Check Preview (Client-Side Demo) */}
        <View style={styles.hrPortalCard}>
          <Text style={styles.privacyEyebrow}>
            AGGREGATE WORKPLACE INSIGHTS &amp; CONSENT DEMO · ROLE: {employee.userRole}
          </Text>
          <Text style={styles.privacyTitle}>Workplace Privacy &amp; Aggregate Insights</Text>
          <Text style={styles.privacyDesc}>
            By default, PulseCorp favors aggregate team participation insights over exposing any
            individual’s personal health readings. Individual health summaries below are locked
            unless the active role is HR Admin AND that person has explicitly opted in.
          </Text>

          {/* Privacy-Safe Aggregate Team Summary Card with Minimum Group-Size Protection (k >= 5) */}
          {(() => {
            const agg = getCompanyAggregateInsights();
            return (
              <View
                style={{
                  backgroundColor: '#EBF3EC',
                  borderRadius: 16,
                  padding: 14,
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
                    marginBottom: 4,
                  }}
                >
                  ✓ PRIVACY-SAFE AGGREGATE WORKPLACE OVERVIEW (MIN GROUP SIZE: {agg.minGroupSizeRequired})
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
                  {agg.totalMembers} workspace members · {agg.optedInCount} opted in to share
                </Text>
                <Text style={{ fontSize: 11.5, color: colors.textSecondary, marginTop: 2 }}>
                  {agg.meetsMinimumGroupSize
                    ? `Aggregate average daily movement: ${agg.avgSteps?.toLocaleString()} steps`
                    : `Aggregate averages hidden until at least ${agg.minGroupSizeRequired} members opt in (prevents re-identifying individuals in small groups).`}
                </Text>
              </View>
            );
          })()}

          {/* Role Switcher Buttons */}
          <View style={styles.roleSwitchButtonsRow}>
            <TouchableOpacity
              style={[
                styles.roleSwitchBtn,
                employee.userRole === 'EMPLOYEE' && styles.roleSwitchBtnActive,
              ]}
              onPress={async () => {
                await triggerHapticSelection();
                loginAsDemoEmployee();
                setHrForbiddenError(null);
                showToast('Active role set to Employee.');
              }}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.roleSwitchBtnText,
                  employee.userRole === 'EMPLOYEE' && styles.roleSwitchBtnTextActive,
                ]}
              >
                {employee.userRole === 'EMPLOYEE' ? '✓ ' : ''}Employee Role
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleSwitchBtn,
                employee.userRole === 'HR_ADMIN' && styles.roleSwitchBtnActive,
              ]}
              onPress={async () => {
                await triggerHapticSelection();
                loginAsDemoHrAdmin();
                setHrForbiddenError(null);
                showToast('Active role set to HR Admin (Demo).');
              }}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.roleSwitchBtnText,
                  employee.userRole === 'HR_ADMIN' && styles.roleSwitchBtnTextActive,
                ]}
              >
                {employee.userRole === 'HR_ADMIN' ? '✓ ' : ''}HR Admin (Demo)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.openLoginModalBtn}
              onPress={() => setIsAuthModalOpen(true)}
              accessibilityRole="button"
            >
              <Text style={styles.openLoginModalBtnText}>More</Text>
            </TouchableOpacity>
          </View>

          {hrForbiddenError && (
            <View style={styles.forbiddenAlertBanner} accessibilityRole="alert">
              <Icon name="lock" size={16} color={colors.danger} />
              <Text style={styles.forbiddenAlertText}>{hrForbiddenError}</Text>
            </View>
          )}

          {directoryEmployees.map((emp) => {
            const isConsented = emp.hrHealthConsent;
            return (
              <TouchableOpacity
                key={emp.id}
                style={[styles.dirRow, !isConsented && styles.dirRowLocked]}
                onPress={() => handleInspectEmployee(emp)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`Inspect ${emp.name}. Consent status: ${isConsented ? 'Opted in' : 'Private, no consent'
                  }`}
              >
                <View style={styles.dirAvatar}>
                  <Text style={styles.dirAvatarText}>
                    {emp.name
                      .split(' ')
                      .map((p) => p[0])
                      .join('')
                      .slice(0, 2)}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.dirName}>
                    {emp.name} {emp.id === employee.id ? '(You)' : ''}
                  </Text>
                  <Text style={styles.dirSub}>
                    {emp.officeBranch} · {emp.role}
                  </Text>
                </View>

                <View
                  style={[
                    styles.consentBadge,
                    isConsented ? styles.consentBadgeGranted : styles.consentBadgeDenied,
                  ]}
                >
                  <Text
                    style={[
                      styles.consentBadgeText,
                      isConsented
                        ? styles.consentBadgeTextGranted
                        : styles.consentBadgeTextDenied,
                    ]}
                  >
                    {isConsented ? '✓ Opted In' : '🔒 Private'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 5. Collapsible Technical & Sensor Diagnostics (Moved off HomeScreen) */}
        <View style={styles.privacyCard}>
          <TouchableOpacity
            style={styles.diagnosticsHeaderTouch}
            onPress={async () => {
              await triggerHapticSelection();
              setDiagnosticsExpanded((prev) => !prev);
            }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={
              diagnosticsExpanded
                ? 'Hide technical and sensor diagnostics'
                : 'Show technical and sensor diagnostics'
            }
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.privacyEyebrow}>DEVELOPER &amp; SENSOR DIAGNOSTICS</Text>
              <Text style={styles.privacyTitle}>
                {diagnosticsExpanded
                  ? 'Hide Technical Diagnostics ▲'
                  : 'Show Technical & Sensor Diagnostics ▼'}
              </Text>
            </View>
          </TouchableOpacity>

          {diagnosticsExpanded && (
            <View style={styles.diagnosticsBody}>
              <Text style={styles.diagLine}>
                <Text style={styles.diagBold}>Step Sensor Status: </Text>
                {liveDiagnostics.sensorStatus}
              </Text>
              <Text style={styles.diagLine}>
                <Text style={styles.diagBold}>OS Health Store: </Text>
                {liveDiagnostics.nativeHealthStoreStatus}
              </Text>
              <Text style={styles.diagLine}>
                <Text style={styles.diagBold}>Calibrated Stride &amp; BMR: </Text>
                {userProfile?.strideLengthMeters || 0} m · {userProfile?.bmrKcal || 0} kcal/day ·
                BMI {userProfile?.bmi || 0}
              </Text>
              <Text style={styles.diagLine}>
                <Text style={styles.diagBold}>Live Motion &amp; Cadence: </Text>
                {liveDiagnostics.movementState} · {liveDiagnostics.cadenceStepsPerMin} SPM ·{' '}
                {liveDiagnostics.accelerationMagnitudeG.toFixed(2)}g (Peak{' '}
                {liveDiagnostics.peakGForce.toFixed(2)}g)
              </Text>
              <Text style={styles.diagLine}>
                <Text style={styles.diagBold}>Shake Filter Gate: </Text>
                {liveDiagnostics.antiCheatStatus} (Filtered shakes:{' '}
                {liveDiagnostics.rejectedShakeSteps})
              </Text>
              <Text style={styles.diagLine}>
                <Text style={styles.diagBold}>Local Storage Key: </Text>
                {liveDiagnostics.dailyStorageKey}
              </Text>
              <Text style={styles.diagLine}>
                <Text style={styles.diagBold}>Remote Supabase Configured: </Text>
                {isSupabaseConfigured
                  ? 'Yes (Environment variables present)'
                  : 'No (Running in local AsyncStorage mode)'}
              </Text>

              <View style={styles.diagButtonsRow}>
                <TouchableOpacity
                  style={styles.diagActionBtn}
                  onPress={async () => {
                    await requestAllHealthPermissions();
                    await forceSyncNow();
                    showToast('Re-checked sensor and health permissions.');
                  }}
                  accessibilityRole="button"
                >
                  <Text style={styles.diagActionBtnText}>Re-Check Sensors</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.diagActionBtn}
                  onPress={handleInspectDatabase}
                  accessibilityRole="button"
                >
                  <Text style={styles.diagActionBtnText}>Inspect Local Storage</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* MODAL 1: HR Employee Health Inspector */}
      <Modal
        visible={inspectedEmployee !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setInspectedEmployee(null)}
      >
        <View style={styles.modalOverlay}>
          {inspectedEmployee && (
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.privacyEyebrow}>
                    CONSENT VERIFIED (LOCAL DEMO)
                  </Text>
                  <Text style={styles.modalTitle}>
                    {inspectedEmployee.name}
                  </Text>
                  <Text style={styles.dirSub}>
                    {inspectedEmployee.officeBranch} · {inspectedEmployee.lastSyncedAt}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeCircle}
                  onPress={() => setInspectedEmployee(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Close employee health inspector"
                >
                  <Icon name="close" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.inspectorGrid}>
                <View style={styles.inspectorStatTile}>
                  <Text style={styles.inspectorStatVal}>
                    {inspectedEmployee.metrics.steps.toLocaleString()}
                  </Text>
                  <Text style={styles.dirSub}>
                    Steps / {inspectedEmployee.metrics.stepsGoal.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.inspectorStatTile}>
                  <Text style={styles.inspectorStatVal}>
                    {inspectedEmployee.metrics.bpm > 0
                      ? `${inspectedEmployee.metrics.bpm} BPM`
                      : 'No reading'}
                  </Text>
                  <Text style={styles.dirSub}>Heart Rate</Text>
                </View>
                <View style={styles.inspectorStatTile}>
                  <Text style={styles.inspectorStatVal}>
                    {inspectedEmployee.metrics.sleepHours}
                  </Text>
                  <Text style={styles.dirSub}>Sleep</Text>
                </View>
                <View style={styles.inspectorStatTile}>
                  <Text style={styles.inspectorStatVal}>
                    {inspectedEmployee.metrics.activeKcal} kcal
                  </Text>
                  <Text style={styles.dirSub}>Active Energy</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.saveModalBtn}
                onPress={() => setInspectedEmployee(null)}
                accessibilityRole="button"
              >
                <Text style={styles.saveModalBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* MODAL 2: Edit Profile & Daily Step Goal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile &amp; Daily Goal</Text>
              <TouchableOpacity
                style={styles.closeCircle}
                onPress={() => setEditModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close edit profile modal"
              >
                <Icon name="close" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>FULL NAME</Text>
            <TextInput
              style={styles.input}
              value={nameInput}
              onChangeText={setNameInput}
              accessibilityLabel="Full name"
            />

            <Text style={styles.fieldLabel}>EMAIL</Text>
            <TextInput
              style={styles.input}
              value={emailInput}
              onChangeText={setEmailInput}
              accessibilityLabel="Email"
            />

            <Text style={styles.fieldLabel}>COMPANY / WORKSPACE</Text>
            <TextInput
              style={styles.input}
              value={companyInput}
              onChangeText={setCompanyInput}
              accessibilityLabel="Company name"
            />

            <Text style={styles.fieldLabel}>DEPARTMENT</Text>
            <View style={styles.granularRow}>
              {DEPARTMENTS.map((dept) => {
                const selected = deptInput === dept;
                return (
                  <TouchableOpacity
                    key={dept}
                    style={[
                      styles.granularChip,
                      selected && styles.granularChipActive,
                    ]}
                    onPress={() => setDeptInput(dept)}
                    accessibilityRole="button"
                  >
                    <Text
                      style={[
                        styles.granularChipText,
                        selected && styles.granularChipTextActive,
                      ]}
                    >
                      {dept}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>DAILY STEPS GOAL</Text>
            <TextInput
              style={styles.input}
              value={stepGoalInput}
              onChangeText={setStepGoalInput}
              keyboardType="numeric"
              accessibilityLabel="Daily steps goal"
            />

            <TouchableOpacity
              style={styles.saveModalBtn}
              onPress={handleSaveProfile}
              accessibilityRole="button"
            >
              <Text style={styles.saveModalBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: Local AsyncStorage Inspector */}
      <Modal
        visible={dbInspectorVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDbInspectorVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.privacyEyebrow}>LOCAL DEVICE STORAGE</Text>
                <Text style={styles.modalTitle}>Saved AsyncStorage Records</Text>
              </View>
              <TouchableOpacity
                style={styles.closeCircle}
                onPress={() => setDbInspectorVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close storage inspector"
              >
                <Icon name="close" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {dbSnapshot.map((row) => (
                <View key={row.key} style={styles.storageKeyCard}>
                  <View style={styles.storageKeyHeader}>
                    <Text style={styles.storageKeyTitle}>{row.key}</Text>
                    <Text
                      style={[
                        styles.storageKeyStatus,
                        { color: row.status === 'EMPTY' ? '#9E3333' : '#2E5C3E' },
                      ]}
                    >
                      {row.status}
                    </Text>
                  </View>
                  <Text style={styles.storageKeyPreview}>{row.preview}</Text>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.saveModalBtn}
              onPress={handleInspectDatabase}
              accessibilityRole="button"
            >
              <Text style={styles.saveModalBtnText}>Refresh Snapshot</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: Permanent Account & Data Deletion Confirmation */}
      <Modal
        visible={deleteConfirmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={[styles.privacyEyebrow, { color: '#9E3333' }]}>
              PERMANENT ACCOUNT &amp; DATA DELETION
            </Text>
            <Text style={styles.modalTitle}>Delete Your Account?</Text>
            <Text style={[styles.privacyDesc, { marginTop: 8 }]}>
              This action permanently deletes your account profile, saved health and step
              records, HR consent preferences, company ID submission, and any community posts,
              replies, or messages you created. This cannot be undone.
            </Text>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                style={[
                  styles.saveModalBtn,
                  { flex: 1, backgroundColor: '#EFECE6', marginTop: 0 },
                ]}
                onPress={() => setDeleteConfirmModalVisible(false)}
                accessibilityRole="button"
              >
                <Text style={[styles.saveModalBtnText, { color: colors.textPrimary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.saveModalBtn,
                  { flex: 1.3, backgroundColor: '#9E3333', marginTop: 0 },
                ]}
                onPress={async () => {
                  await triggerHapticNotification();
                  setDeleteConfirmModalVisible(false);
                  await deleteAccount();
                }}
                accessibilityRole="button"
                accessibilityLabel="Confirm permanent account deletion"
              >
                <Text style={styles.saveModalBtnText}>Delete Permanently</Text>
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
    flex: 1,
  },
  storyTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  storySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
  profileCardOuter: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    overflow: 'hidden',
    marginBottom: 16,
  },
  profileCard: {
    paddingHorizontal: 20,
    paddingVertical: 22,
    alignItems: 'center',
  },
  avatarOuterRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#F2EAE1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#D8C3B0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 22,
    fontWeight: '700',
    color: '#43382E',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  profileEmail: {
    fontSize: 12.5,
    color: colors.textSecondary,
    marginTop: 3,
  },
  idStatusPill: {
    backgroundColor: '#F3F0EA',
    borderWidth: 1,
    borderColor: '#E2DFD7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 8,
    marginBottom: 8,
  },
  idStatusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  deptBadge: {
    minHeight: 38,
    backgroundColor: '#EBF3EC',
    borderWidth: 1,
    borderColor: '#DCE8DD',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    justifyContent: 'center',
  },
  deptBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryGlow,
  },
  dividerLine: {
    width: '100%',
    height: 1,
    backgroundColor: '#EFECE6',
    marginVertical: 16,
  },
  statsThreeColRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
  },
  statColumn: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  statBigValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statSubLabel: {
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  quickSetupBtnsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  exploreOnboardingBtn: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8D4CA',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  exploreOnboardingText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  privacyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 14,
  },
  privacyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  shieldIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EBF3EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.9,
    color: colors.primaryGlow,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  privacyDesc: {
    fontSize: 12.5,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 10,
  },
  granularRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  granularChip: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FAF9F5',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    justifyContent: 'center',
  },
  granularChipActive: {
    backgroundColor: '#EBF3EC',
    borderColor: '#CBE0CF',
  },
  granularChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  granularChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  auditLogBox: {
    backgroundColor: '#FAF9F5',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  auditLogTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 4,
  },
  auditLogLine: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  prefSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F2EFE9',
    gap: 12,
  },
  prefSwitchTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  prefSwitchSub: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  hrPortalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 14,
  },
  roleSwitchButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  roleSwitchBtn: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FAF9F5',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleSwitchBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleSwitchBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  roleSwitchBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  openLoginModalBtn: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F5EBE1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  openLoginModalBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7A5C43',
  },
  forbiddenAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FDF2F2',
    borderWidth: 1,
    borderColor: '#F5C2C2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  forbiddenAlertText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.danger,
    flex: 1,
    lineHeight: 17,
  },
  dirRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#FAF9F5',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 8,
  },
  dirRowLocked: {
    opacity: 0.9,
  },
  dirAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.sandAvatarBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dirAvatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.sandAvatarText,
  },
  dirName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dirSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  consentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  consentBadgeGranted: {
    backgroundColor: '#E8F2EA',
  },
  consentBadgeDenied: {
    backgroundColor: '#F9E8EA',
  },
  consentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  consentBadgeTextGranted: {
    color: colors.success,
  },
  consentBadgeTextDenied: {
    color: colors.heartRate,
  },
  diagnosticsHeaderTouch: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  diagnosticsBody: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EFECE6',
    gap: 6,
  },
  diagLine: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  diagBold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  diagButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  diagActionBtn: {
    flex: 1,
    minHeight: 48,
    backgroundColor: '#EBF3EC',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  diagActionBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(22, 28, 24, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 388,
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
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFECE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inspectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  inspectorStatTile: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  inspectorStatVal: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    minHeight: 48,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: colors.textPrimary,
  },
  saveModalBtn: {
    minHeight: 48,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  saveModalBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  storageKeyCard: {
    backgroundColor: '#FAF9F5',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E1D8',
    marginBottom: 10,
  },
  storageKeyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  storageKeyTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    flex: 1,
  },
  storageKeyStatus: {
    fontSize: 10,
    fontWeight: '700',
  },
  storageKeyPreview: {
    fontSize: 10.5,
    color: '#4A504B',
  },
});
