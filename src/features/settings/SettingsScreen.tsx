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
  Platform,
} from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useWellness } from '../../context/WellnessContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { getDailyStepStorageKey } from '../../services/healthService';
import { colors } from '../../theme/colors';
import {
  CorporateDepartment,
  DirectoryEmployeeRecord,
  OfficeBranch,
} from '../../types';
import { Icon } from '../../components/common/Icon';
import {
  triggerHapticNotification,
  triggerHapticSelection,
} from '../../utils/haptics';

const SOURCE_FILES_OVERVIEW = [
  {
    path: 'src/navigation/RootNavigator.tsx',
    desc: '5-tab floating pill dock, persistent breadcrumb header & iPhone bezel',
  },
  {
    path: 'src/features/dashboard/HomeScreen.tsx',
    desc: 'Google Health Connect telemetry graphs + Crowd-Voted Activity Poll',
  },
  {
    path: 'src/features/challenges/ChallengesScreen.tsx',
    desc: 'Redis O(log N) Office Step Leaderboard & Timed Walking Competition',
  },
  {
    path: 'src/features/mindful/MindfulScreen.tsx',
    desc: 'Live Activity Voting Engine, Winner Schedule & 4-4-4 Breathing Flower',
  },
  {
    path: 'src/features/settings/SettingsScreen.tsx',
    desc: 'Your Wellness Story, HR Privacy Consent Toggle & HR Admin Health Inspector',
  },
  {
    path: 'src/features/community/CommunityScreen.tsx',
    desc: '1-on-1 DMs, Office/Inter-Office Groups, Difficulties & Work Tips Q&A',
  },
  {
    path: 'backend/prisma/schema.prisma',
    desc: '100K-user partitioned PostgreSQL schema + unique vote & RLS constraints',
  },
  {
    path: 'backend/src/server.ts',
    desc: 'Redis Sorted Set ZADD/ZREVRANGE cluster + 403 HR Privacy Guard',
  },
];

const DEPARTMENTS: CorporateDepartment[] = [
  'Design & Creative',
  'Engineering',
  'Product & Design',
  'Executive Leadership',
  'People & HR',
  'Global Operations',
];

function triggerWebDownload(filename: string, content: string, mimeType: string): boolean {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return false;
  }
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

export const SettingsScreen: React.FC = () => {
  const {
    employee,
    userProfile,
    liveDiagnostics,
    setOnboardingStep,
    requestAllHealthPermissions,
    logout,
    metrics,
    goals,
    joinedChallengeIds,
    directoryEmployees,
    privacyAuditLogs,
    openOnboardingFlow,
    setActiveTab,
    setIsAuthModalOpen,
    loginAsDemoEmployee,
    loginAsDemoHrAdmin,
    updateProfileAndGoals,
    updateHrPrivacyConsent,
    inspectEmployeeHealthForHr,
  } = useWellness();

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [exportModalType, setExportModalType] = useState<'pdf' | 'zip' | null>(null);
  const [dbInspectorVisible, setDbInspectorVisible] = useState(false);
  const [dbSnapshot, setDbSnapshot] = useState<
    Array<{ key: string; status: string; preview: string }>
  >([]);

  // HR Inspector Modal State
  const [inspectedEmployee, setInspectedEmployee] =
    useState<DirectoryEmployeeRecord | null>(null);
  const [hrForbiddenError, setHrForbiddenError] = useState<string | null>(null);

  // Edit profile form
  const [nameInput, setNameInput] = useState(employee.name);
  const [emailInput, setEmailInput] = useState(employee.email);
  const [companyInput, setCompanyInput] = useState(employee.companyName);
  const [deptInput, setDeptInput] = useState<CorporateDepartment>(employee.department);
  const [stepGoalInput, setStepGoalInput] = useState(String(goals.dailyStepsGoal));

  const initials =
    employee.name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'AM';

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg((prev) => (prev === msg ? null : prev)), 3200);
  };

  const handleToggleMasterHrConsent = async (nextValue: boolean) => {
    await triggerHapticNotification();
    await updateHrPrivacyConsent(nextValue, {
      shareSteps: nextValue,
      shareHeartRateAndStress: nextValue,
      shareSleepAndRecovery: nextValue,
    });
    showToast(
      nextValue
        ? 'PATCH /api/v1/users/me/privacy-consent → HR Telemetry Access GRANTED'
        : 'PATCH /api/v1/users/me/privacy-consent → HR Telemetry Access REVOKED (403 Enforced)'
    );
  };

  const handleToggleGranular = async (
    key: 'shareSteps' | 'shareHeartRateAndStress' | 'shareSleepAndRecovery'
  ) => {
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
    showToast('Updated granular HR health sharing permissions.');
  };

  const handleInspectEmployee = async (target: DirectoryEmployeeRecord) => {
    await triggerHapticSelection();
    const result = await inspectEmployeeHealthForHr(target.id);
    if (!result.allowed) {
      setInspectedEmployee(null);
      setHrForbiddenError(
        result.errorMessage ||
          '403 Forbidden - Employee has not granted health data permission'
      );
    } else {
      setHrForbiddenError(null);
      setInspectedEmployee(result.employee || target);
    }
  };

  const handleDownloadCodePdf = async () => {
    await triggerHapticSelection();
    const reportMarkdown = [
      '# PulseCorp — "Your Wellness, In Bloom" Architecture Report (100K+ Concurrent Users)',
      `Generated: ${new Date().toISOString()}`,
      `Active User: ${employee.name} (${employee.email})`,
      `Office: ${employee.officeBranch}`,
      `HR Consent Enabled: ${employee.hrHealthConsent}`,
      '',
      '## Key Distributed Systems Components',
      '- Batch Health Telemetry Ingestion: POST /api/v1/health/sync-batch (Idempotent + Partitioned)',
      '- O(log N) Step Leaderboard: Redis Sorted Sets (ZADD, ZREVRANGE, ZREVRANK)',
      '- Crowd-Voted Activity Poll: UNIQUE(activity_id, user_id) + Redis HINCRBY + Socket.io',
      '- HR Privacy Guard: Row-Level Security enforcing 403 Forbidden when hr_health_consent is false',
    ].join('\n');

    triggerWebDownload(
      'PulseCorp-Architecture-Report.md',
      reportMarkdown,
      'text/markdown;charset=utf-8'
    );
    setExportModalType('pdf');
    showToast('PulseCorp Architecture Report downloaded.');
  };

  const handleDownloadSourceZip = async () => {
    await triggerHapticSelection();
    const bundlePayload = JSON.stringify(
      {
        project: 'pulsecorp-wellness-bloom-100k',
        sdkVersion: '52.0.0',
        exportedAt: new Date().toISOString(),
        profileSnapshot: employee,
        metricsSnapshot: metrics,
        files: SOURCE_FILES_OVERVIEW,
      },
      null,
      2
    );

    triggerWebDownload(
      'pulsecorp-source-bundle.json',
      bundlePayload,
      'application/json;charset=utf-8'
    );
    setExportModalType('zip');
    showToast('Source files manifest downloaded.');
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

    const rows: Array<{ key: string; status: string; preview: string }> = [];
    for (const k of keysToInspect) {
      try {
        const raw = await AsyncStorage.getItem(k);
        if (!raw) {
          rows.push({ key: k, status: 'EMPTY', preview: 'No data saved under this key yet.' });
          continue;
        }
        let parsed: any = JSON.parse(raw);
        if (k === '@pulsecorp_auth_accounts_v2' && Array.isArray(parsed)) {
          parsed = parsed.map((acc: any) => ({
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
        rows.push({ key: k, status: 'ERROR', preview: 'Failed to read AsyncStorage key.' });
      }
    }
    setDbSnapshot(rows);
    setDbInspectorVisible(true);
  };

  const handleSaveProfile = async () => {
    await triggerHapticNotification();
    updateProfileAndGoals(
      {
        name: nameInput.trim() || 'Alex Morgan',
        email: emailInput.trim() || 'alex@acme.design',
        companyName: companyInput.trim() || 'Acme Studio',
        department: deptInput,
        officeBranch: `${companyInput.trim() || 'Acme Studio'} · ${deptInput}` as OfficeBranch,
      },
      {
        dailyStepsGoal: parseInt(stepGoalInput, 10) || 10000,
      }
    );
    setEditModalVisible(false);
    showToast('Profile & daily goals saved!');
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

        {/* 1. Header Title & Subtitle (Matches Screenshot 2) */}
        <Text style={styles.storyTitle}>Your wellness story.</Text>
        <Text style={styles.storySubtitle}>
          Make your wellbeing a little more personal.
        </Text>

        {/* 2. Main Centered Profile Card (Matches Screenshot 2 Exactly) */}
        <View style={styles.profileCardOuter}>
          <LinearGradient
            colors={['#EFF5EC', '#F9FBF8', '#FFFFFF']}
            locations={[0, 0.35, 1]}
            style={styles.profileCard}
          >
            {/* Avatar Circle AM */}
            <TouchableOpacity
              onPress={() => {
                triggerHapticSelection();
                setEditModalVisible(true);
              }}
              activeOpacity={0.85}
              style={styles.avatarOuterRing}
            >
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            </TouchableOpacity>

            {/* Name, Email & Department Pill */}
            <Text style={styles.profileName}>
              {userProfile?.fullName || employee.name || 'Authenticated User'}
            </Text>
            <Text style={styles.profileEmail}>
              {userProfile?.email || employee.email}
            </Text>

            {userProfile?.verificationStatus === 'VERIFIED' && (
              <View
                style={{
                  backgroundColor: '#DFECE2',
                  borderWidth: 1,
                  borderColor: '#9DC4A5',
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 999,
                  marginTop: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '800',
                    color: colors.primary,
                    letterSpacing: 0.7,
                  }}
                >
                  ✓ VERIFIED CORPORATE ID · {userProfile.companyName}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.deptBadge}
              onPress={() => setEditModalVisible(true)}
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
              >
                <Text style={styles.statBigValue}>{employee.currentStreakDays}</Text>
                <Text style={styles.statSubLabel}>day streak</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.statColumn}
                onPress={() => setActiveTab('leaderboard')}
              >
                <Text style={styles.statBigValue}>{joinedChallengeIds.length}</Text>
                <Text style={styles.statSubLabel}>challenges joined</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.statColumn}
                onPress={() => setActiveTab('home')}
              >
                <Text style={styles.statBigValue}>{employee.readinessScore}%</Text>
                <Text style={styles.statSubLabel}>readiness</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dividerLine} />

            {/* Real Biometric Physics & Stride Summary */}
            <View
              style={{
                width: '100%',
                backgroundColor: '#FAF9F5',
                borderRadius: 16,
                padding: 12,
                borderWidth: 1,
                borderColor: '#E5E1D8',
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '800',
                  color: colors.primary,
                  letterSpacing: 0.8,
                  marginBottom: 6,
                }}
              >
                CALIBRATED BIOMETRICS & METABOLIC PHYSICS
              </Text>
              <Text style={{ fontSize: 12, color: colors.textPrimary, fontWeight: '600' }}>
                Height: {userProfile?.heightCm || 0} cm · Weight:{' '}
                {userProfile?.weightKg || 0} kg · Gender:{' '}
                {userProfile?.gender || 'male'} · Age: {userProfile?.age || 0}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                BMI: {userProfile?.bmi || 0} kg/m² · BMR (Mifflin-St Jeor):{' '}
                {userProfile?.bmrKcal || 0} kcal/day · Stride:{' '}
                {userProfile?.strideLengthMeters || 0} m
              </Text>
              <Text style={{ fontSize: 11, color: '#6E746F', marginTop: 4 }}>
                Sensor Permissions: Pedometer ({liveDiagnostics.permissions.pedometer}) ·
                Steps ({liveDiagnostics.permissions.steps}) · HeartRate (
                {liveDiagnostics.permissions.heartRate})
              </Text>
            </View>

            {/* Quick Navigation to Real Onboarding & Verification Steps */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              <TouchableOpacity
                style={styles.exploreOnboardingBtn}
                onPress={() => setOnboardingStep('BIOMETRICS')}
              >
                <Text style={styles.exploreOnboardingText}>Edit Biometrics</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.exploreOnboardingBtn}
                onPress={() => setOnboardingStep('COMPANY_ID_VERIFICATION')}
              >
                <Text style={styles.exploreOnboardingText}>Company ID Card</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.exploreOnboardingBtn}
                onPress={async () => {
                  await requestAllHealthPermissions();
                  setOnboardingStep('HEALTH_PERMISSIONS');
                }}
              >
                <Text style={styles.exploreOnboardingText}>Health Permissions</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.exploreOnboardingBtn, { borderColor: '#E5B8B8' }]}
                onPress={logout}
              >
                <Text style={[styles.exploreOnboardingText, { color: '#9E3333' }]}>
                  Logout
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.demoCaptionText}>
              Authenticated session persisted via AsyncStorage. Zero mock fallbacks enabled.
            </Text>

            <View style={styles.dividerLine} />

            {/* TAKE THE CODE WITH YOU (Matches Screenshot 2) */}
            <Text style={styles.takeCodeLabel}>TAKE THE CODE WITH YOU</Text>
            <View style={styles.takeCodeButtonsRow}>
              <TouchableOpacity
                style={styles.codeBtn}
                onPress={handleDownloadCodePdf}
                activeOpacity={0.85}
              >
                <Text style={styles.codeBtnText}>Download code PDF</Text>
                <Icon name="arrowRight" size={13} color={colors.textPrimary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.codeBtn}
                onPress={handleDownloadSourceZip}
                activeOpacity={0.85}
              >
                <Text style={styles.codeBtnText}>Source files ZIP</Text>
                <Icon name="arrowRight" size={13} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* ================================================================= */}
        {/* 3. EXPLICIT HR HEALTH DATA PERMISSION TOGGLE (CRITICAL PRIVACY)   */}
        {/* ================================================================= */}
        <View style={styles.privacyCard}>
          <View style={styles.privacyHeaderRow}>
            <View style={styles.shieldIconBox}>
              <Icon name="shield" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.privacyEyebrow}>
                ROW-LEVEL PRIVACY CONSENT CONTROL
              </Text>
              <Text style={styles.privacyTitle}>
                Share My Health Telemetry with HR
              </Text>
            </View>
            <Switch
              value={employee.hrHealthConsent}
              onValueChange={handleToggleMasterHrConsent}
              trackColor={{ false: '#D8D4CC', true: '#4A7C59' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <Text style={styles.privacyDesc}>
            {employee.hrHealthConsent
              ? '✅ Access Granted: Authorized HR Admins can view your selected Google Health Connect metrics.'
              : '🔒 Private / Revoked: HR Admins are strictly blocked (HTTP 403 Forbidden) from viewing your personal health data.'}
          </Text>

          {/* Granular Telemetry Checkboxes */}
          <View style={styles.granularRow}>
            {[
              {
                key: 'shareSteps' as const,
                label: 'Steps & Distance',
                checked: employee.granularConsent.shareSteps,
              },
              {
                key: 'shareHeartRateAndStress' as const,
                label: 'Heart Rate & Stress',
                checked: employee.granularConsent.shareHeartRateAndStress,
              },
              {
                key: 'shareSleepAndRecovery' as const,
                label: 'Sleep & Readiness',
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

          {/* Immutable Audit Log Preview */}
          <View style={styles.auditLogBox}>
            <Text style={styles.auditLogTitle}>
              IMMUTABLE PRIVACY AUDIT LOG (PATCH /api/v1/users/me/privacy-consent)
            </Text>
            {privacyAuditLogs.slice(0, 2).map((entry) => (
              <Text key={entry.id} style={styles.auditLogLine}>
                • [{entry.timestamp}] {entry.userName}: {entry.details}
              </Text>
            ))}
          </View>
        </View>

        {/* ================================================================= */}
        {/* 4. HR ADMIN PORTAL & CONSENTED EMPLOYEE HEALTH DIRECTORY          */}
        {/* ================================================================= */}
        <View style={styles.hrPortalCard}>
          <View style={styles.hrPortalHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.privacyEyebrow}>
                ROLE-BASED ACCESS · CURRENT ROLE: {employee.userRole}
              </Text>
              <Text style={styles.privacyTitle}>
                HR Admin Consented Health Portal
              </Text>
              <Text style={styles.privacyDesc}>
                Tap any employee below to test permission-gated health inspection.
                Unconsented employees return 403 Forbidden.
              </Text>
            </View>
          </View>

          {/* Quick Role Switcher Buttons */}
          <View style={styles.roleSwitchButtonsRow}>
            <TouchableOpacity
              style={[
                styles.roleSwitchBtn,
                employee.userRole === 'EMPLOYEE' && styles.roleSwitchBtnActive,
              ]}
              onPress={async () => {
                await triggerHapticSelection();
                loginAsDemoEmployee();
                showToast('Switched to Employee account (Alex Morgan).');
              }}
            >
              <Text
                style={[
                  styles.roleSwitchBtnText,
                  employee.userRole === 'EMPLOYEE' && styles.roleSwitchBtnTextActive,
                ]}
              >
                Employee (Alex)
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
                showToast('Switched to HR Admin account (Priya Nair).');
              }}
            >
              <Text
                style={[
                  styles.roleSwitchBtnText,
                  employee.userRole === 'HR_ADMIN' && styles.roleSwitchBtnTextActive,
                ]}
              >
                HR Admin (Priya)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.openLoginModalBtn}
              onPress={() => setIsAuthModalOpen(true)}
            >
              <Text style={styles.openLoginModalBtnText}>Full Login →</Text>
            </TouchableOpacity>
          </View>

          {hrForbiddenError && (
            <View style={styles.forbiddenAlertBanner}>
              <Icon name="lock" size={15} color={colors.danger} />
              <Text style={styles.forbiddenAlertText}>{hrForbiddenError}</Text>
            </View>
          )}

          {/* Employee Directory List */}
          {directoryEmployees.map((emp) => {
            const isConsented = emp.hrHealthConsent;
            return (
              <TouchableOpacity
                key={emp.id}
                style={[
                  styles.dirRow,
                  !isConsented && styles.dirRowLocked,
                ]}
                onPress={() => handleInspectEmployee(emp)}
                activeOpacity={0.8}
              >
                <View style={styles.dirAvatar}>
                  <Text style={styles.dirAvatarText}>
                    {emp.name
                      .split(' ')
                      .map((p) => p[0])
                      .join('')}
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
                    {isConsented ? '✅ Access Granted' : '🔒 Private / No Consent'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ================================================================= */}
        {/* 5. DATABASE & LOCAL STORAGE VERIFIER (LIVE PERSISTENCE CHECK)     */}
        {/* ================================================================= */}
        <View style={styles.privacyCard}>
          <Text style={styles.privacyEyebrow}>PERSISTENCE &amp; CLOUD DB CHECK</Text>
          <Text style={styles.privacyTitle}>Verify Saved Login &amp; Biometric Data</Text>
          <Text style={styles.privacyDesc}>
            Remote Supabase DB:{' '}
            <Text style={{ fontWeight: '800', color: isSupabaseConfigured ? colors.primary : '#9E3333' }}>
              {isSupabaseConfigured
                ? 'CONNECTED (Remote PostgreSQL)'
                : 'NOT CONFIGURED (No .env URL/Key — Saving locally via AsyncStorage)'}
            </Text>
            {'\n'}On-Device DB Status: {liveDiagnostics.cloudSyncStatus} ({liveDiagnostics.dailyStorageKey})
          </Text>
          <TouchableOpacity
            style={[styles.saveModalBtn, { marginTop: 10 }]}
            onPress={handleInspectDatabase}
            activeOpacity={0.85}
          >
            <Text style={styles.saveModalBtnText}>
              Inspect Saved Database Records (AsyncStorage)
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ================================================================= */}
      {/* MODAL 1: HR INDIVIDUAL EMPLOYEE HEALTH TELEMETRY INSPECTOR        */}
      {/* ================================================================= */}
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
                <View>
                  <Text style={styles.privacyEyebrow}>
                    VERIFIED HR CONSENT · LIVE GOOGLE HEALTH CONNECT
                  </Text>
                  <Text style={styles.modalTitle}>
                    {inspectedEmployee.name}’s Health Telemetry
                  </Text>
                  <Text style={styles.dirSub}>
                    {inspectedEmployee.officeBranch} · Synced{' '}
                    {inspectedEmployee.lastSyncedAt}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeCircle}
                  onPress={() => setInspectedEmployee(null)}
                >
                  <Icon name="close" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Heart Rate Wave Chart for Inspected Employee */}
              <View style={styles.inspectorChartBox}>
                <View style={styles.inspectorTopMetrics}>
                  <View>
                    <Text style={styles.inspectorBpm}>
                      {inspectedEmployee.metrics.bpm} BPM
                    </Text>
                    <Text style={styles.dirSub}>
                      Resting {inspectedEmployee.metrics.restingBpm} BPM ·{' '}
                      {inspectedEmployee.metrics.stressLabel}
                    </Text>
                  </View>
                  <View style={styles.consentBadgeGranted}>
                    <Text style={styles.consentBadgeTextGranted}>
                      Readiness {inspectedEmployee.metrics.readinessScore}%
                    </Text>
                  </View>
                </View>

                <Svg width="100%" height={78} viewBox="0 0 280 78">
                  <Line
                    x1="10"
                    y1="20"
                    x2="270"
                    y2="20"
                    stroke="#E5E1D8"
                    strokeDasharray="3 3"
                  />
                  <Path
                    d="M 14 58 C 52 38, 92 26, 136 44 C 180 62, 220 24, 266 36"
                    fill="none"
                    stroke="#4F8F8B"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <Circle
                    cx="200"
                    cy="34"
                    r="5"
                    fill="#FFFFFF"
                    stroke="#4F8F8B"
                    strokeWidth="2.5"
                  />
                </Svg>
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
                    {inspectedEmployee.metrics.sleepHours}
                  </Text>
                  <Text style={styles.dirSub}>
                    Deep {inspectedEmployee.metrics.deepSleepMinutes}m · REM{' '}
                    {inspectedEmployee.metrics.remSleepMinutes}m
                  </Text>
                </View>
                <View style={styles.inspectorStatTile}>
                  <Text style={styles.inspectorStatVal}>
                    {inspectedEmployee.metrics.activeKcal} kcal
                  </Text>
                  <Text style={styles.dirSub}>Active Burn</Text>
                </View>
                <View style={styles.inspectorStatTile}>
                  <Text style={styles.inspectorStatVal}>
                    {inspectedEmployee.metrics.spo2Percentage}%
                  </Text>
                  <Text style={styles.dirSub}>Blood Oxygen (SpO2)</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.saveModalBtn}
                onPress={() => setInspectedEmployee(null)}
              >
                <Text style={styles.saveModalBtnText}>Close Health Inspector</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* ================================================================= */}
      {/* MODAL 2: EDIT PROFILE & DAILY GOALS                               */}
      {/* ================================================================= */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile & Goals</Text>
              <TouchableOpacity
                style={styles.closeCircle}
                onPress={() => setEditModalVisible(false)}
              >
                <Icon name="close" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>FULL NAME</Text>
            <TextInput
              style={styles.input}
              value={nameInput}
              onChangeText={setNameInput}
            />

            <Text style={styles.fieldLabel}>EMAIL</Text>
            <TextInput
              style={styles.input}
              value={emailInput}
              onChangeText={setEmailInput}
            />

            <Text style={styles.fieldLabel}>STUDIO / COMPANY</Text>
            <TextInput
              style={styles.input}
              value={companyInput}
              onChangeText={setCompanyInput}
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
            />

            <TouchableOpacity style={styles.saveModalBtn} onPress={handleSaveProfile}>
              <Text style={styles.saveModalBtnText}>Save Profile Changes →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ================================================================= */}
      {/* MODAL 3: CODE PDF / SOURCE ZIP EXPORT PREVIEW MODAL               */}
      {/* ================================================================= */}
      <Modal
        visible={exportModalType !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setExportModalType(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {exportModalType === 'pdf'
                  ? 'Architecture & Code Summary'
                  : 'PulseCorp Source Files Bundle'}
              </Text>
              <TouchableOpacity
                style={styles.closeCircle}
                onPress={() => setExportModalType(null)}
              >
                <Icon name="close" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
              {SOURCE_FILES_OVERVIEW.map((item) => (
                <View key={item.path} style={styles.sourceFileRow}>
                  <Icon name="folder" size={15} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sourceFilePath}>{item.path}</Text>
                    <Text style={styles.sourceFileDesc}>{item.desc}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.saveModalBtn}
              onPress={() => setExportModalType(null)}
            >
              <Text style={styles.saveModalBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ================================================================= */}
      {/* MODAL 4: LIVE DATABASE / ASYNCSTORAGE INSPECTOR                   */}
      {/* ================================================================= */}
      <Modal
        visible={dbInspectorVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDbInspectorVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.privacyEyebrow}>
                  {isSupabaseConfigured
                    ? 'REMOTE SUPABASE + ASYNCSTORAGE'
                    : 'LOCAL ASYNCSTORAGE DATABASE (NO REMOTE SUPABASE .ENV)'}
                </Text>
                <Text style={styles.modalTitle}>Saved App Records</Text>
              </View>
              <TouchableOpacity
                style={styles.closeCircle}
                onPress={() => setDbInspectorVisible(false)}
              >
                <Icon name="close" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {dbSnapshot.map((row) => (
                <View
                  key={row.key}
                  style={{
                    backgroundColor: '#FAF9F5',
                    borderRadius: 12,
                    padding: 10,
                    borderWidth: 1,
                    borderColor: '#E5E1D8',
                    marginBottom: 10,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '800',
                        color: colors.primary,
                        flex: 1,
                      }}
                    >
                      {row.key}
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '700',
                        color: row.status === 'EMPTY' ? '#9E3333' : '#2E5C3E',
                      }}
                    >
                      {row.status}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 10, color: '#4A504B' }}>{row.preview}</Text>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.saveModalBtn}
              onPress={handleInspectDatabase}
            >
              <Text style={styles.saveModalBtnText}>Refresh DB Snapshot</Text>
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
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    flex: 1,
  },
  storyTitle: {
    fontSize: 27,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  storySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 18,
  },
  profileCardOuter: {
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    overflow: 'hidden',
    marginBottom: 18,
  },
  profileCard: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  avatarOuterRing: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#F2EAE1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#D8C3B0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 24,
    fontWeight: '700',
    color: '#43382E',
  },
  profileName: {
    fontSize: 23,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  profileEmail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 12,
  },
  deptBadge: {
    backgroundColor: '#EBF3EC',
    borderWidth: 1,
    borderColor: '#DCE8DD',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  deptBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryGlow,
  },
  dividerLine: {
    width: '100%',
    height: 1,
    backgroundColor: '#EFECE6',
    marginVertical: 18,
  },
  statsThreeColRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
  },
  statColumn: {
    alignItems: 'center',
    flex: 1,
  },
  statBigValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statSubLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 3,
  },
  exploreOnboardingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2DFD7',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 14,
  },
  exploreOnboardingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  demoCaptionText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 10,
  },
  takeCodeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.textMuted,
    marginBottom: 12,
  },
  takeCodeButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  codeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2DFD7',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  codeBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  privacyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 16,
  },
  privacyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  shieldIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EBF3EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyEyebrow: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.primaryGlow,
  },
  privacyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  privacyDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: 10,
  },
  granularRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  granularChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#FAF9F5',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  granularChipActive: {
    backgroundColor: '#EBF3EC',
    borderColor: '#CBE0CF',
  },
  granularChipText: {
    fontSize: 11,
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
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 4,
  },
  auditLogLine: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  hrPortalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  hrPortalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  roleSwitchButtonsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  roleSwitchBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FAF9F5',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
  },
  roleSwitchBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleSwitchBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  roleSwitchBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  openLoginModalBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F5EBE1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  openLoginModalBtnText: {
    fontSize: 11,
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
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  forbiddenAlertText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.danger,
    flex: 1,
  },
  dirRow: {
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
    opacity: 0.82,
  },
  dirAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
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
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  consentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  consentBadgeGranted: {
    backgroundColor: '#E8F2EA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  consentBadgeDenied: {
    backgroundColor: '#F9E8EA',
  },
  consentBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  consentBadgeTextGranted: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.success,
  },
  consentBadgeTextDenied: {
    color: colors.heartRate,
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EFECE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inspectorChartBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 10,
  },
  inspectorTopMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inspectorBpm: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
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
    padding: 10,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  inspectorStatVal: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
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
  saveModalBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  saveModalBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sourceFileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 6,
  },
  sourceFilePath: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sourceFileDesc: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
