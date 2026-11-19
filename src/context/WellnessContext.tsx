import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import {
  ActivityLog,
  AppTabKey,
  ChatMessage,
  ChatRoom,
  Company,
  CompanyRosterMember,
  CorporateDepartment,
  DirectoryEmployeeRecord,
  EmployeeProfile,
  ForumPost,
  ForumPostKind,
  GenderIdentity,
  GranularHealthConsent,
  HealthMetrics,
  HealthPermissionsMap,
  HydrationState,
  LiveTelemetryDiagnostics,
  MotivationalQuote,
  OcrVerificationResult,
  OfficeBranch,
  OnboardingStep,
  PedometerSensorStatus,
  PrivacyAuditLogEntry,
  ProposedWellnessActivity,
  QuoteFilterCategory,
  ReadinessState,
  RhythmRange,
  SyncEngineState,
  TipCategoryTag,
  UserAuth,
  UserGoals,
  UserProfile,
  UserRole,
  VerificationStatus,
  WalkingCompetition,
  WearableDevice,
  WearableProvider,
  WellnessActivityCategory,
  WellnessNotification,
  WorkoutActivityType,
} from '../types/index';
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
  healthService,
} from '../services/healthService';
import {
  companyService,
  PickedIdCardAsset,
} from '../services/companyService';
import { apiClient, redisCluster } from '../services/apiClient';
import {
  DEFAULT_EMPLOYEE_PROFILE,
  INITIAL_HEALTH_METRICS,
  MOTIVATIONAL_QUOTES,
} from '../constants/mockData';

const AUTH_ACCOUNTS_KEY = '@pulsecorp_auth_accounts_v2';
const ACTIVE_SESSION_KEY = '@pulsecorp_active_session_v2';
const USER_PROFILES_KEY = '@pulsecorp_user_profiles_v2';
const APP_STATE_STORAGE_KEY = '@pulsecorp_app_workspace_v2';

interface StoredAuthAccount {
  uid: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

const simpleHash = (input: string): string => {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `fnv1a_${(h >>> 0).toString(16)}`;
};

const INITIAL_COMPETITION: WalkingCompetition = {
  id: 'comp-live-sprint-01',
  title: 'Verified Company Step Sprint',
  subtitle:
    'Phone-sensor steps with optional Health Connect / HealthKit biometrics for verified company members.',
  officeScope: 'MY_OFFICE',
  prizeBadge: 'Verified Pacesetter Trophy',
  startTimeIso: new Date().toISOString(),
  endTimeIso: new Date(Date.now() + 7 * 86400000).toISOString(),
  remainingSeconds: 7 * 86400,
  isEnded: false,
  winnerEmployeeId: null,
  winnerEmployeeName: null,
  winnerSteps: null,
};

interface WellnessContextValue {
  // Real Auth, Onboarding, Company Verification & Live Telemetry
  userAuth: UserAuth | null;
  userProfile: UserProfile | null;
  onboardingStep: OnboardingStep;
  setOnboardingStep: (step: OnboardingStep) => void;
  companies: Company[];
  companyRoster: CompanyRosterMember[];
  liveDiagnostics: LiveTelemetryDiagnostics;

  signUpWithEmail: (email: string, password: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  verifyOtpSession: (email: string, otpCode: string) => Promise<void>;
  logout: () => Promise<void>;
  saveBiometricOnboarding: (input: {
    fullName: string;
    heightCm: number;
    weightKg: number;
    gender: GenderIdentity;
    age: number;
    dateOfBirth: string;
    department: CorporateDepartment;
    jobTitle: string;
  }) => Promise<void>;
  selectCompanyForUser: (company: Company) => Promise<void>;
  registerAndSelectCompany: (
    name: string,
    corporateDomain: string,
    industry: string,
  ) => Promise<void>;
  submitAndVerifyIdCard: (
    asset: PickedIdCardAsset,
    ocrBadgeTextOverride?: string,
  ) => Promise<OcrVerificationResult>;
  advanceFromCompanyVerification: () => Promise<void>;
  requestAllHealthPermissions: () => Promise<HealthPermissionsMap>;
  completeHealthPermissionsOnboarding: () => Promise<void>;
  forceSyncNow: () => Promise<void>;

  // Core App State
  employee: EmployeeProfile;
  metrics: HealthMetrics;
  wearable: WearableDevice;
  syncState: SyncEngineState;
  isSyncing: boolean;
  isSandboxMode: boolean;
  isGateUnlocked: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  activeTab: AppTabKey;
  setActiveTab: (tab: AppTabKey) => void;
  rhythmRange: RhythmRange;
  setRhythmRange: (range: RhythmRange) => void;
  currentQuote: MotivationalQuote;
  selectedQuoteCategory: QuoteFilterCategory;
  favoriteQuoteIds: string[];
  goals: UserGoals;
  hydration: HydrationState;
  activityLogs: ActivityLog[];
  joinedChallengeIds: string[];
  mindfulMinutes: number;
  notifications: WellnessNotification[];
  pedometerStatus: PedometerSensorStatus;
  liveSensorSteps: number;

  directoryEmployees: DirectoryEmployeeRecord[];
  proposedActivities: ProposedWellnessActivity[];
  selectedWinningActivity: ProposedWellnessActivity | null;
  walkingCompetition: WalkingCompetition;
  privacyAuditLogs: PrivacyAuditLogEntry[];
  chatRooms: ChatRoom[];
  chatMessages: ChatMessage[];
  forumPosts: ForumPost[];

  // Actions
  unlockDailyGate: () => void;
  openOnboardingFlow: () => void;
  loginAsDemoEmployee: () => void;
  loginAsDemoHrAdmin: () => void;
  loginWithCredentials: (params: {
    email: string;
    name?: string;
    role: UserRole;
    officeBranch: OfficeBranch;
  }) => void;
  syncWearable: () => Promise<void>;
  refreshQuote: (categoryOverride?: QuoteFilterCategory) => void;
  setQuoteCategory: (category: QuoteFilterCategory) => void;
  toggleFavoriteQuote: (quoteId: string) => void;
  addWaterIntake: (amountMl: number) => void;
  resetWaterIntake: () => void;
  logWorkoutActivity: (type: WorkoutActivityType, durationMinutes: number) => void;
  toggleJoinChallenge: (challengeId: string) => void;
  updateProfileAndGoals: (
    profileUpdate: Partial<
      Pick<
        EmployeeProfile,
        'name' | 'email' | 'companyName' | 'role' | 'department' | 'officeBranch'
      >
    >,
    goalsUpdate: Partial<UserGoals>,
  ) => void;
  selectWearableProvider: (provider: WearableProvider, modelName: string) => Promise<void>;
  completeMindfulSession: (minutes: number) => void;
  checkInDailyStreak: () => void;
  markAllNotificationsRead: () => void;

  proposeWellnessActivity: (input: {
    title: string;
    description: string;
    suggestedTime: string;
    location: string;
    category: WellnessActivityCategory;
  }) => void;
  toggleVoteWellnessActivity: (activityId: string) => void;
  toggleJoinWellnessActivity: (activityId: string) => void;
  approveActivityByHr: (activityId: string) => void;

  setCompetitionScope: (scope: 'MY_OFFICE' | 'ALL_OFFICES') => void;
  simulateCompetitionEnd: () => void;
  resetCompetitionTimer: (title: string, durationHours: number, prizeBadge: string) => void;

  updateHrPrivacyConsent: (
    hrHealthConsent: boolean,
    granularUpdate?: Partial<GranularHealthConsent>,
  ) => Promise<void>;
  inspectEmployeeHealthForHr: (targetEmployeeId: string) => Promise<{
    allowed: boolean;
    status: number;
    employee?: DirectoryEmployeeRecord;
    errorMessage?: string;
  }>;

  sendChatMessage: (roomId: string, text: string) => void;
  createForumPost: (input: {
    kind: ForumPostKind;
    category: TipCategoryTag;
    title: string;
    body: string;
    isAnonymous: boolean;
  }) => void;
  upvoteForumPost: (postId: string) => void;
  addForumReply: (postId: string, content: string) => void;
  upvoteForumReply: (postId: string, replyId: string) => void;
  markReplyAsAcceptedSolution: (postId: string, replyId: string) => void;
  resetAllAppData: () => Promise<void>;
}

const WellnessContext = createContext<WellnessContextValue | undefined>(undefined);

function deriveReadinessState(score: number, hasData: boolean): ReadinessState {
  if (!hasData || score <= 0) return 'Awaiting Wearable Sync';
  if (score >= 90) return 'Peak Performance';
  if (score >= 80) return 'Optimal Readiness';
  if (score >= 65) return 'Moderate Equilibrium';
  return 'Active Recovery';
}

function determineOnboardingStep(
  auth: UserAuth | null,
  profile: UserProfile | null,
): OnboardingStep {
  if (!auth || !auth.isAuthenticated) return 'AUTH';
  // Ask for phone motion and optional health-store permissions immediately after login
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
  if (!profile.companyId || profile.verificationStatus !== 'VERIFIED') {
    return 'COMPANY_ID_VERIFICATION';
  }
  return 'COMPLETED';
}

export const WellnessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userAuth, setUserAuth] = useState<UserAuth | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>('AUTH');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyRoster, setCompanyRoster] = useState<CompanyRosterMember[]>([]);
  const [liveDiagnostics, setLiveDiagnostics] = useState<LiveTelemetryDiagnostics>(
    DEFAULT_LIVE_DIAGNOSTICS,
  );

  const [employee, setEmployee] = useState<EmployeeProfile>(DEFAULT_EMPLOYEE_PROFILE);
  const [metrics, setMetrics] = useState<HealthMetrics>(INITIAL_HEALTH_METRICS);
  const [goals, setGoals] = useState<UserGoals>(DEFAULT_USER_GOALS);
  const [hydration, setHydration] = useState<HydrationState>({
    currentMl: 0,
    goalMl: DEFAULT_USER_GOALS.hydrationGoalMl,
    glassesCount: 0,
    lastUpdatedAt: null,
  });
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [joinedChallengeIds, setJoinedChallengeIds] = useState<string[]>([]);
  const [favoriteQuoteIds, setFavoriteQuoteIds] = useState<string[]>([]);
  const [selectedQuoteCategory, setSelectedQuoteCategory] =
    useState<QuoteFilterCategory>('All');
  const [currentQuote, setCurrentQuote] = useState<MotivationalQuote>(
    MOTIVATIONAL_QUOTES[0],
  );
  const [isGateUnlocked, setIsGateUnlocked] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<AppTabKey>('home');
  const [rhythmRange, setRhythmRange] = useState<RhythmRange>('today');
  const [mindfulMinutes, setMindfulMinutes] = useState<number>(0);
  const [notifications, setNotifications] = useState<WellnessNotification[]>([]);
  const [syncState, setSyncState] = useState<SyncEngineState>('idle');

  const [wearable, setWearable] = useState<WearableDevice>({
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

  const [directoryEmployees, setDirectoryEmployees] = useState<DirectoryEmployeeRecord[]>(
    [],
  );
  const [proposedActivities, setProposedActivities] = useState<ProposedWellnessActivity[]>(
    [],
  );
  const [walkingCompetition, setWalkingCompetition] =
    useState<WalkingCompetition>(INITIAL_COMPETITION);
  const [privacyAuditLogs, setPrivacyAuditLogs] = useState<PrivacyAuditLogEntry[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([
    {
      id: 'room-my-office',
      name: 'Company General Wellness Channel',
      subtitle: 'Real-time workspace wellness & step challenge discussion',
      type: 'OFFICE_GROUP',
      officeBranch: 'Corporate Workspace',
      onlineCount: 1,
      unreadCount: 0,
      typingUser: null,
    },
  ]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);

  const profileRef = useRef<UserProfile | null>(null);
  profileRef.current = userProfile;
  const goalsRef = useRef<UserGoals>(goals);
  goalsRef.current = goals;

  // Sync UserProfile into EmployeeProfile & DirectoryEmployeeRecord
  const syncEmployeeStateFromProfile = useCallback(
    (profile: UserProfile, currentMetrics: HealthMetrics) => {
      const hasData =
        currentMetrics.steps.current > 0 ||
        currentMetrics.heartRate.hasReading ||
        currentMetrics.sleep.hasReading;
      const readinessScore = currentMetrics.overallReadinessScore || 0;
      const readinessState = deriveReadinessState(readinessScore, hasData);

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
        verificationStatus: profile.verificationStatus,
      }));

      setDirectoryEmployees((prev) => {
        const record: DirectoryEmployeeRecord = {
          id: profile.uid,
          employeeCode: `EMP-${profile.uid.slice(-5).toUpperCase()}`,
          name: profile.fullName || profile.email.split('@')[0],
          email: profile.email,
          role: profile.jobTitle || 'Employee',
          userRole: 'EMPLOYEE',
          officeBranch: profile.companyName || 'Corporate Workspace',
          department: profile.department || 'Engineering',
          hrHealthConsent: true,
          granularConsent: {
            shareSteps: true,
            shareHeartRateAndStress: true,
            shareSleepAndRecovery: true,
          },
          lastSyncedAt: currentMetrics.lastSyncedAt
            ? new Date(currentMetrics.lastSyncedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'No sync yet',
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
    },
    [],
  );

  // Persist user profile to dictionary in AsyncStorage
  const persistUserProfile = useCallback(async (profile: UserProfile) => {
    setUserProfile(profile);
    profileRef.current = profile;
    try {
      const raw = await AsyncStorage.getItem(USER_PROFILES_KEY);
      const map: Record<string, UserProfile> = raw ? JSON.parse(raw) : {};
      map[profile.uid] = profile;
      await AsyncStorage.setItem(USER_PROFILES_KEY, JSON.stringify(map));
    } catch {
      // ignore storage error
    }
  }, []);

  // Load persisted Auth Session, UserProfile, Companies, Roster & Permissions on startup
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [
          loadedPerms,
          loadedCompanies,
          sessionRaw,
          profilesRaw,
          workspaceRaw,
        ] = await Promise.all([
          healthService.loadCachedPermissions(),
          companyService.getCompanies(),
          AsyncStorage.getItem(ACTIVE_SESSION_KEY),
          AsyncStorage.getItem(USER_PROFILES_KEY),
          AsyncStorage.getItem(APP_STATE_STORAGE_KEY),
        ]);

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
        }

        if (sessionRaw) {
          const auth: UserAuth = JSON.parse(sessionRaw);
          if (auth && auth.isAuthenticated && auth.uid) {
            setUserAuth(auth);
            const profilesMap: Record<string, UserProfile> = profilesRaw
              ? JSON.parse(profilesRaw)
              : {};
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

  // Persist workspace data
  const persistWorkspace = useCallback(
    async (overrides: Record<string, any> = {}) => {
      try {
        const payload = {
          goals,
          hydration,
          activityLogs,
          joinedChallengeIds,
          proposedActivities,
          chatMessages,
          forumPosts,
          ...overrides,
        };
        await AsyncStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(payload));
      } catch {
        // ignore
      }
    },
    [
      activityLogs,
      forumPosts,
      goals,
      hydration,
      joinedChallengeIds,
      proposedActivities,
      chatMessages,
    ],
  );

  /**
   * Dual-Stream Real-Time Telemetry Engine:
   * Stream A: Instant Hardware Pedometer & Accelerometer (<1s latency)
   * Stream B: Native Health Connect / Apple HealthKit 10-second loop + AppState focus sync
   */
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
    if (!userAuth?.isAuthenticated || !userProfile) {
      healthService.stopRealtimeHardwareStream();
      return;
    }

    // Start Stream A: Hardware Pedometer + Accelerometer live listener
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
          const nextMetrics: HealthMetrics = {
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

    // Start Stream B: Immediate Native Health Store Sync + 10-Second Polling + AppState Focus
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
    userProfile?.uid,
    userProfile?.heightCm,
    userProfile?.weightKg,
    userProfile?.gender,
    userProfile?.companyId,
    userProfile?.verificationStatus,
    liveDiagnostics.permissions.pedometer,
    liveDiagnostics.permissions.activityRecognition,
    goals,
    runNativeStoreSync,
    syncEmployeeStateFromProfile,
  ]);

  // 7. Live Company Leaderboard Subscription (filtered by verified companyId)
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

  // Competition 1s countdown
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
  // 1. Real Authentication Actions (Sign Up, Login, OTP Session, Logout)
  // ==========================================================================
  const signUpWithEmail = useCallback(
    async (email: string, password: string) => {
      const cleanEmail = email.trim().toLowerCase();
      const rawAccounts = await AsyncStorage.getItem(AUTH_ACCOUNTS_KEY);
      const accounts: StoredAuthAccount[] = rawAccounts ? JSON.parse(rawAccounts) : [];

      const existing = accounts.find((a) => a.email === cleanEmail);
      if (existing) {
        throw new Error(
          'An account with this email already exists. Please switch to the Login tab.',
        );
      }

      const uid = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const newAccount: StoredAuthAccount = {
        uid,
        email: cleanEmail,
        passwordHash: simpleHash(password),
        createdAt: new Date().toISOString(),
      };
      accounts.push(newAccount);
      await AsyncStorage.setItem(AUTH_ACCOUNTS_KEY, JSON.stringify(accounts));

      const session: UserAuth = {
        uid,
        email: cleanEmail,
        isAuthenticated: true,
        sessionToken: `tok_${Date.now()}_${uid}`,
        lastLoginAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
      setUserAuth(session);

      const initialProfile: UserProfile = {
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
        onboardingCompleted: false,
        healthPermissionsCompleted: false,
      };
      await persistUserProfile(initialProfile);
      setOnboardingStep('HEALTH_PERMISSIONS');
    },
    [persistUserProfile],
  );

  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      const cleanEmail = email.trim().toLowerCase();
      const rawAccounts = await AsyncStorage.getItem(AUTH_ACCOUNTS_KEY);
      const accounts: StoredAuthAccount[] = rawAccounts ? JSON.parse(rawAccounts) : [];

      const account = accounts.find((a) => a.email === cleanEmail);
      if (!account) {
        throw new Error(
          'No account found for this email. Please create an account in the Sign Up tab first.',
        );
      }
      if (account.passwordHash !== simpleHash(password)) {
        throw new Error('Incorrect password. Please try again.');
      }

      const session: UserAuth = {
        uid: account.uid,
        email: cleanEmail,
        isAuthenticated: true,
        sessionToken: `tok_${Date.now()}_${account.uid}`,
        lastLoginAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
      setUserAuth(session);

      const profilesRaw = await AsyncStorage.getItem(USER_PROFILES_KEY);
      const profilesMap: Record<string, UserProfile> = profilesRaw
        ? JSON.parse(profilesRaw)
        : {};
      let activeProfile = profilesMap[account.uid] || null;
      if (!activeProfile) {
        activeProfile = {
          uid: account.uid,
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
          onboardingCompleted: false,
          healthPermissionsCompleted: false,
        };
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

      // Immediately ask for / verify phone step-sensor and optional health-store permissions on login
      const perms = await healthService.requestAllPermissions();
      setLiveDiagnostics(healthService.getLiveDiagnostics());
      const hasAnyGrant =
        perms.steps === 'GRANTED' ||
        perms.pedometer === 'GRANTED' ||
        perms.heartRate === 'GRANTED';

      if (!activeProfile.healthPermissionsCompleted || (!hasAnyGrant && Platform.OS !== 'web')) {
        setOnboardingStep('HEALTH_PERMISSIONS');
      } else {
        setOnboardingStep(determineOnboardingStep(session, activeProfile));
      }
    },
    [metrics, persistUserProfile, syncEmployeeStateFromProfile],
  );

  const verifyOtpSession = useCallback(
    async (email: string, otpCode: string) => {
      const cleanEmail = email.trim().toLowerCase();
      if (!otpCode || otpCode.length < 6) {
        throw new Error('Invalid 6-digit OTP code.');
      }
      const rawAccounts = await AsyncStorage.getItem(AUTH_ACCOUNTS_KEY);
      const accounts: StoredAuthAccount[] = rawAccounts ? JSON.parse(rawAccounts) : [];
      let account = accounts.find((a) => a.email === cleanEmail);

      if (!account) {
        account = {
          uid: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          email: cleanEmail,
          passwordHash: simpleHash(otpCode),
          createdAt: new Date().toISOString(),
        };
        accounts.push(account);
        await AsyncStorage.setItem(AUTH_ACCOUNTS_KEY, JSON.stringify(accounts));
      }

      const session: UserAuth = {
        uid: account.uid,
        email: cleanEmail,
        isAuthenticated: true,
        sessionToken: `otp_tok_${Date.now()}_${account.uid}`,
        lastLoginAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
      setUserAuth(session);

      const profilesRaw = await AsyncStorage.getItem(USER_PROFILES_KEY);
      const profilesMap: Record<string, UserProfile> = profilesRaw
        ? JSON.parse(profilesRaw)
        : {};
      let profile = profilesMap[account.uid] || null;
      if (!profile) {
        profile = {
          uid: account.uid,
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
          onboardingCompleted: false,
          healthPermissionsCompleted: false,
        };
        await persistUserProfile(profile);
      } else {
        setUserProfile(profile);
        profileRef.current = profile;
      }

      await healthService.requestAllPermissions();
      setLiveDiagnostics(healthService.getLiveDiagnostics());
      setOnboardingStep(determineOnboardingStep(session, profile));
    },
    [persistUserProfile],
  );

  const logout = useCallback(async () => {
    healthService.stopRealtimeHardwareStream();
    await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
    setUserAuth(null);
    setUserProfile(null);
    profileRef.current = null;
    setEmployee(DEFAULT_EMPLOYEE_PROFILE);
    setMetrics(createZeroBaselineMetrics(goals));
    setOnboardingStep('AUTH');
    setIsAuthModalOpen(false);
  }, [goals]);

  // ==========================================================================
  // 2. Biometric Calibration & Company ID Verification Actions
  // ==========================================================================
  const saveBiometricOnboarding = useCallback(
    async (input: {
      fullName: string;
      heightCm: number;
      weightKg: number;
      gender: GenderIdentity;
      age: number;
      dateOfBirth: string;
      department: CorporateDepartment;
      jobTitle: string;
    }) => {
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

      const updated: UserProfile = {
        ...(userProfile || {
          uid: userAuth.uid,
          email: userAuth.email,
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
          healthPermissionsCompleted: false,
        }),
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
    async (company: Company) => {
      if (!userProfile) throw new Error('Complete biometric profile first.');
      const assigned = await companyService.assignUserToCompany(userProfile, company);
      const updated: UserProfile = {
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
    async (name: string, corporateDomain: string, industry: string) => {
      if (!userProfile) throw new Error('Complete biometric profile first.');
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
    async (asset: PickedIdCardAsset, ocrBadgeTextOverride?: string) => {
      if (!userProfile || !userProfile.companyId) {
        throw new Error('Select a company before submitting your ID card.');
      }

      // 1. Submit ID Card & transition to UNDER_REVIEW
      const submission = await companyService.submitIdCardUpload(
        userProfile.uid,
        userProfile.companyId,
        asset,
      );

      const underReviewProfile: UserProfile = {
        ...userProfile,
        verificationStatus: 'UNDER_REVIEW',
        idCardUri: submission.uri,
        idCardFileName: asset.fileName,
        idCardDimensions: { width: submission.width, height: submission.height },
        idCardFileSize: submission.fileSize,
        idCardSubmittedAt: submission.submittedAt,
      };
      await persistUserProfile(underReviewProfile);

      // 2. Run Automated AI/OCR Vision Verification -> transitions to VERIFIED or REJECTED
      const verification = await companyService.verifyEmployeeIdCard(
        userProfile.uid,
        userProfile.companyId,
        underReviewProfile,
        asset,
        ocrBadgeTextOverride,
      );

      const finalProfile: UserProfile = {
        ...underReviewProfile,
        verificationStatus: verification.status,
        idCardVerifiedAt: verification.verifiedAt,
        ocrExtractedText: verification.extractedText,
        idCardVerificationNote:
          verification.status === 'VERIFIED'
            ? `AI/OCR Verified (${verification.confidenceScore}% confidence — Full Name & Company matched on ID card)`
            : verification.rejectionReason,
      };
      await persistUserProfile(finalProfile);
      syncEmployeeStateFromProfile(finalProfile, metrics);

      // Refresh companies & verified company leaderboard
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
    setOnboardingStep(determineOnboardingStep(userAuth, userProfile));
  }, [userAuth, userProfile]);

  const requestAllHealthPermissions = useCallback(async () => {
    setSyncState('requesting_permissions');
    const perms = await healthService.requestAllPermissions();
    setLiveDiagnostics(healthService.getLiveDiagnostics());
    setSyncState('idle');
    return perms;
  }, []);

  const completeHealthPermissionsOnboarding = useCallback(async () => {
    if (!userAuth) return;
    const baseProfile: UserProfile = userProfile || {
      uid: userAuth.uid,
      email: userAuth.email,
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
      onboardingCompleted: false,
      healthPermissionsCompleted: false,
    };
    const updated: UserProfile = {
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

  // ==========================================================================
  // Existing App Actions (Zero-Mock Compatible)
  // ==========================================================================
  const selectedWinningActivity =
    proposedActivities.length > 0
      ? [...proposedActivities].sort((a, b) => b.votesCount - a.votesCount)[0]
      : null;

  const loginAsDemoEmployee = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const loginAsDemoHrAdmin = useCallback(() => {
    setEmployee((prev) => ({ ...prev, userRole: 'HR_ADMIN' }));
    setIsAuthModalOpen(false);
  }, []);

  const loginWithCredentials = useCallback(
    (params: {
      email: string;
      name?: string;
      role: UserRole;
      officeBranch: OfficeBranch;
    }) => {
      setEmployee((prev) => ({
        ...prev,
        email: params.email.trim() || prev.email,
        name: params.name?.trim() || prev.name,
        userRole: params.role,
        officeBranch: params.officeBranch || prev.officeBranch,
      }));
      setIsAuthModalOpen(false);
    },
    [],
  );

  const refreshQuote = useCallback(
    (categoryOverride?: QuoteFilterCategory) => {
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
    (category: QuoteFilterCategory) => {
      setSelectedQuoteCategory(category);
      refreshQuote(category);
    },
    [refreshQuote],
  );

  const toggleFavoriteQuote = useCallback((quoteId: string) => {
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
    (amountMl: number) => {
      setHydration((prev) => {
        const nextMl = Math.min(Math.max(prev.currentMl + amountMl, 0), 6000);
        const updated: HydrationState = {
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
    const reset: HydrationState = {
      currentMl: 0,
      goalMl: goals.hydrationGoalMl,
      glassesCount: 0,
      lastUpdatedAt: new Date().toISOString(),
    };
    setHydration(reset);
    persistWorkspace({ hydration: reset });
  }, [goals.hydrationGoalMl, persistWorkspace]);

  const logWorkoutActivity = useCallback(
    (type: WorkoutActivityType, durationMinutes: number) => {
      const cadenceMap: Record<WorkoutActivityType, number> = {
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

      const newEntry: ActivityLog = {
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
    (challengeId: string) => {
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
    (
      profileUpdate: Partial<
        Pick<
          EmployeeProfile,
          'name' | 'email' | 'companyName' | 'role' | 'department' | 'officeBranch'
        >
      >,
      goalsUpdate: Partial<UserGoals>,
    ) => {
      const nextEmployee = { ...employee, ...profileUpdate };
      const nextGoals = { ...goals, ...goalsUpdate };
      setEmployee(nextEmployee);
      setGoals(nextGoals);
      if (userProfile) {
        const nextUserProfile: UserProfile = {
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
    async (provider: WearableProvider, modelName: string) => {
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

  const completeMindfulSession = useCallback((minutes: number) => {
    setMindfulMinutes((prev) => prev + minutes);
  }, []);

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
    (input: {
      title: string;
      description: string;
      suggestedTime: string;
      location: string;
      category: WellnessActivityCategory;
    }) => {
      const newActivity: ProposedWellnessActivity = {
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
    (activityId: string) => {
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
    (activityId: string) => {
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
    (activityId: string) => {
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

  const setCompetitionScope = useCallback((scope: 'MY_OFFICE' | 'ALL_OFFICES') => {
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
    (title: string, durationHours: number, prizeBadge: string) => {
      const seconds = Math.max(1, durationHours) * 3600;
      setWalkingCompetition((prev) => ({
        ...prev,
        id: `comp-${Date.now()}`,
        title: title.trim() || 'Verified Company Step Sprint',
        prizeBadge: prizeBadge.trim() || 'Verified Pacesetter Trophy',
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
    async (hrHealthConsent: boolean, granularUpdate?: Partial<GranularHealthConsent>) => {
      const nextGranular: GranularHealthConsent = {
        ...employee.granularConsent,
        ...(granularUpdate || {}),
      };
      const nextEmployee: EmployeeProfile = {
        ...employee,
        hrHealthConsent,
        granularConsent: nextGranular,
      };
      setEmployee(nextEmployee);

      const response = await apiClient.updatePrivacyConsent({
        userId: employee.id,
        userName: employee.name,
        hrHealthConsent,
        granularConsent: nextGranular,
      });
      if (response.data) {
        setPrivacyAuditLogs((prev) => [response.data!, ...prev]);
      }
    },
    [employee],
  );

  const inspectEmployeeHealthForHr = useCallback(
    async (targetEmployeeId: string) => {
      const target = directoryEmployees.find((d) => d.id === targetEmployeeId);
      if (!target) {
        return {
          allowed: false,
          status: 404,
          errorMessage: 'Employee record not found.',
        };
      }
      const res = await apiClient.inspectEmployeeHealthForHr({
        requesterRole: 'HR_ADMIN',
        targetEmployee: target,
      });
      return {
        allowed: res.ok,
        status: res.status,
        employee: res.data,
        errorMessage: res.error,
      };
    },
    [directoryEmployees],
  );

  const sendChatMessage = useCallback(
    (roomId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const initials =
        (employee.name || 'U')
          .split(' ')
          .map((p) => p[0])
          .join('')
          .slice(0, 2)
          .toUpperCase() || 'US';

      const newMsg: ChatMessage = {
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
    },
    [employee.id, employee.name, employee.officeBranch, persistWorkspace],
  );

  const createForumPost = useCallback(
    (input: {
      kind: ForumPostKind;
      category: TipCategoryTag;
      title: string;
      body: string;
      isAnonymous: boolean;
    }) => {
      const newPost: ForumPost = {
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
    },
    [employee.id, employee.name, employee.officeBranch, persistWorkspace],
  );

  const upvoteForumPost = useCallback(
    (postId: string) => {
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
    (postId: string, content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;
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
    },
    [employee.id, employee.name, employee.officeBranch, persistWorkspace],
  );

  const upvoteForumReply = useCallback(
    (postId: string, replyId: string) => {
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
    (postId: string, replyId: string) => {
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
    await logout();
  }, [logout]);

  const pedometerStatus: PedometerSensorStatus =
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
        rhythmRange,
        setRhythmRange,
        currentQuote,
        selectedQuoteCategory,
        favoriteQuoteIds,
        goals,
        hydration,
        activityLogs,
        joinedChallengeIds,
        mindfulMinutes,
        notifications,
        pedometerStatus,
        liveSensorSteps: liveDiagnostics.liveSessionStepDelta,
        directoryEmployees,
        proposedActivities,
        selectedWinningActivity,
        walkingCompetition,
        privacyAuditLogs,
        chatRooms,
        chatMessages,
        forumPosts,
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

export function useWellness(): WellnessContextValue {
  const ctx = useContext<WellnessContextValue | undefined>(WellnessContext);
  if (!ctx) {
    throw new Error('useWellness must be used within a WellnessProvider');
  }
  return ctx;
}
