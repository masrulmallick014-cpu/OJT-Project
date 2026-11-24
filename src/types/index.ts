export type HeartRateZone = 'rest' | 'fat_burn' | 'cardio' | 'peak' | 'no_reading';

export type AppTabKey = 'home' | 'leaderboard' | 'activities' | 'profile' | 'community';

export type RhythmRange = 'today' | 'week' | 'month';

export type UserRole = 'EMPLOYEE' | 'HR_ADMIN';

export type GenderIdentity = 'male' | 'female' | 'other';
export type BiologicalGender = GenderIdentity;

export type VerificationStatus =
  | 'PENDING_ID_UPLOAD'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'REJECTED';

export type PermissionGrantStatus = 'GRANTED' | 'DENIED' | 'NOT_INITIALIZED';

export type MovementState = 'IDLE' | 'WALKING' | 'BRISK_WALK' | 'RUNNING';

export type OnboardingStep =
  | 'AUTH'
  | 'BIOMETRICS'
  | 'COMPANY_ID_VERIFICATION'
  | 'HEALTH_PERMISSIONS'
  | 'COMPLETED';

export type HealthSyncSource =
  | 'uninitialized'
  | 'pedometer_live'
  | 'health_connect'
  | 'apple_healthkit';

export type OfficeBranch =
  | 'Acme Studio · Design & Creative'
  | 'Bengaluru HQ'
  | 'Hyderabad Tech Park'
  | 'Mumbai Studio'
  | string;

export type CorporateDepartment =
  | 'Design & Creative'
  | 'Engineering'
  | 'Executive Leadership'
  | 'Product & Design'
  | 'Global Operations'
  | 'Enterprise Sales'
  | 'People & HR';

/**
 * 1. Real User Authentication Session
 */
export interface UserAuth {
  uid: string;
  email: string;
  isAuthenticated: boolean;
  sessionToken: string;
  lastLoginAt: string;
}

/**
 * 2. Real Biometric & Personal Profile (Mifflin-St Jeor BMR, BMI, Stride Length)
 */
export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  heightCm: number;
  weightKg: number;
  gender: GenderIdentity;
  age: number;
  dateOfBirth: string;
  department: CorporateDepartment;
  jobTitle: string;
  bmi: number;
  bmrKcal: number;
  strideLengthCm?: number;
  strideLengthMeters: number;
  companyId: string | null;
  companyName: string;
  corporateDomain?: string;
  verificationStatus: VerificationStatus;
  idCardUri: string | null;
  idCardFileName: string | null;
  idCardDimensions: { width: number; height: number } | null;
  idCardFileSize: number | null;
  idCardSubmittedAt: string | null;
  idCardVerifiedAt: string | null;
  idCardVerificationNote: string | null;
  ocrExtractedText?: string | null;
  onboardingCompleted: boolean;
  healthPermissionsCompleted: boolean;
}

/**
 * 3. Real Corporate Entity, ID Card Submission & Verified Employee Roster Entry
 */
export interface Company {
  id: string;
  name: string;
  domain: string;
  corporateDomain: string;
  industry: string;
  createdAt: string;
  createdByUid?: string;
  verifiedMemberCount?: number;
}

export interface IdCardSubmission {
  uid: string;
  companyId: string;
  uri: string;
  width: number;
  height: number;
  fileSize: number;
  mimeType: string;
  submittedAt: string;
  status: VerificationStatus;
  reviewedAt: string | null;
  rejectionReason: string | null;
}

export interface CompanyRosterMember {
  uid: string;
  fullName: string;
  email: string;
  department: CorporateDepartment;
  jobTitle: string;
  companyId: string;
  companyName: string;
  verificationStatus: VerificationStatus;
  verifiedAt: string | null;
  idCardSubmittedAt: string | null;
  idCardVerifiedAt: string | null;
  todaySteps: number;
  dailySteps: number;
  weeklySteps: number;
  activeCalories: number;
  activeCaloriesKcal: number;
  distanceKm: number;
  lastSyncedAt: string | null;
}

/**
 * 4. Real-Time Health Permissions & Dual-Stream Telemetry Diagnostics
 */
export interface HealthPermissionsMap {
  activityRecognition: PermissionGrantStatus;
  pedometer: PermissionGrantStatus;
  accelerometer: PermissionGrantStatus;
  steps: PermissionGrantStatus;
  heartRate: PermissionGrantStatus;
  sleep: PermissionGrantStatus;
  activeCalories: PermissionGrantStatus;
  oxygenSaturation: PermissionGrantStatus;
  lastCheckedAt: string | null;
}

export type AntiCheatStatus =
  | 'VALID_GAIT'
  | 'IDLE'
  | 'BLOCKED_SHAKE_GFORCE'
  | 'BLOCKED_CADENCE';

export type CloudSyncStatus =
  | 'SYNCED_TO_CLOUD_DB'
  | 'SYNCING'
  | 'LOCAL_PERSISTED'
  | 'OFFLINE_QUEUED';

export interface OcrVerificationResult {
  status: VerificationStatus;
  verifiedAt: string | null;
  rejectionReason: string | null;
  extractedText: string;
  matchedFullName: boolean;
  matchedCompanyName: boolean;
  confidenceScore: number;
}

export interface LiveTelemetryDiagnostics {
  sensorStatus:
    | 'LIVE_PEDOMETER_STREAMING'
    | 'LIVE_STREAMING'
    | 'PERMISSION_REQUIRED'
    | 'HARDWARE_UNAVAILABLE';
  nativeHealthStoreStatus: 'CONNECTED' | 'PERMISSION_REQUIRED' | 'UNAVAILABLE_ON_PLATFORM';
  pedometerHardwareAvailable: boolean;
  accelerometerAvailable: boolean;
  movementState: MovementState;
  cadenceStepsPerMin: number;
  accelerationMagnitudeG: number;
  peakGForce: number;
  antiCheatStatus: AntiCheatStatus;
  rejectedShakeSteps: number;
  currentDynamicMet: number;
  todayBaselineSteps: number;
  liveSessionStepDelta: number;
  healthStoreSteps: number;
  mergedTotalSteps: number;
  lastSensorEventTimestamp: number | null;
  lastSensorEventTimestampMs: number | null;
  lastStepTimestampIsoMs: string | null;
  lastHealthStoreSyncTimestamp: number | null;
  lastNativeSyncTimestampMs: number | null;
  dailyStorageKey: string;
  cloudSyncStatus: CloudSyncStatus;
  lastCloudSyncIso: string | null;
  syncSourceLabel: string;
  permissions: HealthPermissionsMap;
}

export interface HealthDiagnostics {
  platform: string;
  nativeModuleDetected: boolean;
  pedometerAvailable: boolean;
  permissionsGranted: boolean;
  activeSource: string;
  troubleshootingSteps: string[];
}

export interface GranularHealthConsent {
  shareSteps: boolean;
  shareHeartRateAndStress: boolean;
  shareSleepAndRecovery: boolean;
}

export interface PrivacyAuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: 'GRANTED_HR_CONSENT' | 'REVOKED_HR_CONSENT' | 'UPDATED_GRANULAR_CONSENT';
  details: string;
  timestamp: string;
}

export interface HealthMetrics {
  steps: {
    current: number;
    count: number;
    goal: number;
    percentage: number;
    distanceKm: number;
    activeCalories: number;
    activeMinutes: number;
    hourlyBreakdown: Array<{ hour: string; steps: number; value?: number }>;
    weeklyTrend?: Array<{ day: string; steps: number; goalMet: boolean }>;
  };
  heartRate: {
    currentBpm: number; // 0 when no real reading yet
    restingBpm: number; // 0 when no real reading yet
    maxBpmToday: number; // 0 when no real reading yet
    minBpmToday?: number;
    hrvMs?: number;
    zone: HeartRateZone;
    status?: string;
    hasReading: boolean;
    intradayReadings?: Array<{ time: string; bpm: number }>;
  };
  activeCalories: {
    burnedKcal: number;
    targetKcal: number;
    percentage: number;
  };
  sleep: {
    totalMinutes: number; // 0 when no real reading yet
    goalMinutes?: number;
    hoursFormatted: string; // "No reading yet" when 0
    deepSleepMinutes: number;
    remSleepMinutes: number;
    lightSleepMinutes: number;
    awakeMinutes?: number;
    efficiencyPercentage?: number;
    qualityLabel?: string;
    recoveryScore: number; // 0 when no reading yet
    hasReading: boolean;
  };
  oxygen: {
    spo2Percentage: number; // 0 when no real reading yet
    lastMeasuredAt?: string;
    status: 'optimal' | 'acceptable' | 'attention' | 'normal' | 'low' | 'no_reading';
    hasReading: boolean;
  };
  stress: {
    score: number; // 0 when no real reading yet
    label:
      | 'Low Rest'
      | 'Low Stress'
      | 'Optimal'
      | 'Moderate'
      | 'Elevated'
      | 'High Strain'
      | 'High Load'
      | 'No reading yet';
    recoveryMinutes?: number;
    burnoutRisk?: 'low' | 'moderate' | 'high';
  };
  overallReadinessScore?: number;
  syncSource?: HealthSyncSource;
  lastSyncedAt: string | null;
}

export type CorporateWellnessTier =
  | 'Bronze Associate'
  | 'Silver Pacesetter'
  | 'Gold Champion'
  | 'Vanguard Executive';

export type ReadinessState =
  | 'Peak Performance'
  | 'Optimal Readiness'
  | 'Moderate Equilibrium'
  | 'Active Recovery'
  | 'Awaiting Wearable Sync';

export interface EmployeeProfile {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  role: string;
  userRole: UserRole;
  companyId: string | null;
  companyName: string;
  officeBranch: OfficeBranch;
  department: CorporateDepartment;
  tier: CorporateWellnessTier;
  avatarUrl: string;
  currentStreakDays: number;
  longestStreakDays: number;
  readinessScore: number;
  readinessState: ReadinessState;
  hrHealthConsent: boolean;
  granularConsent: GranularHealthConsent;
  competitionTrophies: string[];
  verificationStatus: VerificationStatus;
}

export interface DirectoryEmployeeRecord {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  role: string;
  userRole: UserRole;
  officeBranch: OfficeBranch;
  department: CorporateDepartment;
  hrHealthConsent: boolean;
  granularConsent: GranularHealthConsent;
  lastSyncedAt: string;
  metrics: {
    steps: number;
    stepsGoal: number;
    bpm: number;
    restingBpm: number;
    stressLabel: string;
    sleepHours: string;
    deepSleepMinutes: number;
    remSleepMinutes: number;
    readinessScore: number;
    spo2Percentage: number;
    activeKcal: number;
    hourlyBpmSeries: number[];
  };
}

export type WearableProvider = 'apple_health' | 'health_connect' | 'hardware_pedometer';

export type WearableSyncStatus = 'live' | 'synced' | 'syncing' | 'awaiting_permission';

export interface WearableDevice {
  id: string;
  modelName: string;
  brand: string;
  provider: WearableProvider;
  isConnected: boolean;
  batteryLevel: number;
  lastSyncTimestamp: string | null;
  syncStatus: WearableSyncStatus;
}

export type QuoteCategory =
  | 'Discipline'
  | 'Resilience'
  | 'Leadership'
  | 'Peak Energy'
  | 'Mental Toughness'
  | 'Stoic Focus';

export type QuoteFilterCategory = 'All' | QuoteCategory;

export interface MotivationalQuote {
  id: string;
  quote: string;
  author: string;
  category: QuoteCategory;
  readinessTag: string;
}

export type SyncEngineState =
  | 'idle'
  | 'requesting_permissions'
  | 'reading_records'
  | 'updating_profile'
  | 'success'
  | 'failed';

export interface UserGoals {
  dailyStepsGoal: number;
  dailyCaloriesGoal: number;
  hydrationGoalMl: number;
  sleepHoursGoal?: number;
}
export type WellnessGoals = UserGoals;

export type WorkoutActivityType =
  | 'Walking'
  | 'Running'
  | 'Cycling'
  | 'Strength Training'
  | 'Desk Mobility'
  | 'HIIT';

export interface ActivityLog {
  id: string;
  type: WorkoutActivityType;
  durationMinutes: number;
  estimatedSteps: number;
  estimatedCalories: number;
  timestamp: string;
}

export interface HydrationState {
  currentMl: number;
  goalMl: number;
  glassesCount: number;
  lastUpdatedAt: string | null;
}

export interface ChallengeItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'Steps' | 'Cardio' | 'Recovery' | 'Hydration';
  targetLabel: string;
  targetValue: number;
  unit: string;
  rewardPoints: number;
  participantsCount: number;
  daysRemaining: number;
}

export type WellnessActivityCategory =
  | 'Yoga & Breath'
  | 'Outdoor Walk'
  | 'Ergonomics'
  | 'Team Sport'
  | 'Mindfulness';

export interface ProposedWellnessActivity {
  id: string;
  title: string;
  description: string;
  suggestedTime: string;
  location: string;
  category: WellnessActivityCategory;
  officeBranch: OfficeBranch;
  proposedById: string;
  proposedByName: string;
  votesCount: number;
  voterUserIds: string[];
  joinedUserIds: string[];
  hrApproved: boolean;
  createdAt: string;
}

export interface WalkingCompetition {
  id: string;
  title: string;
  subtitle: string;
  officeScope: 'MY_OFFICE' | 'ALL_OFFICES';
  prizeBadge: string;
  startTimeIso: string;
  endTimeIso: string;
  remainingSeconds: number;
  isEnded: boolean;
  winnerEmployeeId: string | null;
  winnerEmployeeName: string | null;
  winnerSteps: number | null;
}

export type ChatChannelType = 'OFFICE_GROUP' | 'INTER_OFFICE_GROUP' | 'DIRECT_MESSAGE';

export interface ChatRoom {
  id: string;
  name: string;
  subtitle: string;
  type: ChatChannelType;
  officeBranch?: OfficeBranch;
  participantRole?: string;
  onlineCount: number;
  unreadCount: number;
  typingUser?: string | null;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderInitials: string;
  senderOffice: OfficeBranch;
  text: string;
  timestamp: string;
  readByCount: number;
}

export type ForumPostKind = 'WORK_DIFFICULTY' | 'IDEA' | 'PROFESSIONAL_TIP' | 'NEED_HELP_QA';

export type TipCategoryTag =
  | 'Productivity'
  | 'Coding & Tech'
  | 'Time Management'
  | 'Work-Life Balance'
  | 'Communication';

export interface ForumReply {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorOffice: OfficeBranch;
  content: string;
  upvotes: number;
  upvotedByIds: string[];
  isAcceptedSolution: boolean;
  createdAt: string;
}

export interface ForumPost {
  id: string;
  kind: ForumPostKind;
  category: TipCategoryTag;
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  authorOffice: OfficeBranch;
  isAnonymous: boolean;
  upvotes: number;
  upvotedByIds: string[];
  acceptedReplyId: string | null;
  replies: ForumReply[];
  createdAt: string;
}

export interface WellnessNotification {
  id: string;
  title: string;
  body: string;
  timeAgo: string;
  read: boolean;
  targetTab?: AppTabKey;
}

export type PedometerSensorStatus = 'checking' | 'active' | 'unavailable' | 'permission_denied';
