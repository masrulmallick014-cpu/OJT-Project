import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import {
  calculateActiveCaloriesFromSteps,
  calculateBMI,
  calculateBMR,
  calculateDistanceKm,
  calculateStrideLengthCm,
  calculateStrideLengthMeters,
  createZeroBaselineMetrics,
  DEFAULT_LIVE_DIAGNOSTICS,
  DEFAULT_USER_GOALS,
  getDailyStepStorageKey,
  healthService,
} from '../services/healthService';
import { companyService } from '../services/companyService';
import { apiClient, redisCluster } from '../services/apiClient';
import { isSupabaseConfigured, supabase, supabaseEngine } from '../lib/supabase';
import {
  DEFAULT_EMPLOYEE_PROFILE,
  INITIAL_HEALTH_METRICS,
  MOTIVATIONAL_QUOTES,
} from '../constants/mockData';

const AUTH_ACCOUNTS_KEY = '@pulsecorp_auth_accounts_v2';
const ACTIVE_SESSION_KEY = '@pulsecorp_active_session_v2';
const USER_PROFILES_KEY = '@pulsecorp_user_profiles_v2';
const APP_STATE_STORAGE_KEY = '@pulsecorp_app_workspace_v2';
const MIN_AGGREGATE_GROUP_SIZE = 5;

const INITIAL_COMPETITION = {
  id: 'comp-live-sprint-01',
  title: 'Team Walking Sprint',
  subtitle: 'Opt-in team step challenge. Every step at your own pace counts.',
  officeScope: 'MY_OFFICE',
  prizeBadge: 'Team Pacesetter Badge',
  startTimeIso: new Date().toISOString(),
  endTimeIso: new Date(Date.now() + 7 * 86400000).toISOString(),
  remainingSeconds: 7 * 86400,
  isEnded: false,
  winnerEmployeeId: null,
  winnerEmployeeName: null,
  winnerSteps: null,
};

const DEFAULT_NOTIFICATION_PREFS = {
  dailyCheckInReminders: true,
  teamActivityUpdates: true,
  communityReplies: false,
};

export const DEFAULT_PERSONALIZATION_PREFS = {
  wellnessFocus: 'balanced', // 'balanced' | 'movement' | 'calm' | 'hydration'
  preferredReminderTime: '12:30 PM',
  reminderFrequency: 'daily', // 'daily' | 'weekly' | 'paused'
  showStreaksAndCheckIns: true,
  showLeaderboardRankings: true,
  showSocialPrompts: true,
  keepChallengeProgressPrivate: false,
  visibleHomeMetrics: {
    steps: true,
    hydration: true,
    mindful: true,
    heartRate: false,
    sleep: false,
    weeklyRecap: true,
    teamUpdates: true,
  },
};

export const DEFAULT_CUSTOM_CHALLENGES = [
  {
    id: 'chg-active-mins-team',
    title: '20 Active Minutes Reset',
    subtitle: 'Walk, stretch, cycle, or do desk mobility at your own pace.',
    category: 'Active Minutes',
    targetLabel: 'Goal: 20 active mins / day',
    targetValue: 20,
    unit: 'mins',
    durationDays: 7,
    scope: 'PRIVATE_SMALL_TEAM',
    rules: 'Any movement counts—walking, seated stretching, cycling, or mobility.',
    badgeLabel: 'Consistent Mover Badge',
    createdBy: 'PulseCorp Wellness',
  },
];

export const MINDFUL_SESSIONS_LIBRARY = [
  {
    id: 'mind-box-2m',
    title: '2-Min Box Breathing Reset',
    category: 'Breathing',
    durationMinutes: 2,
    kind: 'QUICK_RESET',
    subtitle: 'Steady 4-4-4 rhythm to settle racing thoughts between meetings.',
    guidanceSteps: [
      'Sit comfortably and relax your jaw and shoulders.',
      'Inhale gently through your nose for 4 seconds.',
      'Hold softly for 4 seconds without straining.',
      'Exhale slowly for 4 seconds and notice the calm.',
    ],
  },
  {
    id: 'mind-stress-1m',
    title: '1-Min Stress Reset Breath',
    category: 'Stress Reset',
    durationMinutes: 1,
    kind: 'QUICK_RESET',
    subtitle: 'Quick physiological sigh and slow exhale for busy work moments.',
    guidanceSteps: [
      'Take a deep breath in through your nose, then a tiny second sip of air.',
      'Exhale slowly and completely through your mouth.',
      'Let your shoulders drop away from your ears.',
    ],
  },
  {
    id: 'mind-focus-5m',
    title: '5-Min Deep Focus Anchor',
    category: 'Focus',
    durationMinutes: 5,
    kind: 'GUIDED_SESSION',
    subtitle: 'Clear mental tab clutter before starting an important task.',
    guidanceSteps: [
      'Close unused browser tabs or turn your phone face down for 5 minutes.',
      'Choose the single task you want to focus on next.',
      'Follow a calm 4-second inhale and 4-second exhale rhythm.',
      'When distracting thoughts pop up, note them neutrally and return to your breath.',
    ],
  },
  {
    id: 'mind-stretch-5m',
    title: '5-Min Neck, Shoulder & Desk Stretch',
    category: 'Desk Stretch',
    durationMinutes: 5,
    kind: 'GUIDED_SESSION',
    subtitle: 'Gentle posture release for keyboard, mouse, and monitor fatigue.',
    guidanceSteps: [
      'Roll both shoulders slowly backward 5 times, then forward 5 times.',
      'Tilt your right ear gently toward your right shoulder for 15 seconds, then switch.',
      'Open your chest by clasping hands behind your back or stretching arms wide.',
      'Stand up or shift weight in your chair and shake out your wrists.',
    ],
  },
  {
    id: 'mind-winddown-10m',
    title: '10-Min Post-Workday Wind-Down',
    category: 'Wind-Down',
    durationMinutes: 10,
    kind: 'GUIDED_SESSION',
    subtitle: 'Transition ritual to leave work stress behind at the end of the day.',
    guidanceSteps: [
      'Write down the top 1 or 2 things you accomplished today.',
      'Note tomorrow’s first small step so your mind doesn’t have to hold onto it tonight.',
      'Breathe slowly and let your attention shift from work mode to personal rest.',
    ],
  },
];

const SAMPLE_DIRECTORY_COWORKERS = [
  {
    id: 'demo-emp-rohan',
    employeeCode: 'DEMO-01',
    name: 'Rohan Mehta (Demo Sample)',
    email: 'rohan.demo@example.com',
    role: 'Product Engineer',
    userRole: 'EMPLOYEE',
    officeBranch: 'Bengaluru HQ',
    department: 'Engineering',
    isDemo: true,
    hrHealthConsent: false,
    granularConsent: {
      shareSteps: false,
      shareHeartRateAndStress: false,
      shareSleepAndRecovery: false,
    },
    lastSyncedAt: 'Demo sample',
    metrics: {
      steps: 6420,
      stepsGoal: 10000,
      bpm: 72,
      restingBpm: 64,
      stressLabel: 'Optimal',
      sleepHours: '7h 20m',
      deepSleepMinutes: 85,
      remSleepMinutes: 95,
      readinessScore: 84,
      spo2Percentage: 98,
      activeKcal: 310,
      hourlyBpmSeries: [68, 72, 75, 71, 72],
    },
  },
  {
    id: 'demo-emp-ananya',
    employeeCode: 'DEMO-02',
    name: 'Ananya Rao (Demo Sample · Opted In)',
    email: 'ananya.demo@example.com',
    role: 'UX Researcher',
    userRole: 'EMPLOYEE',
    officeBranch: 'Bengaluru HQ',
    department: 'Design & Creative',
    isDemo: true,
    hrHealthConsent: true,
    granularConsent: {
      shareSteps: true,
      shareHeartRateAndStress: true,
      shareSleepAndRecovery: true,
    },
    lastSyncedAt: 'Demo sample',
    metrics: {
      steps: 8150,
      stepsGoal: 10000,
      bpm: 70,
      restingBpm: 62,
      stressLabel: 'Low Rest',
      sleepHours: '7h 45m',
      deepSleepMinutes: 95,
      remSleepMinutes: 105,
      recoveryScore: 88,
      readinessScore: 88,
      spo2Percentage: 98,
      activeKcal: 390,
      hourlyBpmSeries: [65, 69, 74, 70, 68],
    },
  },
];

const WellnessContext = createContext(undefined);

function deriveReadinessState(score, hasData) {
  if (!hasData || score <= 0) return 'Awaiting Wearable Sync';
  if (score >= 90) return 'Peak Performance';
  if (score >= 80) return 'Optimal Readiness';
  if (score >= 65) return 'Moderate Equilibrium';
  return 'Active Recovery';
}

export function determineOnboardingStep(auth, profile) {
  if (!auth || !auth.isAuthenticated) return 'AUTH';
  if (!profile || !profile.healthPermissionsCompleted) {
    return 'HEALTH_PERMISSIONS';
  }
  if (
    !profile.onboardingCompleted ||
    profile.heightCm < 140 ||
    profile.weightKg < 35
  ) {
    return 'BIOMETRICS';
  }
  if (!profile.companyId || !profile.companyOnboardingCompleted) {
    return 'COMPANY_ID_VERIFICATION';
  }
  return 'COMPLETED';
}

export const WellnessProvider = ({ children }) => {
  const [userAuth, setUserAuth] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [onboardingStep, setOnboardingStep] = useState('AUTH');
  const [companies, setCompanies] = useState([]);
  const [companyRoster, setCompanyRoster] = useState([]);
  const [liveDiagnostics, setLiveDiagnostics] = useState(DEFAULT_LIVE_DIAGNOSTICS);

  const [employee, setEmployee] = useState(DEFAULT_EMPLOYEE_PROFILE);
  const [metrics, setMetrics] = useState(INITIAL_HEALTH_METRICS);
  const [goals, setGoals] = useState(DEFAULT_USER_GOALS);
  const [hydration, setHydration] = useState({
    currentMl: 0,
    goalMl: DEFAULT_USER_GOALS.hydrationGoalMl,
    glassesCount: 0,
    lastUpdatedAt: null,
  });
  const [activityLogs, setActivityLogs] = useState([]);
  const [joinedChallengeIds, setJoinedChallengeIds] = useState([]);
  const [favoriteQuoteIds, setFavoriteQuoteIds] = useState([]);
  const [selectedQuoteCategory, setSelectedQuoteCategory] = useState('All');
  const [currentQuote, setCurrentQuote] = useState(MOTIVATIONAL_QUOTES[0]);
  const [isGateUnlocked, setIsGateUnlocked] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeTab, setActiveTabState] = useState('home');
  const [moveSubTab, setMoveSubTab] = useState('challenges');
  const [rhythmRange, setRhythmRange] = useState('today');
  const [mindfulMinutes, setMindfulMinutes] = useState(0);
  const [mindfulSessionHistory, setMindfulSessionHistory] = useState([]);
  const [customChallenges, setCustomChallenges] = useState(DEFAULT_CUSTOM_CHALLENGES);
  const [personalizationPrefs, setPersonalizationPrefs] = useState(
    DEFAULT_PERSONALIZATION_PREFS,
  );
  const [healthSyncPaused, setHealthSyncPaused] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationPrefs, setNotificationPrefs] = useState(DEFAULT_NOTIFICATION_PREFS);
  const [syncState, setSyncState] = useState('idle');

  // UGC Moderation, Rules Acceptance, Blocking & Reporting
  const [ugcRulesAccepted, setUgcRulesAccepted] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [moderationReports, setModerationReports] = useState([]);
  const lastUgcActionMsRef = useRef(0);

  const [wearable, setWearable] = useState({
    id: 'wearable-native-01',
    modelName:
      Platform.OS === 'ios'
        ? 'Apple HealthKit + CoreMotion'
        : 'Google Health Connect + Pedometer',
    brand: Platform.OS === 'ios' ? 'Apple HealthKit' : 'Health Connect',
    provider: Platform.OS === 'ios' ? 'apple_health' : 'health_connect',
    isConnected: false,
    batteryLevel: 0,
    lastSyncTimestamp: null,
    syncStatus: 'awaiting_permission',
  });

  const [directoryEmployees, setDirectoryEmployees] = useState(SAMPLE_DIRECTORY_COWORKERS);
  const [proposedActivities, setProposedActivities] = useState([]);
  const [walkingCompetition, setWalkingCompetition] = useState(INITIAL_COMPETITION);
  const [privacyAuditLogs, setPrivacyAuditLogs] = useState([]);
  const [chatRooms, setChatRooms] = useState([
    {
      id: 'room-my-office',
      name: 'Office Wellness Channel (Local Demo)',
      subtitle: 'Local preview for team walks & wellness check-ins',
      type: 'OFFICE_GROUP',
      officeBranch: 'Corporate Workspace',
      onlineCount: 1,
      unreadCount: 0,
      typingUser: null,
    },
  ]);
  const [chatMessages, setChatMessages] = useState([]);
  const [forumPosts, setForumPosts] = useState([]);

  const profileRef = useRef(null);
  profileRef.current = userProfile;
  const goalsRef = useRef(goals);
  goalsRef.current = goals;

  const setActiveTab = useCallback((tabKey) => {
    if (tabKey === 'leaderboard') {
      setActiveTabState('leaderboard');
      setMoveSubTab('challenges');
    } else if (tabKey === 'activities') {
      setActiveTabState('calm');
      setMoveSubTab('activities');
    } else if (tabKey === 'calm') {
      setActiveTabState('calm');
      setMoveSubTab('calm');
    } else if (tabKey === 'move') {
      setActiveTabState('leaderboard');
    } else {
      setActiveTabState(tabKey);
    }
  }, []);

  const syncEmployeeStateFromProfile = useCallback((profile, currentMetrics) => {
    const hasData =
      currentMetrics.steps.current > 0 ||
      currentMetrics.heartRate.hasReading ||
      currentMetrics.sleep.hasReading;
    const readinessScore = currentMetrics.overallReadinessScore || 0;
    const readinessState = deriveReadinessState(readinessScore, hasData);

    const explicitHrConsent = Boolean(profile.hrHealthConsent);
    const explicitGranular = profile.granularConsent || {
      shareSteps: false,
      shareHeartRateAndStress: false,
      shareSleepAndRecovery: false,
    };

    setEmployee((prev) => ({
      ...prev,
      id: profile.uid,
      employeeCode: `EMP-${profile.uid.slice(-5).toUpperCase()}`,
      name: profile.fullName || profile.email.split('@')[0],
      email: profile.email,
      role: profile.jobTitle || 'Employee',
      companyId: profile.companyId,
      companyName: profile.companyName || 'Unassigned Company',
      officeBranch: profile.companyName || 'Corporate Workspace',
      department: profile.department || 'Engineering',
      readinessScore,
      readinessState,
      hrHealthConsent: explicitHrConsent,
      granularConsent: explicitGranular,
      verificationStatus: profile.verificationStatus,
    }));

    setDirectoryEmployees((prev) => {
      const existingRecord = prev.find((d) => d.id === profile.uid);
      const hrConsentValue =
        profile.hrHealthConsent !== undefined
          ? Boolean(profile.hrHealthConsent)
          : Boolean(existingRecord?.hrHealthConsent);
      const granularValue = profile.granularConsent ||
        existingRecord?.granularConsent || {
          shareSteps: false,
          shareHeartRateAndStress: false,
          shareSleepAndRecovery: false,
        };

      const record = {
        id: profile.uid,
        employeeCode: `EMP-${profile.uid.slice(-5).toUpperCase()}`,
        name: profile.fullName || profile.email.split('@')[0],
        email: profile.email,
        role: profile.jobTitle || 'Employee',
        userRole: 'EMPLOYEE',
        officeBranch: profile.companyName || 'Corporate Workspace',
        department: profile.department || 'Engineering',
        isDemo: false,
        hrHealthConsent: hrConsentValue,
        granularConsent: granularValue,
        lastSyncedAt: currentMetrics.lastSyncedAt
          ? new Date(currentMetrics.lastSyncedAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'No reading yet',
        metrics: {
          steps: currentMetrics.steps.current,
          stepsGoal: currentMetrics.steps.goal,
          bpm: currentMetrics.heartRate.currentBpm,
          restingBpm: currentMetrics.heartRate.restingBpm,
          stressLabel: currentMetrics.stress.label,
          sleepHours: currentMetrics.sleep.hoursFormatted,
          deepSleepMinutes: currentMetrics.sleep.deepSleepMinutes,
          remSleepMinutes: currentMetrics.sleep.remSleepMinutes,
          readinessScore,
          spo2Percentage: currentMetrics.oxygen.spo2Percentage,
          activeKcal: currentMetrics.activeCalories.burnedKcal,
          hourlyBpmSeries: (currentMetrics.heartRate.intradayReadings || []).map(
            (r) => r.bpm,
          ),
        },
      };
      const exists = prev.some((d) => d.id === profile.uid);
      return exists
        ? prev.map((d) => (d.id === profile.uid ? record : d))
        : [record, ...prev];
    });
  }, []);

  const persistUserProfile = useCallback(async (profile) => {
    setUserProfile(profile);
    profileRef.current = profile;
    try {
      const raw = await AsyncStorage.getItem(USER_PROFILES_KEY);
      const map = raw ? JSON.parse(raw) : {};
      map[profile.uid] = profile;
      await AsyncStorage.setItem(USER_PROFILES_KEY, JSON.stringify(map));
    } catch {
      // ignore storage error
    }
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [
          loadedPerms,
          loadedCompanies,
          sessionRaw,
          profilesRaw,
          workspaceRaw,
          accountsRaw,
        ] = await Promise.all([
          healthService.loadCachedPermissions(),
          companyService.getCompanies(),
          AsyncStorage.getItem(ACTIVE_SESSION_KEY),
          AsyncStorage.getItem(USER_PROFILES_KEY),
          AsyncStorage.getItem(APP_STATE_STORAGE_KEY),
          AsyncStorage.getItem(AUTH_ACCOUNTS_KEY),
        ]);

        // Security migration: Purge any legacy passwordHash fields from local AsyncStorage
        if (accountsRaw) {
          try {
            const parsedAccounts = JSON.parse(accountsRaw);
            if (Array.isArray(parsedAccounts) && parsedAccounts.some((a) => a.passwordHash)) {
              const sanitized = parsedAccounts.map(({ uid, email, createdAt, authMode }) => ({
                uid,
                email,
                authMode: authMode || 'LOCAL_DEVICE_DEMO',
                createdAt,
              }));
              await AsyncStorage.setItem(AUTH_ACCOUNTS_KEY, JSON.stringify(sanitized));
            }
          } catch {
            // ignore
          }
        }

        setCompanies(loadedCompanies);
        setLiveDiagnostics((prev) => ({ ...prev, permissions: loadedPerms }));

        if (workspaceRaw) {
          const ws = JSON.parse(workspaceRaw);
          if (ws.goals) setGoals(ws.goals);
          if (ws.hydration) setHydration(ws.hydration);
          if (ws.activityLogs) setActivityLogs(ws.activityLogs);
          if (ws.joinedChallengeIds) setJoinedChallengeIds(ws.joinedChallengeIds);
          if (ws.proposedActivities) setProposedActivities(ws.proposedActivities);
          if (ws.chatMessages) setChatMessages(ws.chatMessages);
          if (ws.forumPosts) setForumPosts(ws.forumPosts);
          if (ws.notificationPrefs) setNotificationPrefs(ws.notificationPrefs);
          if (ws.ugcRulesAccepted !== undefined) setUgcRulesAccepted(Boolean(ws.ugcRulesAccepted));
          if (Array.isArray(ws.blockedUsers)) setBlockedUsers(ws.blockedUsers);
          if (Array.isArray(ws.moderationReports)) setModerationReports(ws.moderationReports);
          if (Array.isArray(ws.mindfulSessionHistory)) {
            setMindfulSessionHistory(ws.mindfulSessionHistory);
          }
          if (typeof ws.mindfulMinutes === 'number') {
            setMindfulMinutes(ws.mindfulMinutes);
          }
          if (Array.isArray(ws.customChallenges) && ws.customChallenges.length > 0) {
            setCustomChallenges(ws.customChallenges);
          }
          if (ws.personalizationPrefs) {
            setPersonalizationPrefs((prev) => ({
              ...prev,
              ...ws.personalizationPrefs,
              visibleHomeMetrics: {
                ...prev.visibleHomeMetrics,
                ...(ws.personalizationPrefs.visibleHomeMetrics || {}),
              },
            }));
          }
          if (ws.healthSyncPaused !== undefined) {
            setHealthSyncPaused(Boolean(ws.healthSyncPaused));
          }
        }

        if (sessionRaw) {
          const auth = JSON.parse(sessionRaw);
          if (auth && auth.isAuthenticated && auth.uid) {
            // Check session expiration if expiresAt is present
            if (auth.expiresAt && new Date(auth.expiresAt).getTime() < Date.now()) {
              await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
              setOnboardingStep('AUTH');
              return;
            }
            setUserAuth(auth);
            const profilesMap = profilesRaw ? JSON.parse(profilesRaw) : {};
            const prof = profilesMap[auth.uid] || null;
            if (prof) {
              setUserProfile(prof);
              profileRef.current = prof;
              syncEmployeeStateFromProfile(prof, INITIAL_HEALTH_METRICS);
              if (prof.companyId) {
                const leaderboard = await companyService.getVerifiedCompanyLeaderboard(
                  prof.companyId,
                );
                setCompanyRoster(leaderboard);
              }
            }
            setOnboardingStep(determineOnboardingStep(auth, prof));
          }
        }
      } catch {
        // ignore bootstrap error
      }
    };
    bootstrap();
  }, [syncEmployeeStateFromProfile]);

  const persistWorkspace = useCallback(
    async (overrides = {}) => {
      try {
        const payload = {
          goals,
          hydration,
          activityLogs,
          joinedChallengeIds,
          proposedActivities,
          chatMessages,
          forumPosts,
          notificationPrefs,
          ugcRulesAccepted,
          blockedUsers,
          moderationReports,
          mindfulMinutes,
          mindfulSessionHistory,
          customChallenges,
          personalizationPrefs,
          healthSyncPaused,
          ...overrides,
        };
        await AsyncStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(payload));
      } catch {
        // ignore
      }
    },
    [
      activityLogs,
      blockedUsers,
      chatMessages,
      customChallenges,
      forumPosts,
      goals,
      healthSyncPaused,
      hydration,
      joinedChallengeIds,
      mindfulMinutes,
      mindfulSessionHistory,
      moderationReports,
      notificationPrefs,
      personalizationPrefs,
      proposedActivities,
      ugcRulesAccepted,
    ],
  );

  const updateNotificationPrefs = useCallback(
    (updates) => {
      setNotificationPrefs((prev) => {
        const next = { ...prev, ...updates };
        persistWorkspace({ notificationPrefs: next });
        return next;
      });
    },
    [persistWorkspace],
  );

  const setStepGoal = useCallback(
    (newStepGoal) => {
      const safeGoal = Math.max(1000, Math.min(50000, Number(newStepGoal) || 8000));
      setGoals((prev) => {
        const nextGoals = { ...prev, dailyStepsGoal: safeGoal };
        persistWorkspace({ goals: nextGoals });
        return nextGoals;
      });
      setMetrics((prev) => {
        const pct = Math.min(
          100,
          Math.round((prev.steps.current / Math.max(1, safeGoal)) * 100),
        );
        return {
          ...prev,
          steps: {
            ...prev.steps,
            goal: safeGoal,
            percentage: pct,
          },
        };
      });
    },
    [persistWorkspace],
  );

  const runNativeStoreSync = useCallback(async () => {
    const activeProfile = profileRef.current;
    if (!activeProfile) return;

    try {
      setSyncState('reading_records');
      const syncedMetrics = await healthService.syncNativeHealthStore(
        activeProfile,
        goalsRef.current,
      );
      const diag = healthService.getLiveDiagnostics();
      setMetrics(syncedMetrics);
      setLiveDiagnostics(diag);
      syncEmployeeStateFromProfile(activeProfile, syncedMetrics);

      setWearable((prev) => ({
        ...prev,
        isConnected:
          diag.sensorStatus === 'LIVE_PEDOMETER_STREAMING' ||
          diag.nativeHealthStoreStatus === 'CONNECTED',
        lastSyncTimestamp: syncedMetrics.lastSyncedAt,
        syncStatus:
          diag.sensorStatus === 'LIVE_PEDOMETER_STREAMING' ? 'live' : 'synced',
      }));

      if (activeProfile.companyId) {
        const weeklyTotal = (syncedMetrics.steps.weeklyTrend || []).reduce(
          (sum, d) => sum + d.steps,
          0,
        );
        const updatedRoster = await companyService.syncMemberMetricsToRoster(
          activeProfile,
          syncedMetrics.steps.current,
          weeklyTotal,
          syncedMetrics.activeCalories.burnedKcal,
          syncedMetrics.steps.distanceKm,
        );
        setCompanyRoster(updatedRoster);

        await apiClient.syncHealthBatch({
          userId: activeProfile.uid,
          officeBranch: activeProfile.companyName || 'Corporate Workspace',
          competitionId: walkingCompetition.id,
          steps: syncedMetrics.steps.current,
          idempotencyKey: `sync-${Math.floor(Date.now() / 10000)}`,
        });
      }
      setSyncState('success');
      setTimeout(() => setSyncState('idle'), 800);
    } catch {
      setSyncState('failed');
      setTimeout(() => setSyncState('idle'), 1200);
    }
  }, [syncEmployeeStateFromProfile, walkingCompetition.id]);

  useEffect(() => {
    if (
      !userAuth?.isAuthenticated ||
      !userProfile ||
      onboardingStep !== 'COMPLETED' ||
      healthSyncPaused
    ) {
      healthService.stopRealtimeHardwareStream();
      return;
    }

    healthService.startRealtimeHardwareStream(
      userProfile,
      goals,
      async (stepMetrics, calorieMetrics, diag) => {
        setLiveDiagnostics(diag);
        setMetrics((prev) => {
          const stepRatio = Math.min(
            1,
            stepMetrics.current / Math.max(1, stepMetrics.goal),
          );
          const readiness =
            stepMetrics.current > 0 || prev.sleep.hasReading || prev.heartRate.hasReading
              ? Math.round(stepRatio * 100)
              : 0;
          const nextMetrics = {
            ...prev,
            steps: stepMetrics,
            activeCalories: calorieMetrics,
            overallReadinessScore: readiness,
            lastSyncedAt: new Date().toISOString(),
          };
          syncEmployeeStateFromProfile(userProfile, nextMetrics);
          return nextMetrics;
        });

        if (userProfile.companyId) {
          const weeklyTotal = (stepMetrics.weeklyTrend || []).reduce(
            (sum, d) => sum + d.steps,
            0,
          );
          const updatedRoster = await companyService.syncMemberMetricsToRoster(
            userProfile,
            stepMetrics.current,
            weeklyTotal,
            calorieMetrics.burnedKcal,
            stepMetrics.distanceKm,
          );
          setCompanyRoster(updatedRoster);
        }
      },
    );

    runNativeStoreSync();
    const pollInterval = setInterval(() => {
      runNativeStoreSync();
    }, 10000);

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        runNativeStoreSync();
      }
    });

    return () => {
      clearInterval(pollInterval);
      appStateSub.remove();
      healthService.stopRealtimeHardwareStream();
    };
  }, [
    userAuth?.isAuthenticated,
    onboardingStep,
    userProfile?.uid,
    userProfile?.heightCm,
    userProfile?.weightKg,
    userProfile?.gender,
    userProfile?.companyId,
    userProfile?.verificationStatus,
    goals,
    healthSyncPaused,
    runNativeStoreSync,
    syncEmployeeStateFromProfile,
  ]);

  useEffect(() => {
    if (!userProfile?.companyId) return;
    const unsubscribe = companyService.subscribeToCompanyLeaderboard(
      userProfile.companyId,
      (liveMembers) => {
        setCompanyRoster(liveMembers);
      },
    );
    return () => {
      unsubscribe();
    };
  }, [userProfile?.companyId]);

  useEffect(() => {
    if (walkingCompetition.isEnded) return;
    const timer = setInterval(() => {
      setWalkingCompetition((prev) => {
        if (prev.isEnded || prev.remainingSeconds <= 1) return prev;
        return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [walkingCompetition.isEnded]);

  // ==========================================================================
  // 1. Account Sign Up, Login, Session & Complete Account Deletion
  //    SECURITY NOTE: Never stores plaintext or hashed passwords in AsyncStorage.
  // ==========================================================================
  const createInitialUserProfile = (uid, cleanEmail) => ({
    uid,
    email: cleanEmail,
    fullName: '',
    heightCm: 0,
    weightKg: 0,
    gender: 'male',
    age: 0,
    dateOfBirth: '',
    department: 'Engineering',
    jobTitle: '',
    bmi: 0,
    bmrKcal: 0,
    strideLengthMeters: 0,
    companyId: null,
    companyName: '',
    verificationStatus: 'PENDING_ID_UPLOAD',
    idCardUri: null,
    idCardFileName: null,
    idCardDimensions: null,
    idCardFileSize: null,
    idCardSubmittedAt: null,
    idCardVerifiedAt: null,
    idCardVerificationNote: null,
    hrHealthConsent: false,
    granularConsent: {
      shareSteps: false,
      shareHeartRateAndStress: false,
      shareSleepAndRecovery: false,
    },
    onboardingCompleted: false,
    healthPermissionsCompleted: false,
    companyOnboardingCompleted: false,
  });

  const signUpWithEmail = useCallback(
    async (email, password) => {
      const cleanEmail = (email || '').trim().toLowerCase();
      if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        throw new Error('Please enter a valid work email address (for example, name@company.com).');
      }
      if (!password || password.length < 8) {
        throw new Error('Please choose a password with at least 8 characters.');
      }

      let uid = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      let authMode = 'LOCAL_DEVICE_DEMO';

      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });
        if (error) {
          throw new Error(error.message || 'Unable to create cloud account.');
        }
        if (data?.user?.id) {
          uid = data.user.id;
          authMode = 'SUPABASE_CLOUD';
        }
      } else {
        const rawAccounts = await AsyncStorage.getItem(AUTH_ACCOUNTS_KEY);
        const accounts = rawAccounts ? JSON.parse(rawAccounts) : [];
        const existing = accounts.find((a) => a.email === cleanEmail);
        if (existing) {
          throw new Error(
            'A local profile with this email already exists on this device. Switch to Log In to continue.',
          );
        }
        // Store only non-sensitive account metadata (never store password or passwordHash)
        accounts.push({
          uid,
          email: cleanEmail,
          authMode: 'LOCAL_DEVICE_DEMO',
          createdAt: new Date().toISOString(),
        });
        await AsyncStorage.setItem(AUTH_ACCOUNTS_KEY, JSON.stringify(accounts));
      }

      const session = {
        uid,
        email: cleanEmail,
        isAuthenticated: true,
        authMode,
        sessionToken: `sess_${Date.now()}_${uid}`,
        lastLoginAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      };
      await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
      setUserAuth(session);

      const initialProfile = createInitialUserProfile(uid, cleanEmail);
      await persistUserProfile(initialProfile);
      syncEmployeeStateFromProfile(initialProfile, INITIAL_HEALTH_METRICS);
      setOnboardingStep('HEALTH_PERMISSIONS');
    },
    [persistUserProfile, syncEmployeeStateFromProfile],
  );

  const loginWithEmail = useCallback(
    async (email, password) => {
      const cleanEmail = (email || '').trim().toLowerCase();
      if (!cleanEmail.includes('@')) {
        throw new Error('Please enter a valid work email address.');
      }
      if (!password || password.length < 6) {
        throw new Error('Please enter your password (at least 6 characters).');
      }

      let uid = null;
      let authMode = 'LOCAL_DEVICE_DEMO';

      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) {
          throw new Error(error.message || 'Sign-in failed. Check your email and password.');
        }
        uid = data?.user?.id || `usr_${Date.now()}`;
        authMode = 'SUPABASE_CLOUD';
      } else {
        const rawAccounts = await AsyncStorage.getItem(AUTH_ACCOUNTS_KEY);
        const accounts = rawAccounts ? JSON.parse(rawAccounts) : [];
        const account = accounts.find((a) => a.email === cleanEmail);
        if (!account) {
          throw new Error(
            'No local profile found for this email on this device. Switch to Sign Up to create one.',
          );
        }
        uid = account.uid;
      }

      const session = {
        uid,
        email: cleanEmail,
        isAuthenticated: true,
        authMode,
        sessionToken: `sess_${Date.now()}_${uid}`,
        lastLoginAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      };
      await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
      setUserAuth(session);

      const profilesRaw = await AsyncStorage.getItem(USER_PROFILES_KEY);
      const profilesMap = profilesRaw ? JSON.parse(profilesRaw) : {};
      let activeProfile = profilesMap[uid] || null;
      if (!activeProfile) {
        activeProfile = createInitialUserProfile(uid, cleanEmail);
        await persistUserProfile(activeProfile);
      } else {
        setUserProfile(activeProfile);
        profileRef.current = activeProfile;
        syncEmployeeStateFromProfile(activeProfile, metrics);
        if (activeProfile.companyId) {
          const leaderboard = await companyService.getVerifiedCompanyLeaderboard(
            activeProfile.companyId,
          );
          setCompanyRoster(leaderboard);
        }
      }

      await healthService.loadCachedPermissions();
      setLiveDiagnostics(healthService.getLiveDiagnostics());
      setOnboardingStep(determineOnboardingStep(session, activeProfile));
    },
    [metrics, persistUserProfile, syncEmployeeStateFromProfile],
  );

  const verifyOtpSession = useCallback(
    async (email, otpCode) => {
      const cleanEmail = (email || '').trim().toLowerCase();
      if (!otpCode || otpCode.length < 6) {
        throw new Error('Please enter the 6-digit verification code.');
      }
      const rawAccounts = await AsyncStorage.getItem(AUTH_ACCOUNTS_KEY);
      const accounts = rawAccounts ? JSON.parse(rawAccounts) : [];
      let account = accounts.find((a) => a.email === cleanEmail);

      if (!account) {
        account = {
          uid: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          email: cleanEmail,
          authMode: 'LOCAL_DEVICE_DEMO',
          createdAt: new Date().toISOString(),
        };
        accounts.push(account);
        await AsyncStorage.setItem(AUTH_ACCOUNTS_KEY, JSON.stringify(accounts));
      }

      const session = {
        uid: account.uid,
        email: cleanEmail,
        isAuthenticated: true,
        authMode: 'LOCAL_DEVICE_DEMO',
        sessionToken: `otp_tok_${Date.now()}_${account.uid}`,
        lastLoginAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      };
      await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
      setUserAuth(session);

      const profilesRaw = await AsyncStorage.getItem(USER_PROFILES_KEY);
      const profilesMap = profilesRaw ? JSON.parse(profilesRaw) : {};
      let profile = profilesMap[account.uid] || null;
      if (!profile) {
        profile = createInitialUserProfile(account.uid, cleanEmail);
        await persistUserProfile(profile);
      } else {
        setUserProfile(profile);
        profileRef.current = profile;
      }

      await healthService.loadCachedPermissions();
      setLiveDiagnostics(healthService.getLiveDiagnostics());
      setOnboardingStep(determineOnboardingStep(session, profile));
    },
    [persistUserProfile],
  );

  const logout = useCallback(async () => {
    healthService.stopRealtimeHardwareStream();
    if (isSupabaseConfigured) {
      await supabase.auth.signOut().catch(() => {});
    }
    await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
    setUserAuth(null);
    setUserProfile(null);
    profileRef.current = null;
    setEmployee(DEFAULT_EMPLOYEE_PROFILE);
    setMetrics(createZeroBaselineMetrics(goals));
    setOnboardingStep('AUTH');
    setIsAuthModalOpen(false);
  }, [goals]);

  /**
   * Complete Account & Data Deletion (Play Store Account Deletion Requirement):
   * Permanently deletes the user's account record, profile, daily health metrics,
   * consent records, ID submissions, and user-authored community posts/messages.
   */
  const deleteAccount = useCallback(async () => {
    const targetUid = userAuth?.uid || userProfile?.uid || employee.id;
    const targetEmail = userAuth?.email || userProfile?.email || employee.email;

    healthService.stopRealtimeHardwareStream();

    if (isSupabaseConfigured) {
      await supabase.rpc('delete_my_account').catch(() => {});
      await supabase.auth.signOut().catch(() => {});
    }

    try {
      // 1. Remove from local accounts list
      const rawAccounts = await AsyncStorage.getItem(AUTH_ACCOUNTS_KEY);
      if (rawAccounts) {
        const accounts = JSON.parse(rawAccounts);
        const remaining = Array.isArray(accounts)
          ? accounts.filter((a) => a.uid !== targetUid && a.email !== targetEmail)
          : [];
        await AsyncStorage.setItem(AUTH_ACCOUNTS_KEY, JSON.stringify(remaining));
      }

      // 2. Remove from user profiles map
      const rawProfiles = await AsyncStorage.getItem(USER_PROFILES_KEY);
      if (rawProfiles) {
        const map = JSON.parse(rawProfiles);
        if (map && targetUid && map[targetUid]) {
          delete map[targetUid];
          await AsyncStorage.setItem(USER_PROFILES_KEY, JSON.stringify(map));
        }
      }

      // 3. Remove from company roster & ID submissions
      const rawRoster = await AsyncStorage.getItem('@pulsecorp_company_roster_db_v2');
      if (rawRoster) {
        const roster = JSON.parse(rawRoster);
        if (Array.isArray(roster)) {
          await AsyncStorage.setItem(
            '@pulsecorp_company_roster_db_v2',
            JSON.stringify(roster.filter((m) => m.uid !== targetUid)),
          );
        }
      }
      const rawSubmissions = await AsyncStorage.getItem('@pulsecorp_id_submissions_db_v2');
      if (rawSubmissions) {
        const subs = JSON.parse(rawSubmissions);
        if (Array.isArray(subs)) {
          await AsyncStorage.setItem(
            '@pulsecorp_id_submissions_db_v2',
            JSON.stringify(subs.filter((s) => s.uid !== targetUid)),
          );
        }
      }

      // 4. Remove daily step keys & active session & workspace state
      const stepKey = getDailyStepStorageKey();
      await Promise.all([
        AsyncStorage.removeItem(ACTIVE_SESSION_KEY),
        AsyncStorage.removeItem(APP_STATE_STORAGE_KEY),
        AsyncStorage.removeItem('@pulsecorp_health_permissions_v2'),
        AsyncStorage.removeItem(stepKey),
        targetUid ? AsyncStorage.removeItem(`${stepKey}_${targetUid}`) : Promise.resolve(),
      ]);
    } catch {
      // ignore storage cleanup error
    }

    // 5. Purge user's community posts, replies, chat messages, and social feed items
    supabaseEngine.purgeUserContent(targetUid);
    setForumPosts((prev) =>
      prev
        .filter((p) => p.authorId !== targetUid)
        .map((p) => ({
          ...p,
          replies: (p.replies || []).filter((r) => r.authorId !== targetUid),
        })),
    );
    setChatMessages((prev) => prev.filter((m) => m.senderId !== targetUid));
    setProposedActivities((prev) => prev.filter((a) => a.proposedById !== targetUid));
    setDirectoryEmployees(SAMPLE_DIRECTORY_COWORKERS);
    setActivityLogs([]);
    setJoinedChallengeIds([]);
    setHydration({
      currentMl: 0,
      goalMl: DEFAULT_USER_GOALS.hydrationGoalMl,
      glassesCount: 0,
      lastUpdatedAt: null,
    });
    setMindfulMinutes(0);
    setUgcRulesAccepted(false);
    setBlockedUsers([]);
    setModerationReports([]);
    setPrivacyAuditLogs([]);
    setUserAuth(null);
    setUserProfile(null);
    profileRef.current = null;
    setEmployee(DEFAULT_EMPLOYEE_PROFILE);
    setMetrics(createZeroBaselineMetrics(DEFAULT_USER_GOALS));
    setOnboardingStep('AUTH');
    setIsAuthModalOpen(false);
    return { deleted: true, uid: targetUid };
  }, [employee.email, employee.id, userAuth?.email, userAuth?.uid, userProfile?.email, userProfile?.uid]);

  // ==========================================================================
  // 2. Biometric Calibration & Company Workspace Onboarding
  // ==========================================================================
  const saveBiometricOnboarding = useCallback(
    async (input) => {
      if (!userAuth) throw new Error('Not authenticated.');

      const bmi = calculateBMI(input.weightKg, input.heightCm);
      const bmrKcal = calculateBMR(
        input.weightKg,
        input.heightCm,
        input.age,
        input.gender,
      );
      const strideLengthMeters = calculateStrideLengthMeters(
        input.heightCm,
        input.gender,
      );
      const strideLengthCm = calculateStrideLengthCm(
        input.heightCm,
        input.gender,
      );

      const updated = {
        ...(userProfile || createInitialUserProfile(userAuth.uid, userAuth.email)),
        fullName: input.fullName,
        heightCm: input.heightCm,
        weightKg: input.weightKg,
        gender: input.gender,
        age: input.age,
        dateOfBirth: input.dateOfBirth,
        department: input.department,
        jobTitle: input.jobTitle,
        bmi,
        bmrKcal,
        strideLengthMeters,
        strideLengthCm,
        onboardingCompleted: true,
      };

      await persistUserProfile(updated);
      syncEmployeeStateFromProfile(updated, metrics);

      setOnboardingStep(determineOnboardingStep(userAuth, updated));
    },
    [metrics, persistUserProfile, syncEmployeeStateFromProfile, userAuth, userProfile],
  );

  const selectCompanyForUser = useCallback(
    async (company) => {
      if (!userProfile) throw new Error('Complete your profile info first.');
      const assigned = await companyService.assignUserToCompany(userProfile, company);
      const updated = {
        ...userProfile,
        companyId: assigned.companyId,
        companyName: assigned.companyName,
        corporateDomain: assigned.corporateDomain,
        verificationStatus: assigned.verificationStatus,
      };
      await persistUserProfile(updated);
      syncEmployeeStateFromProfile(updated, metrics);
      const leaderboard = await companyService.getVerifiedCompanyLeaderboard(company.id);
      setCompanyRoster(leaderboard);
    },
    [metrics, persistUserProfile, syncEmployeeStateFromProfile, userProfile],
  );

  const registerAndSelectCompany = useCallback(
    async (name, corporateDomain, industry) => {
      if (!userProfile) throw new Error('Complete your profile info first.');
      const created = await companyService.registerCompany(
        name,
        corporateDomain,
        industry,
        userProfile.uid,
      );
      const allCompanies = await companyService.getCompanies();
      setCompanies(allCompanies);
      await selectCompanyForUser(created);
    },
    [selectCompanyForUser, userProfile],
  );

  const submitAndVerifyIdCard = useCallback(
    async (asset, optionalNote) => {
      if (!userProfile || !userProfile.companyId) {
        throw new Error('Select a company before uploading your ID card.');
      }

      const submission = await companyService.submitIdCardUpload(
        userProfile.uid,
        userProfile.companyId,
        asset,
      );

      const underReviewProfile = {
        ...userProfile,
        verificationStatus: 'UNDER_REVIEW',
        idCardUri: submission.uri,
        idCardFileName: asset.fileName,
        idCardDimensions: { width: submission.width, height: submission.height },
        idCardFileSize: submission.fileSize,
        idCardSubmittedAt: submission.submittedAt,
      };
      await persistUserProfile(underReviewProfile);

      const verification = await companyService.verifyEmployeeIdCard(
        userProfile.uid,
        userProfile.companyId,
        underReviewProfile,
        asset,
        optionalNote,
      );

      const finalProfile = {
        ...underReviewProfile,
        verificationStatus: verification.status,
        idCardVerifiedAt: verification.verifiedAt,
        ocrExtractedText: verification.extractedText,
        companyOnboardingCompleted: verification.status !== 'REJECTED',
        idCardVerificationNote:
          verification.status === 'UNDER_REVIEW'
            ? 'ID photo saved locally and marked Under Review for HR.'
            : verification.rejectionReason,
      };
      await persistUserProfile(finalProfile);
      syncEmployeeStateFromProfile(finalProfile, metrics);

      const [allCompanies, leaderboard] = await Promise.all([
        companyService.getCompanies(),
        companyService.getVerifiedCompanyLeaderboard(userProfile.companyId),
      ]);
      setCompanies(allCompanies);
      setCompanyRoster(leaderboard);

      return verification;
    },
    [metrics, persistUserProfile, syncEmployeeStateFromProfile, userProfile],
  );

  const advanceFromCompanyVerification = useCallback(async () => {
    if (!userProfile) return;
    const updated = {
      ...userProfile,
      companyOnboardingCompleted: true,
    };
    await persistUserProfile(updated);
    setOnboardingStep(determineOnboardingStep(userAuth, updated));
  }, [persistUserProfile, userAuth, userProfile]);

  const requestAllHealthPermissions = useCallback(async () => {
    setSyncState('requesting_permissions');
    const perms = await healthService.requestAllPermissions();
    setLiveDiagnostics(healthService.getLiveDiagnostics());
    setSyncState('idle');
    return perms;
  }, []);

  const completeHealthPermissionsOnboarding = useCallback(async () => {
    if (!userAuth) return;
    const baseProfile = userProfile || createInitialUserProfile(userAuth.uid, userAuth.email);
    const updated = {
      ...baseProfile,
      healthPermissionsCompleted: true,
    };
    await persistUserProfile(updated);
    const nextStep = determineOnboardingStep(userAuth, updated);
    setOnboardingStep(nextStep);
    await runNativeStoreSync();
  }, [persistUserProfile, runNativeStoreSync, userAuth, userProfile]);

  const forceSyncNow = useCallback(async () => {
    await runNativeStoreSync();
  }, [runNativeStoreSync]);

  const selectedWinningActivity =
    proposedActivities.length > 0
      ? [...proposedActivities].sort((a, b) => b.votesCount - a.votesCount)[0]
      : null;

  const loginAsDemoEmployee = useCallback(() => {
    setEmployee((prev) => ({ ...prev, userRole: 'EMPLOYEE' }));
    setIsAuthModalOpen(false);
  }, []);

  const loginAsDemoHrAdmin = useCallback(() => {
    setEmployee((prev) => ({ ...prev, userRole: 'HR_ADMIN' }));
    setIsAuthModalOpen(false);
  }, []);

  const loginWithCredentials = useCallback((params) => {
    setEmployee((prev) => ({
      ...prev,
      email: params.email.trim() || prev.email,
      name: params.name?.trim() || prev.name,
      userRole: params.role,
      officeBranch: params.officeBranch || prev.officeBranch,
    }));
    setIsAuthModalOpen(false);
  }, []);

  const refreshQuote = useCallback(
    (categoryOverride) => {
      const activeCat = categoryOverride ?? selectedQuoteCategory;
      const pool =
        activeCat === 'All'
          ? MOTIVATIONAL_QUOTES
          : MOTIVATIONAL_QUOTES.filter((q) => q.category === activeCat);
      const list = pool.length > 0 ? pool : MOTIVATIONAL_QUOTES;
      const otherQuotes = list.filter((q) => q.id !== currentQuote.id);
      const source = otherQuotes.length > 0 ? otherQuotes : list;
      const next = source[Math.floor(Math.random() * source.length)];
      setCurrentQuote(next);
    },
    [currentQuote.id, selectedQuoteCategory],
  );

  const setQuoteCategory = useCallback(
    (category) => {
      setSelectedQuoteCategory(category);
      refreshQuote(category);
    },
    [refreshQuote],
  );

  const toggleFavoriteQuote = useCallback((quoteId) => {
    setFavoriteQuoteIds((prev) =>
      prev.includes(quoteId) ? prev.filter((id) => id !== quoteId) : [...prev, quoteId],
    );
  }, []);

  const unlockDailyGate = useCallback(() => {
    setIsGateUnlocked(true);
  }, []);

  const openOnboardingFlow = useCallback(() => {
    setIsGateUnlocked(false);
  }, []);

  const syncWearable = useCallback(async () => {
    await runNativeStoreSync();
  }, [runNativeStoreSync]);

  const addWaterIntake = useCallback(
    (amountMl) => {
      setHydration((prev) => {
        const nextMl = Math.min(Math.max(prev.currentMl + amountMl, 0), 6000);
        const updated = {
          currentMl: nextMl,
          goalMl: goals.hydrationGoalMl,
          glassesCount: Math.round(nextMl / 250),
          lastUpdatedAt: new Date().toISOString(),
        };
        persistWorkspace({ hydration: updated });
        return updated;
      });
    },
    [goals.hydrationGoalMl, persistWorkspace],
  );

  const resetWaterIntake = useCallback(() => {
    const reset = {
      currentMl: 0,
      goalMl: goals.hydrationGoalMl,
      glassesCount: 0,
      lastUpdatedAt: new Date().toISOString(),
    };
    setHydration(reset);
    persistWorkspace({ hydration: reset });
  }, [goals.hydrationGoalMl, persistWorkspace]);

  const logWorkoutActivity = useCallback(
    (type, durationMinutes) => {
      const cadenceMap = {
        Walking: 105,
        Running: 155,
        Cycling: 80,
        'Strength Training': 40,
        'Desk Mobility': 45,
        HIIT: 135,
      };
      const cadence = cadenceMap[type] || 100;
      const estimatedSteps = Math.round(cadence * durationMinutes);
      const stride = userProfile?.strideLengthMeters || 0.72;
      const weight = userProfile?.weightKg || 70;
      const estimatedCalories = calculateActiveCaloriesFromSteps(
        estimatedSteps,
        stride,
        weight,
        cadence,
      );

      const newEntry = {
        id: `act-${Date.now()}`,
        type,
        durationMinutes,
        estimatedSteps,
        estimatedCalories,
        timestamp: new Date().toISOString(),
      };

      setActivityLogs((prev) => {
        const next = [newEntry, ...prev];
        persistWorkspace({ activityLogs: next });
        return next;
      });

      setMetrics((prev) => {
        const nextSteps = prev.steps.current + estimatedSteps;
        const nextDist = calculateDistanceKm(nextSteps, stride);
        const nextCal = prev.activeCalories.burnedKcal + estimatedCalories;
        const stepPct = Math.min(
          100,
          Math.round((nextSteps / Math.max(1, goals.dailyStepsGoal)) * 100),
        );
        const calPct = Math.min(
          100,
          Math.round((nextCal / Math.max(1, goals.dailyCaloriesGoal)) * 100),
        );
        return {
          ...prev,
          steps: {
            ...prev.steps,
            current: nextSteps,
            count: nextSteps,
            percentage: stepPct,
            distanceKm: nextDist,
            activeCalories: nextCal,
          },
          activeCalories: {
            burnedKcal: nextCal,
            targetKcal: goals.dailyCaloriesGoal,
            percentage: calPct,
          },
          lastSyncedAt: new Date().toISOString(),
        };
      });
    },
    [
      goals.dailyCaloriesGoal,
      goals.dailyStepsGoal,
      persistWorkspace,
      userProfile?.strideLengthMeters,
      userProfile?.weightKg,
    ],
  );

  const toggleJoinChallenge = useCallback(
    (challengeId) => {
      setJoinedChallengeIds((prev) => {
        const next = prev.includes(challengeId)
          ? prev.filter((id) => id !== challengeId)
          : [...prev, challengeId];
        persistWorkspace({ joinedChallengeIds: next });
        return next;
      });
    },
    [persistWorkspace],
  );

  const updateProfileAndGoals = useCallback(
    (profileUpdate, goalsUpdate) => {
      const nextEmployee = { ...employee, ...profileUpdate };
      const nextGoals = { ...goals, ...goalsUpdate };
      setEmployee(nextEmployee);
      setGoals(nextGoals);
      if (userProfile) {
        const nextUserProfile = {
          ...userProfile,
          fullName: profileUpdate.name ?? userProfile.fullName,
          email: profileUpdate.email ?? userProfile.email,
          companyName: profileUpdate.companyName ?? userProfile.companyName,
          jobTitle: profileUpdate.role ?? userProfile.jobTitle,
          department: profileUpdate.department ?? userProfile.department,
        };
        persistUserProfile(nextUserProfile);
      }
      persistWorkspace({ goals: nextGoals });
    },
    [employee, goals, persistUserProfile, persistWorkspace, userProfile],
  );

  const selectWearableProvider = useCallback(
    async (provider, modelName) => {
      setWearable((prev) => ({
        ...prev,
        provider,
        modelName,
        brand:
          provider === 'apple_health'
            ? 'Apple HealthKit'
            : provider === 'health_connect'
            ? 'Google Health Connect'
            : 'Hardware Pedometer',
      }));
      await runNativeStoreSync();
    },
    [runNativeStoreSync],
  );

  const completeMindfulSession = useCallback(
    (minutes, sessionMeta = null) => {
      const safeMins = Math.max(1, Number(minutes) || 2);
      const historyItem = {
        id: `mhist-${Date.now()}`,
        title: sessionMeta?.title || 'Guided Breathing Pause',
        category: sessionMeta?.category || 'Breathing',
        durationMinutes: safeMins,
        completedAt: new Date().toISOString(),
      };
      setMindfulMinutes((prev) => {
        const nextMins = prev + safeMins;
        setMindfulSessionHistory((prevHist) => {
          const nextHist = [historyItem, ...prevHist].slice(0, 30);
          persistWorkspace({
            mindfulMinutes: nextMins,
            mindfulSessionHistory: nextHist,
          });
          return nextHist;
        });
        return nextMins;
      });
    },
    [persistWorkspace],
  );

  const clearMindfulSessionHistory = useCallback(() => {
    setMindfulSessionHistory([]);
    persistWorkspace({ mindfulSessionHistory: [] });
  }, [persistWorkspace]);

  const updatePersonalizationPrefs = useCallback(
    (updates) => {
      setPersonalizationPrefs((prev) => {
        const next = {
          ...prev,
          ...updates,
          visibleHomeMetrics: {
            ...prev.visibleHomeMetrics,
            ...(updates.visibleHomeMetrics || {}),
          },
        };
        persistWorkspace({ personalizationPrefs: next });
        return next;
      });
    },
    [persistWorkspace],
  );

  const createCustomChallenge = useCallback(
    (input) => {
      const cleanTitle = (input.title || '').trim();
      if (!cleanTitle) {
        return { ok: false, error: 'Please enter a challenge title.' };
      }
      const targetVal = Math.max(1, Number(input.targetValue) || 15);
      const durationDays = Math.max(1, Math.min(30, Number(input.durationDays) || 7));
      const category = input.category || 'Active Minutes';
      const unit =
        category === 'Steps'
          ? 'steps'
          : category === 'Hydration'
          ? 'ml'
          : 'mins';
      const newChg = {
        id: `chg-custom-${Date.now()}`,
        title: cleanTitle,
        subtitle:
          (input.subtitle || '').trim() ||
          `Employee-created ${category.toLowerCase()} challenge (${durationDays} days).`,
        category,
        targetLabel: `Goal: ${targetVal.toLocaleString()} ${unit} / day`,
        targetValue: targetVal,
        unit,
        durationDays,
        scope: input.scope || 'PRIVATE_SMALL_TEAM',
        rules:
          (input.rules || '').trim() ||
          'Move at your own pace. Personal progress can remain private.',
        badgeLabel: input.badgeLabel || `${cleanTitle} Finisher`,
        createdBy: employee.name || 'Employee',
      };
      setCustomChallenges((prev) => {
        const next = [newChg, ...prev];
        setJoinedChallengeIds((prevJoined) => {
          const nextJoined = [newChg.id, ...prevJoined];
          persistWorkspace({
            customChallenges: next,
            joinedChallengeIds: nextJoined,
          });
          return nextJoined;
        });
        return next;
      });
      return { ok: true, challenge: newChg };
    },
    [employee.name, persistWorkspace],
  );

  const togglePauseHealthSync = useCallback(() => {
    setHealthSyncPaused((prev) => {
      const next = !prev;
      if (next) {
        healthService.stopRealtimeHardwareStream();
      }
      persistWorkspace({ healthSyncPaused: next });
      return next;
    });
  }, [persistWorkspace]);

  const disconnectHealthSource = useCallback(async () => {
    healthService.stopRealtimeHardwareStream();
    setHealthSyncPaused(true);
    setWearable((prev) => ({
      ...prev,
      isConnected: false,
      syncStatus: 'disconnected',
    }));
    await AsyncStorage.removeItem('@pulsecorp_health_permissions_v2').catch(() => {});
    await healthService.loadCachedPermissions();
    setLiveDiagnostics(healthService.getLiveDiagnostics());
    persistWorkspace({ healthSyncPaused: true });
  }, [persistWorkspace]);

  const checkInDailyStreak = useCallback(() => {
    setEmployee((prev) => ({
      ...prev,
      currentStreakDays: prev.currentStreakDays + 1,
      longestStreakDays: Math.max(prev.longestStreakDays, prev.currentStreakDays + 1),
    }));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const proposeWellnessActivity = useCallback(
    (input) => {
      const newActivity = {
        id: `act-poll-${Date.now()}`,
        title: input.title.trim(),
        description: input.description.trim() || 'Proposed team wellness session.',
        suggestedTime: input.suggestedTime.trim() || 'Fri · 4:00 PM',
        location: input.location.trim() || 'Company Courtyard',
        category: input.category,
        officeBranch: employee.officeBranch || 'Corporate Workspace',
        proposedById: employee.id,
        proposedByName: employee.name || 'Employee',
        votesCount: 1,
        voterUserIds: [employee.id],
        joinedUserIds: [employee.id],
        hrApproved: employee.userRole === 'HR_ADMIN',
        createdAt: 'Just now',
      };
      setProposedActivities((prev) => {
        const next = [newActivity, ...prev];
        persistWorkspace({ proposedActivities: next });
        return next;
      });
    },
    [
      employee.id,
      employee.name,
      employee.officeBranch,
      employee.userRole,
      persistWorkspace,
    ],
  );

  const toggleVoteWellnessActivity = useCallback(
    (activityId) => {
      setProposedActivities((prev) => {
        const next = prev.map((act) => {
          if (act.id !== activityId) return act;
          const alreadyVoted = act.voterUserIds.includes(employee.id);
          const nextVoters = alreadyVoted
            ? act.voterUserIds.filter((uid) => uid !== employee.id)
            : [...act.voterUserIds, employee.id];
          const delta = alreadyVoted ? -1 : 1;
          redisCluster.hincrby('wellness:activity:votes', activityId, delta);
          return {
            ...act,
            votesCount: Math.max(0, act.votesCount + delta),
            voterUserIds: nextVoters,
          };
        });
        persistWorkspace({ proposedActivities: next });
        return next;
      });
    },
    [employee.id, persistWorkspace],
  );

  const toggleJoinWellnessActivity = useCallback(
    (activityId) => {
      setProposedActivities((prev) => {
        const next = prev.map((act) => {
          if (act.id !== activityId) return act;
          const isJoined = act.joinedUserIds.includes(employee.id);
          const nextJoined = isJoined
            ? act.joinedUserIds.filter((uid) => uid !== employee.id)
            : [...act.joinedUserIds, employee.id];
          return { ...act, joinedUserIds: nextJoined };
        });
        persistWorkspace({ proposedActivities: next });
        return next;
      });
    },
    [employee.id, persistWorkspace],
  );

  const approveActivityByHr = useCallback(
    (activityId) => {
      setProposedActivities((prev) => {
        const next = prev.map((act) =>
          act.id === activityId ? { ...act, hrApproved: !act.hrApproved } : act,
        );
        persistWorkspace({ proposedActivities: next });
        return next;
      });
    },
    [persistWorkspace],
  );

  const setCompetitionScope = useCallback((scope) => {
    setWalkingCompetition((prev) => ({ ...prev, officeScope: scope }));
  }, []);

  const simulateCompetitionEnd = useCallback(() => {
    const sorted = [...companyRoster].sort((a, b) => b.todaySteps - a.todaySteps);
    const topWinner = sorted[0];

    setWalkingCompetition((prev) => ({
      ...prev,
      remainingSeconds: 0,
      isEnded: true,
      winnerEmployeeId: topWinner?.uid || employee.id,
      winnerEmployeeName: topWinner?.fullName || employee.name,
      winnerSteps: topWinner?.todaySteps || metrics.steps.current,
    }));
  }, [companyRoster, employee.id, employee.name, metrics.steps.current]);

  const resetCompetitionTimer = useCallback(
    (title, durationHours, prizeBadge) => {
      const seconds = Math.max(1, durationHours) * 3600;
      setWalkingCompetition((prev) => ({
        ...prev,
        id: `comp-${Date.now()}`,
        title: title.trim() || 'Team Walking Sprint',
        prizeBadge: prizeBadge.trim() || 'Team Pacesetter Badge',
        startTimeIso: new Date().toISOString(),
        endTimeIso: new Date(Date.now() + seconds * 1000).toISOString(),
        remainingSeconds: seconds,
        isEnded: false,
        winnerEmployeeId: null,
        winnerEmployeeName: null,
        winnerSteps: null,
      }));
    },
    [],
  );

  const updateHrPrivacyConsent = useCallback(
    async (hrHealthConsent, granularUpdate) => {
      const nextGranular = {
        ...employee.granularConsent,
        ...(granularUpdate || {}),
      };
      const nextEmployee = {
        ...employee,
        hrHealthConsent,
        granularConsent: nextGranular,
      };
      setEmployee(nextEmployee);

      if (userProfile) {
        const updatedProfile = {
          ...userProfile,
          hrHealthConsent,
          granularConsent: nextGranular,
        };
        await persistUserProfile(updatedProfile);
      }

      setDirectoryEmployees((prev) =>
        prev.map((d) =>
          d.id === employee.id
            ? {
                ...d,
                hrHealthConsent,
                granularConsent: nextGranular,
              }
            : d,
        ),
      );

      const response = await apiClient.updatePrivacyConsent({
        userId: employee.id,
        userName: employee.name,
        hrHealthConsent,
        granularConsent: nextGranular,
      });
      if (response.data) {
        setPrivacyAuditLogs((prev) => [response.data, ...prev]);
      }
    },
    [employee, persistUserProfile, userProfile],
  );

  const inspectEmployeeHealthForHr = useCallback(
    async (targetEmployeeId) => {
      const target = directoryEmployees.find((d) => d.id === targetEmployeeId);
      if (!target) {
        return {
          allowed: false,
          status: 404,
          errorMessage: 'Employee record not found.',
        };
      }
      const res = await apiClient.inspectEmployeeHealthForHr({
        requesterRole: employee.userRole,
        targetEmployee: target,
      });
      return {
        allowed: res.ok,
        status: res.status,
        employee: res.data,
        errorMessage: res.error,
      };
    },
    [directoryEmployees, employee.userRole],
  );

  const getCompanyAggregateInsights = useCallback(() => {
    const optedInMembers = directoryEmployees.filter((e) => e.hrHealthConsent);
    const totalMembers = directoryEmployees.length;
    const meetsMinimumGroupSize = optedInMembers.length >= MIN_AGGREGATE_GROUP_SIZE;
    const avgSteps = meetsMinimumGroupSize
      ? Math.round(
          optedInMembers.reduce((sum, e) => sum + (e.metrics?.steps || 0), 0) /
            Math.max(1, optedInMembers.length),
        )
      : null;
    return {
      totalMembers,
      optedInCount: optedInMembers.length,
      minGroupSizeRequired: MIN_AGGREGATE_GROUP_SIZE,
      meetsMinimumGroupSize,
      avgSteps,
    };
  }, [directoryEmployees]);

  // ==========================================================================
  // 3. Community Moderation: UGC Rules Acceptance, Blocking, Reporting & Rate-Limiting
  // ==========================================================================
  const acceptUgcRules = useCallback(() => {
    setUgcRulesAccepted(true);
    supabaseEngine.acceptUgcRules();
    persistWorkspace({ ugcRulesAccepted: true });
  }, [persistWorkspace]);

  const blockCommunityUser = useCallback(
    (targetUserId, targetUserName = 'User') => {
      if (!targetUserId || targetUserId === employee.id) return false;
      supabaseEngine.blockUser(targetUserId);
      setBlockedUsers((prev) => {
        if (prev.some((u) => u.id === targetUserId)) return prev;
        const next = [
          ...prev,
          {
            id: targetUserId,
            name: targetUserName,
            blockedAt: new Date().toISOString(),
          },
        ];
        persistWorkspace({ blockedUsers: next });
        return next;
      });
      return true;
    },
    [employee.id, persistWorkspace],
  );

  const unblockCommunityUser = useCallback(
    (targetUserId) => {
      supabaseEngine.unblockUser(targetUserId);
      setBlockedUsers((prev) => {
        const next = prev.filter((u) => u.id !== targetUserId);
        persistWorkspace({ blockedUsers: next });
        return next;
      });
      return true;
    },
    [persistWorkspace],
  );

  const reportCommunityContent = useCallback(
    ({ targetId, targetType = 'POST', authorId, authorName, reason, details = '' }) => {
      const res = supabaseEngine.reportContent({
        targetId,
        targetType,
        authorId,
        authorName,
        reason,
        details,
      });
      if (!res.ok) return res;
      setModerationReports((prev) => {
        const next = [res.report, ...prev];
        persistWorkspace({ moderationReports: next });
        return next;
      });
      // Also hide reported forum post or chat message from local state
      if (targetType === 'FORUM_POST') {
        setForumPosts((prev) => {
          const next = prev.filter((p) => p.id !== targetId);
          persistWorkspace({ forumPosts: next });
          return next;
        });
      } else if (targetType === 'CHAT_MESSAGE') {
        setChatMessages((prev) => {
          const next = prev.filter((m) => m.id !== targetId);
          persistWorkspace({ chatMessages: next });
          return next;
        });
      }
      return res;
    },
    [persistWorkspace],
  );

  const sendChatMessage = useCallback(
    (roomId, text) => {
      if (!ugcRulesAccepted) {
        return {
          ok: false,
          requiresUgcAcceptance: true,
          error: 'Please accept the Community Guidelines before sending messages.',
        };
      }
      const trimmed = (text || '').trim();
      if (!trimmed) return { ok: false, error: 'Message cannot be empty.' };
      const now = Date.now();
      if (now - lastUgcActionMsRef.current < 1200) {
        return { ok: false, error: 'Please wait a moment before sending another message.' };
      }
      lastUgcActionMsRef.current = now;

      const initials =
        (employee.name || 'U')
          .split(' ')
          .map((p) => p[0])
          .join('')
          .slice(0, 2)
          .toUpperCase() || 'US';

      const newMsg = {
        id: `msg-${Date.now()}`,
        roomId,
        senderId: employee.id,
        senderName: employee.name || 'Employee',
        senderInitials: initials,
        senderOffice: employee.officeBranch || 'Corporate Workspace',
        text: trimmed,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        readByCount: 1,
      };

      setChatMessages((prev) => {
        const next = [...prev, newMsg];
        persistWorkspace({ chatMessages: next });
        return next;
      });
      return { ok: true, message: newMsg };
    },
    [employee.id, employee.name, employee.officeBranch, persistWorkspace, ugcRulesAccepted],
  );

  const createForumPost = useCallback(
    (input) => {
      if (!ugcRulesAccepted) {
        return {
          ok: false,
          requiresUgcAcceptance: true,
          error: 'Please accept the Community Guidelines before publishing a post.',
        };
      }
      const now = Date.now();
      if (now - lastUgcActionMsRef.current < 2000) {
        return { ok: false, error: 'Please wait a moment before creating another post.' };
      }
      lastUgcActionMsRef.current = now;

      const newPost = {
        id: `post-${Date.now()}`,
        kind: input.kind,
        category: input.category,
        title: input.title.trim(),
        body: input.body.trim(),
        authorId: employee.id,
        authorName: input.isAnonymous
          ? 'Anonymous Colleague'
          : employee.name || 'Employee',
        authorOffice: employee.officeBranch || 'Corporate Workspace',
        isAnonymous: input.isAnonymous,
        upvotes: 1,
        upvotedByIds: [employee.id],
        acceptedReplyId: null,
        replies: [],
        createdAt: 'Just now',
      };
      setForumPosts((prev) => {
        const next = [newPost, ...prev];
        persistWorkspace({ forumPosts: next });
        return next;
      });
      return { ok: true, post: newPost };
    },
    [employee.id, employee.name, employee.officeBranch, persistWorkspace, ugcRulesAccepted],
  );

  const upvoteForumPost = useCallback(
    (postId) => {
      setForumPosts((prev) => {
        const next = prev.map((post) => {
          if (post.id !== postId) return post;
          const hasUpvoted = post.upvotedByIds.includes(employee.id);
          return {
            ...post,
            upvotes: hasUpvoted ? Math.max(0, post.upvotes - 1) : post.upvotes + 1,
            upvotedByIds: hasUpvoted
              ? post.upvotedByIds.filter((id) => id !== employee.id)
              : [...post.upvotedByIds, employee.id],
          };
        });
        persistWorkspace({ forumPosts: next });
        return next;
      });
    },
    [employee.id, persistWorkspace],
  );

  const addForumReply = useCallback(
    (postId, content) => {
      if (!ugcRulesAccepted) {
        return {
          ok: false,
          requiresUgcAcceptance: true,
          error: 'Please accept the Community Guidelines before posting a reply.',
        };
      }
      const trimmed = (content || '').trim();
      if (!trimmed) return { ok: false, error: 'Reply cannot be empty.' };
      setForumPosts((prev) => {
        const next = prev.map((post) => {
          if (post.id !== postId) return post;
          return {
            ...post,
            replies: [
              ...post.replies,
              {
                id: `reply-${Date.now()}`,
                postId,
                authorId: employee.id,
                authorName: employee.name || 'Employee',
                authorOffice: employee.officeBranch || 'Corporate Workspace',
                content: trimmed,
                upvotes: 1,
                upvotedByIds: [employee.id],
                isAcceptedSolution: false,
                createdAt: 'Just now',
              },
            ],
          };
        });
        persistWorkspace({ forumPosts: next });
        return next;
      });
      return { ok: true };
    },
    [employee.id, employee.name, employee.officeBranch, persistWorkspace, ugcRulesAccepted],
  );

  const upvoteForumReply = useCallback(
    (postId, replyId) => {
      setForumPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;
          return {
            ...post,
            replies: post.replies.map((r) => {
              if (r.id !== replyId) return r;
              const already = r.upvotedByIds.includes(employee.id);
              return {
                ...r,
                upvotes: already ? Math.max(0, r.upvotes - 1) : r.upvotes + 1,
                upvotedByIds: already
                  ? r.upvotedByIds.filter((id) => id !== employee.id)
                  : [...r.upvotedByIds, employee.id],
              };
            }),
          };
        }),
      );
    },
    [employee.id],
  );

  const markReplyAsAcceptedSolution = useCallback(
    (postId, replyId) => {
      setForumPosts((prev) => {
        const next = prev.map((post) => {
          if (post.id !== postId) return post;
          const isTogglingOff = post.acceptedReplyId === replyId;
          return {
            ...post,
            acceptedReplyId: isTogglingOff ? null : replyId,
            replies: post.replies.map((r) => ({
              ...r,
              isAcceptedSolution: !isTogglingOff && r.id === replyId,
            })),
          };
        });
        persistWorkspace({ forumPosts: next });
        return next;
      });
    },
    [persistWorkspace],
  );

  const resetAllAppData = useCallback(async () => {
    await deleteAccount();
  }, [deleteAccount]);

  const blockedIdSet = new Set(blockedUsers.map((u) => u.id));
  const visibleForumPosts = forumPosts.filter((p) => !blockedIdSet.has(p.authorId));
  const visibleChatMessages = chatMessages.filter((m) => !blockedIdSet.has(m.senderId));

  const pedometerStatus =
    liveDiagnostics.sensorStatus === 'LIVE_PEDOMETER_STREAMING'
      ? 'active'
      : liveDiagnostics.sensorStatus === 'PERMISSION_REQUIRED'
      ? 'permission_denied'
      : 'unavailable';

  return (
    <WellnessContext.Provider
      value={{
        userAuth,
        userProfile,
        onboardingStep,
        setOnboardingStep,
        companies,
        companyRoster,
        liveDiagnostics,
        signUpWithEmail,
        loginWithEmail,
        verifyOtpSession,
        logout,
        deleteAccount,
        saveBiometricOnboarding,
        selectCompanyForUser,
        registerAndSelectCompany,
        submitAndVerifyIdCard,
        advanceFromCompanyVerification,
        requestAllHealthPermissions,
        completeHealthPermissionsOnboarding,
        forceSyncNow,

        employee,
        metrics,
        wearable,
        syncState,
        isSyncing:
          syncState === 'requesting_permissions' ||
          syncState === 'reading_records' ||
          syncState === 'updating_profile',
        isSandboxMode: false,
        isGateUnlocked,
        isAuthModalOpen,
        setIsAuthModalOpen,
        activeTab,
        setActiveTab,
        moveSubTab,
        setMoveSubTab,
        rhythmRange,
        setRhythmRange,
        currentQuote,
        selectedQuoteCategory,
        favoriteQuoteIds,
        goals,
        setStepGoal,
        hydration,
        activityLogs,
        joinedChallengeIds,
        customChallenges,
        createCustomChallenge,
        mindfulMinutes,
        mindfulSessionHistory,
        clearMindfulSessionHistory,
        personalizationPrefs,
        updatePersonalizationPrefs,
        healthSyncPaused,
        togglePauseHealthSync,
        disconnectHealthSource,
        notifications,
        notificationPrefs,
        updateNotificationPrefs,
        pedometerStatus,
        liveSensorSteps: liveDiagnostics.liveSessionStepDelta,
        directoryEmployees,
        proposedActivities,
        selectedWinningActivity,
        walkingCompetition,
        privacyAuditLogs,
        chatRooms,
        chatMessages: visibleChatMessages,
        forumPosts: visibleForumPosts,
        ugcRulesAccepted,
        acceptUgcRules,
        blockedUsers,
        blockCommunityUser,
        unblockCommunityUser,
        moderationReports,
        reportCommunityContent,
        getCompanyAggregateInsights,
        unlockDailyGate,
        openOnboardingFlow,
        loginAsDemoEmployee,
        loginAsDemoHrAdmin,
        loginWithCredentials,
        syncWearable,
        refreshQuote,
        setQuoteCategory,
        toggleFavoriteQuote,
        addWaterIntake,
        resetWaterIntake,
        logWorkoutActivity,
        toggleJoinChallenge,
        updateProfileAndGoals,
        selectWearableProvider,
        completeMindfulSession,
        checkInDailyStreak,
        markAllNotificationsRead,
        proposeWellnessActivity,
        toggleVoteWellnessActivity,
        toggleJoinWellnessActivity,
        approveActivityByHr,
        setCompetitionScope,
        simulateCompetitionEnd,
        resetCompetitionTimer,
        updateHrPrivacyConsent,
        inspectEmployeeHealthForHr,
        sendChatMessage,
        createForumPost,
        upvoteForumPost,
        addForumReply,
        upvoteForumReply,
        markReplyAsAcceptedSolution,
        resetAllAppData,
      }}
    >
      {children}
    </WellnessContext.Provider>
  );
};

export function useWellness() {
  const ctx = useContext(WellnessContext);
  if (!ctx) {
    throw new Error('useWellness must be used within a WellnessProvider');
  }
  return ctx;
}
