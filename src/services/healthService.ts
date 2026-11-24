import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pedometer, Accelerometer } from 'expo-sensors';
import {
  AntiCheatStatus,
  BiologicalGender,
  CloudSyncStatus,
  HealthDiagnostics,
  HealthMetrics,
  HealthPermissionsMap,
  HealthSyncSource,
  LiveTelemetryDiagnostics,
  MovementState,
  PermissionGrantStatus,
  UserGoals,
  UserProfile,
  WellnessGoals,
} from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getNativeHealthConnect } from './healthConnect';

const PERMISSIONS_CACHE_KEY = '@pulsecorp_health_permissions_v2';

export const DEFAULT_USER_GOALS: UserGoals = {
  dailyStepsGoal: 10000,
  dailyCaloriesGoal: 600,
  hydrationGoalMl: 2500,
  sleepHoursGoal: 8,
};

export interface DailyStepPersistRecord {
  dateKey: string; // YYYY-MM-DD
  storageKey: string; // @pulsecorp_steps_YYYY-MM-DD
  uid: string;
  baselineSteps: number;
  liveSessionStepDelta: number;
  rejectedShakeSteps: number;
  healthStoreSteps: number;
  mergedTotalSteps: number;
  hourlySteps: Record<string, number>;
  weeklyHistory: Record<string, number>; // YYYY-MM-DD -> steps
  lastCloudSyncIso: string | null;
  updatedAt: string;
}

export const getTodayDateKey = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
};

export const getDailyStepStorageKey = (dateKey: string = getTodayDateKey()): string =>
  `@pulsecorp_steps_${dateKey}`;

export const formatMillisecondTimestamp = (ms: number): string => {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const mmm = String(d.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${mmm}`;
};



const getNativeAppleHealthKit = (): any | null => {
  if (Platform.OS !== 'ios') return null;
  try {
    // eslint-disable-next-line no-eval
    const pkg = eval('require')('react-native-health');
    return pkg?.default || pkg;
  } catch {
    return null;
  }
};

/**
 * 5. Scientific Biometric Math:
 * - BMI = weightKg / (heightCm / 100)^2
 * - BMR (Mifflin-St Jeor) = 10*weightKg + 6.25*heightCm - 5*age + (5 male | -161 female | -78 other)
 * - Stride Length (cm) = heightCm * 0.415 (male) | heightCm * 0.413 (female) | heightCm * 0.414 (other)
 * - Distance (km) = (steps * strideLengthCm) / 100000
 * - Active Calories = Dynamic METs (from live cadence SPM) + BMR-scaled metabolic expenditure
 */
export function calculateBMI(weightKg: number, heightCm: number): number {
  if (!weightKg || !heightCm || heightCm <= 0) return 0;
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: BiologicalGender,
): number {
  if (!weightKg || !heightCm || !age) return 0;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === 'male') return Math.round(base + 5);
  if (gender === 'female') return Math.round(base - 161);
  return Math.round(base - 78);
}

export function calculateStrideLengthCm(
  heightCm: number,
  gender: BiologicalGender,
): number {
  if (!heightCm || heightCm <= 0) return 72.0;
  const factor = gender === 'male' ? 0.415 : gender === 'female' ? 0.413 : 0.414;
  return Number((heightCm * factor).toFixed(2));
}

export function calculateStrideLengthMeters(
  heightCm: number,
  gender: BiologicalGender,
): number {
  const cm = calculateStrideLengthCm(heightCm, gender);
  return Number((cm / 100).toFixed(3));
}

export function calculateDistanceKm(steps: number, strideLengthMeters: number): number {
  if (!steps || steps <= 0 || !strideLengthMeters || strideLengthMeters <= 0) return 0;
  const strideLengthCm = strideLengthMeters * 100;
  return Math.round(((steps * strideLengthCm) / 100000) * 100) / 100;
}

export function calculateDistanceKmFromCm(steps: number, strideLengthCm: number): number {
  if (!steps || steps <= 0 || !strideLengthCm || strideLengthCm <= 0) return 0;
  return Math.round(((steps * strideLengthCm) / 100000) * 100) / 100;
}

export function calculateDynamicMetFromCadence(cadenceStepsPerMin: number): number {
  if (cadenceStepsPerMin < 60) return 1.0;
  if (cadenceStepsPerMin < 100) return 3.0; // Light walking
  if (cadenceStepsPerMin < 120) return 3.8; // Moderate walking
  if (cadenceStepsPerMin < 140) return 5.0; // Brisk walking
  if (cadenceStepsPerMin < 170) return 8.3; // Running / jogging
  return 11.0; // High-cadence running (170-210 SPM)
}

export function calculateActiveCaloriesFromSteps(
  steps: number,
  strideLengthMeters: number,
  weightKg: number,
  cadenceStepsPerMin: number,
  heightCm: number = 172,
  age: number = 28,
  gender: BiologicalGender = 'male',
): number {
  if (!steps || steps <= 0 || !weightKg || weightKg <= 0) return 0;
  const strideLengthCm =
    strideLengthMeters > 3
      ? strideLengthMeters
      : (strideLengthMeters || calculateStrideLengthMeters(heightCm, gender)) * 100;
  const distanceKm = (steps * strideLengthCm) / 100000;

  const effectiveCadence =
    cadenceStepsPerMin >= 60 && cadenceStepsPerMin <= 210 ? cadenceStepsPerMin : 105;
  const dynamicMet = calculateDynamicMetFromCadence(effectiveCadence);
  const netMet = Math.max(1.8, dynamicMet - 1.0);

  // Duration in hours estimated from steps and effective cadence
  const durationHours = steps / Math.max(60, effectiveCadence) / 60;
  const bmr = calculateBMR(weightKg, heightCm || 172, age || 28, gender);
  const bmrPerHour = bmr > 0 ? bmr / 24 : weightKg * 1.0;

  // Net MET-hours * hourly BMR + distance transport factor
  const metCalories = netMet * bmrPerHour * durationHours;
  const distanceCalories = distanceKm * weightKg * 0.55;
  return Math.max(0, Math.round((metCalories + distanceCalories) * 0.5));
}

export const DEFAULT_PERMISSIONS_MAP: HealthPermissionsMap = {
  activityRecognition: 'NOT_INITIALIZED',
  pedometer: 'NOT_INITIALIZED',
  accelerometer: 'NOT_INITIALIZED',
  steps: 'NOT_INITIALIZED',
  heartRate: 'NOT_INITIALIZED',
  sleep: 'NOT_INITIALIZED',
  activeCalories: 'NOT_INITIALIZED',
  oxygenSaturation: 'NOT_INITIALIZED',
  lastCheckedAt: null,
};

export const DEFAULT_LIVE_DIAGNOSTICS: LiveTelemetryDiagnostics = {
  sensorStatus: 'PERMISSION_REQUIRED',
  nativeHealthStoreStatus: 'PERMISSION_REQUIRED',
  pedometerHardwareAvailable: false,
  accelerometerAvailable: false,
  movementState: 'IDLE',
  liveSessionStepDelta: 0,
  todayBaselineSteps: 0,
  healthStoreSteps: 0,
  mergedTotalSteps: 0,
  cadenceStepsPerMin: 0,
  accelerationMagnitudeG: 1.0,
  peakGForce: 1.0,
  antiCheatStatus: 'IDLE',
  rejectedShakeSteps: 0,
  currentDynamicMet: 1.0,
  lastSensorEventTimestamp: null,
  lastSensorEventTimestampMs: null,
  lastStepTimestampIsoMs: null,
  lastHealthStoreSyncTimestamp: null,
  lastNativeSyncTimestampMs: null,
  dailyStorageKey: getDailyStepStorageKey(),
  cloudSyncStatus: 'LOCAL_PERSISTED',
  lastCloudSyncIso: null,
  syncSourceLabel: 'Awaiting Sensor Permission',
  permissions: DEFAULT_PERMISSIONS_MAP,
};

export function createZeroBaselineMetrics(
  goals: WellnessGoals = DEFAULT_USER_GOALS,
  source: HealthSyncSource = 'uninitialized',
): HealthMetrics {
  const sleepGoalHours = goals.sleepHoursGoal || 8;
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyTrend = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      day: i === 6 ? 'Today' : dayLabels[d.getDay()],
      steps: 0,
      goalMet: false,
    };
  });

  const hourlyLabels = ['6 am', '9 am', '12 pm', '3 pm', '6 pm'];

  return {
    lastSyncedAt: null,
    syncSource: source,
    overallReadinessScore: 0,
    steps: {
      current: 0,
      count: 0,
      goal: goals.dailyStepsGoal,
      percentage: 0,
      distanceKm: 0,
      activeCalories: 0,
      activeMinutes: 0,
      hourlyBreakdown: hourlyLabels.map((hour) => ({ hour, steps: 0, value: 0 })),
      weeklyTrend,
    },
    activeCalories: {
      burnedKcal: 0,
      targetKcal: goals.dailyCaloriesGoal,
      percentage: 0,
    },
    heartRate: {
      currentBpm: 0,
      restingBpm: 0,
      maxBpmToday: 0,
      minBpmToday: 0,
      hrvMs: 0,
      zone: 'no_reading',
      hasReading: false,
      status: 'no_reading',
      intradayReadings: [],
    },
    sleep: {
      totalMinutes: 0,
      goalMinutes: sleepGoalHours * 60,
      hoursFormatted: 'No reading yet',
      deepSleepMinutes: 0,
      remSleepMinutes: 0,
      lightSleepMinutes: 0,
      awakeMinutes: 0,
      efficiencyPercentage: 0,
      recoveryScore: 0,
      qualityLabel: 'No reading yet',
      hasReading: false,
    },
    oxygen: {
      spo2Percentage: 0,
      lastMeasuredAt: 'No reading yet',
      status: 'no_reading',
      hasReading: false,
    },
    stress: {
      score: 0,
      label: 'No reading yet',
      recoveryMinutes: 0,
      burnoutRisk: 'low',
    },
  };
}

class RealTimeHealthService {
  private pedometerSubscription: { remove: () => void } | null = null;
  private accelerometerSubscription: { remove: () => void } | null = null;
  private midnightRolloverTimer: ReturnType<typeof setTimeout> | null = null;
  private permissionsMap: HealthPermissionsMap = { ...DEFAULT_PERMISSIONS_MAP };
  private diagnostics: LiveTelemetryDiagnostics = { ...DEFAULT_LIVE_DIAGNOSTICS };

  // Anti-cheat & 150ms Sensor-Fusion state
  private validStepTimestampsMs: number[] = [];
  private recentGForceSamples: Array<{ t: number; g: number }> = [];
  private lastAccelPeakMs: number = 0;
  private lastRawPedometerCount: number = 0;
  private accelFusedStepDelta: number = 0;
  private currentRecord: DailyStepPersistRecord | null = null;

  async loadCachedPermissions(): Promise<HealthPermissionsMap> {
    try {
      const raw = await AsyncStorage.getItem(PERMISSIONS_CACHE_KEY);
      if (raw) {
        this.permissionsMap = { ...DEFAULT_PERMISSIONS_MAP, ...JSON.parse(raw) };
        this.diagnostics.permissions = this.permissionsMap;
      }
    } catch {
      // ignore storage read error
    }
    return this.permissionsMap;
  }

  private async savePermissions(map: HealthPermissionsMap): Promise<void> {
    this.permissionsMap = map;
    this.diagnostics.permissions = map;
    try {
      await AsyncStorage.setItem(PERMISSIONS_CACHE_KEY, JSON.stringify(map));
    } catch {
      // ignore storage write error
    }
  }

  getLiveDiagnostics(): LiveTelemetryDiagnostics {
    return { ...this.diagnostics, permissions: { ...this.permissionsMap } };
  }

  async getDiagnostics(): Promise<HealthDiagnostics> {
    const hc = getNativeHealthConnect();
    const hk = getNativeAppleHealthKit();
    let pedAvail = false;
    try {
      pedAvail = await Pedometer.isAvailableAsync();
    } catch {
      pedAvail = false;
    }
    return {
      platform: Platform.OS,
      nativeModuleDetected: Boolean(hc || hk),
      pedometerAvailable: pedAvail,
      permissionsGranted:
        this.permissionsMap.pedometer === 'GRANTED' ||
        this.permissionsMap.steps === 'GRANTED',
      activeSource: this.diagnostics.syncSourceLabel,
      troubleshootingSteps: [
        'Grant Physical Activity (ACTIVITY_RECOGNITION) & Hardware Pedometer permissions.',
        'Connect Google Health Connect (Android) or Apple HealthKit (iOS) for Heart Rate, Sleep & SpO2.',
        'Sub-200ms Sensor-Fusion & Anti-Cheat Shake Filter active (1.1g-3.0g, 60-210 SPM).',
      ],
    };
  }

  getPermissionsMap(): HealthPermissionsMap {
    return { ...this.permissionsMap };
  }

  /**
   * Request real OS runtime permissions for Hardware Pedometer + Health Connect / HealthKit
   */
  async requestAllPermissions(): Promise<HealthPermissionsMap> {
    const nextMap: HealthPermissionsMap = {
      ...this.permissionsMap,
      lastCheckedAt: new Date().toISOString(),
    };

    if (Platform.OS === 'android') {
      try {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
          {
            title: 'Physical Activity Recognition',
            message:
              'PulseCorp needs access to your physical activity sensor to stream real-time step counts and cadence.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          },
        );
        nextMap.activityRecognition =
          result === PermissionsAndroid.RESULTS.GRANTED ? 'GRANTED' : 'DENIED';
      } catch {
        nextMap.activityRecognition = 'DENIED';
      }
    } else {
      nextMap.activityRecognition = 'GRANTED';
    }

    try {
      const isAvail = await Pedometer.isAvailableAsync();
      this.diagnostics.pedometerHardwareAvailable = isAvail;
      if (typeof Pedometer.requestPermissionsAsync === 'function') {
        const perm = await Pedometer.requestPermissionsAsync();
        nextMap.pedometer = perm.granted ? 'GRANTED' : 'DENIED';
      } else {
        nextMap.pedometer = isAvail ? 'GRANTED' : 'DENIED';
      }
    } catch {
      nextMap.pedometer = 'DENIED';
    }

    try {
      const accelAvail = await Accelerometer.isAvailableAsync();
      this.diagnostics.accelerometerAvailable = accelAvail;
      nextMap.accelerometer = accelAvail ? 'GRANTED' : 'DENIED';
    } catch {
      nextMap.accelerometer = 'DENIED';
    }

    const hc = getNativeHealthConnect();
    if (hc) {
      try {
        const initialized = await hc.initialize();
        if (initialized) {
          const grantedList: Array<{ recordType: string }> = await hc.requestPermission([
            { accessType: 'read', recordType: 'Steps' },
            { accessType: 'read', recordType: 'Distance' },
            { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
            { accessType: 'read', recordType: 'HeartRate' },
            { accessType: 'read', recordType: 'RestingHeartRate' },
            { accessType: 'read', recordType: 'SleepSession' },
            { accessType: 'read', recordType: 'OxygenSaturation' },
          ]);
          const hasType = (t: string): PermissionGrantStatus =>
            Array.isArray(grantedList) && grantedList.some((g) => g.recordType === t)
              ? 'GRANTED'
              : 'DENIED';

          nextMap.steps = hasType('Steps');
          nextMap.heartRate = hasType('HeartRate');
          nextMap.sleep = hasType('SleepSession');
          nextMap.activeCalories = hasType('ActiveCaloriesBurned');
          nextMap.oxygenSaturation = hasType('OxygenSaturation');
          this.diagnostics.nativeHealthStoreStatus = 'CONNECTED';
        }
      } catch {
        nextMap.steps = nextMap.pedometer === 'GRANTED' ? 'GRANTED' : 'DENIED';
        nextMap.heartRate = 'DENIED';
        nextMap.sleep = 'DENIED';
        nextMap.activeCalories = nextMap.pedometer === 'GRANTED' ? 'GRANTED' : 'DENIED';
        nextMap.oxygenSaturation = 'DENIED';
        this.diagnostics.nativeHealthStoreStatus = 'PERMISSION_REQUIRED';
      }
    } else if (Platform.OS === 'ios') {
      const hk = getNativeAppleHealthKit();
      if (hk && hk.Constants?.Permissions) {
        const P = hk.Constants.Permissions;
        const permissions = {
          permissions: {
            read: [
              P.StepCount,
              P.DistanceWalkingRunning,
              P.ActiveEnergyBurned,
              P.HeartRate,
              P.RestingHeartRate,
              P.SleepAnalysis,
              P.OxygenSaturation,
            ],
            write: [],
          },
        };
        const granted = await new Promise<boolean>((resolve) => {
          hk.initHealthKit(permissions, (err: any) => resolve(!err));
        });
        const status: PermissionGrantStatus = granted ? 'GRANTED' : 'DENIED';
        nextMap.steps = status;
        nextMap.heartRate = status;
        nextMap.sleep = status;
        nextMap.activeCalories = status;
        nextMap.oxygenSaturation = status;
        this.diagnostics.nativeHealthStoreStatus = granted
          ? 'CONNECTED'
          : 'PERMISSION_REQUIRED';
      } else {
        const fallback: PermissionGrantStatus =
          nextMap.pedometer === 'GRANTED' ? 'GRANTED' : 'DENIED';
        nextMap.steps = fallback;
        nextMap.activeCalories = fallback;
        nextMap.heartRate = 'DENIED';
        nextMap.sleep = 'DENIED';
        nextMap.oxygenSaturation = 'DENIED';
        this.diagnostics.nativeHealthStoreStatus = 'UNAVAILABLE_ON_PLATFORM';
      }
    } else {
      const pedGranted = nextMap.pedometer === 'GRANTED';
      nextMap.steps = pedGranted ? 'GRANTED' : 'DENIED';
      nextMap.activeCalories = pedGranted ? 'GRANTED' : 'DENIED';
      nextMap.heartRate = 'DENIED';
      nextMap.sleep = 'DENIED';
      nextMap.oxygenSaturation = 'DENIED';
      this.diagnostics.nativeHealthStoreStatus = 'UNAVAILABLE_ON_PLATFORM';
    }

    await this.savePermissions(nextMap);
    return nextMap;
  }

  /**
   * 1. Android Pedometer Persistence Fix:
   * Date-keyed daily step accumulator in AsyncStorage (`@pulsecorp_steps_YYYY-MM-DD`) + Cloud DB
   * with automatic midnight (00:00) rollover.
   */
  private async loadOrInitDailyRecord(uid: string): Promise<DailyStepPersistRecord> {
    const todayKey = getTodayDateKey();
    const primaryDateStorageKey = getDailyStepStorageKey(todayKey); // @pulsecorp_steps_YYYY-MM-DD
    const userScopedKey = `${primaryDateStorageKey}_${uid}`;

    this.diagnostics.dailyStorageKey = primaryDateStorageKey;

    try {
      const rawUser = await AsyncStorage.getItem(userScopedKey);
      const rawDate = await AsyncStorage.getItem(primaryDateStorageKey);
      const raw = rawUser || rawDate;
      if (raw) {
        const parsed: DailyStepPersistRecord = JSON.parse(raw);
        if (parsed.dateKey === todayKey) {
          this.currentRecord = parsed;
          return parsed;
        }
      }
    } catch {
      // ignore storage read error
    }

    // Check yesterday's key to carry over weeklyHistory on midnight rollover
    let previousWeeklyHistory: Record<string, number> = {};
    if (this.currentRecord && this.currentRecord.dateKey !== todayKey) {
      previousWeeklyHistory = {
        ...(this.currentRecord.weeklyHistory || {}),
        [this.currentRecord.dateKey]: this.currentRecord.mergedTotalSteps || 0,
      };
    }

    const initial: DailyStepPersistRecord = {
      dateKey: todayKey,
      storageKey: primaryDateStorageKey,
      uid,
      baselineSteps: 0,
      liveSessionStepDelta: 0,
      rejectedShakeSteps: 0,
      healthStoreSteps: 0,
      mergedTotalSteps: 0,
      hourlySteps: {},
      weeklyHistory: previousWeeklyHistory,
      lastCloudSyncIso: null,
      updatedAt: new Date().toISOString(),
    };
    this.currentRecord = initial;
    await this.persistDailyRecord(initial);
    return initial;
  }

  private async persistDailyRecord(
    record: DailyStepPersistRecord,
    syncCloud: boolean = false,
  ): Promise<void> {
    const todayKey = getTodayDateKey();
    // Automatic midnight rollover check on every write
    if (record.dateKey !== todayKey) {
      const prevHistory = {
        ...(record.weeklyHistory || {}),
        [record.dateKey]: record.mergedTotalSteps || 0,
      };
      record = {
        dateKey: todayKey,
        storageKey: getDailyStepStorageKey(todayKey),
        uid: record.uid,
        baselineSteps: 0,
        liveSessionStepDelta: 0,
        rejectedShakeSteps: 0,
        healthStoreSteps: 0,
        mergedTotalSteps: 0,
        hourlySteps: {},
        weeklyHistory: prevHistory,
        lastCloudSyncIso: record.lastCloudSyncIso,
        updatedAt: new Date().toISOString(),
      };
      this.lastRawPedometerCount = 0;
      this.accelFusedStepDelta = 0;
      this.diagnostics.dailyStorageKey = record.storageKey;
    }

    this.currentRecord = record;
    const primaryDateStorageKey = getDailyStepStorageKey(record.dateKey);
    const userScopedKey = `${primaryDateStorageKey}_${record.uid}`;

    try {
      const serialized = JSON.stringify(record);
      await Promise.all([
        AsyncStorage.setItem(primaryDateStorageKey, serialized),
        AsyncStorage.setItem(userScopedKey, serialized),
      ]);
      this.diagnostics.cloudSyncStatus = 'LOCAL_PERSISTED';
    } catch {
      // ignore write error
    }

    if (syncCloud) {
      this.syncStepsToCloudDatabase(record);
    }
  }

  private async syncStepsToCloudDatabase(record: DailyStepPersistRecord): Promise<void> {
    const nowIso = new Date().toISOString();
    try {
      if (!isSupabaseConfigured) {
        this.diagnostics.cloudSyncStatus = 'LOCAL_PERSISTED';
        return;
      }

      this.diagnostics.cloudSyncStatus = 'SYNCING';
      await supabase.from('daily_steps_telemetry').upsert(
        {
          uid: record.uid,
          date_key: record.dateKey,
          steps: record.mergedTotalSteps,
          baseline_steps: record.baselineSteps,
          session_delta: record.liveSessionStepDelta,
          updated_at: nowIso,
        },
        { onConflict: 'uid,date_key' },
      );
      record.lastCloudSyncIso = nowIso;
      this.diagnostics.cloudSyncStatus = 'SYNCED_TO_CLOUD_DB';
      this.diagnostics.lastCloudSyncIso = nowIso;
    } catch {
      this.diagnostics.cloudSyncStatus = 'OFFLINE_QUEUED';
    }
  }

  private scheduleMidnightRollover(uid: string, onRollover: () => void): void {
    if (this.midnightRolloverTimer) {
      clearTimeout(this.midnightRolloverTimer);
    }
    const now = new Date();
    const midnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0,
      200,
    );
    const msUntilMidnight = Math.max(1000, midnight.getTime() - now.getTime());

    this.midnightRolloverTimer = setTimeout(async () => {
      await this.loadOrInitDailyRecord(uid);
      this.lastRawPedometerCount = 0;
      this.accelFusedStepDelta = 0;
      onRollover();
      this.scheduleMidnightRollover(uid, onRollover);
    }, msUntilMidnight);
  }

  /**
   * 3. Anti-Cheat Shake Filter:
   * Validates 3-axis Accelerometer magnitude (sqrt(x^2 + y^2 + z^2)) and live cadence (SPM).
   * - Valid walking/running G-force peak window: 1.1g <= peakG <= 3.0g
   * - Valid human walking/running cadence window: 60 <= SPM <= 210
   */
  private evaluateAntiCheatStepGate(
    nowMs: number,
    proposedStepIncrement: number,
  ): {
    allowed: boolean;
    status: AntiCheatStatus;
    cadenceSpm: number;
    peakG: number;
  } {
    // Inspect recent 1.5s G-force window
    this.recentGForceSamples = this.recentGForceSamples.filter(
      (s) => s.t >= nowMs - 1500,
    );
    const peakG =
      this.recentGForceSamples.length > 0
        ? Math.max(...this.recentGForceSamples.map((s) => s.g))
        : this.diagnostics.accelerationMagnitudeG;
    const roundedPeakG = Math.round(peakG * 100) / 100;

    // 1. G-Force check: If accelerometer is active, block violent shaking (>3.0g) or static micro-vibration (<1.1g)
    if (this.diagnostics.accelerometerAvailable && this.recentGForceSamples.length > 0) {
      if (roundedPeakG > 3.0 || roundedPeakG < 1.1) {
        return {
          allowed: false,
          status: 'BLOCKED_SHAKE_GFORCE',
          cadenceSpm: this.diagnostics.cadenceStepsPerMin,
          peakG: roundedPeakG,
        };
      }
    }

    // 2. Cadence check (60 - 210 SPM)
    const windowCutoff = nowMs - 10000; // 10-second sliding cadence window
    const previewTimestamps = [
      ...this.validStepTimestampsMs.filter((t) => t >= windowCutoff),
    ];
    for (let i = 0; i < proposedStepIncrement; i++) {
      previewTimestamps.push(nowMs);
    }

    let cadenceSpm = Math.round(previewTimestamps.length * 6);
    if (previewTimestamps.length >= 2) {
      const firstT = previewTimestamps[0];
      const spanSec = Math.max(1, (nowMs - firstT) / 1000);
      const instantaneousSpm = Math.round(((previewTimestamps.length - 1) / spanSec) * 60);
      cadenceSpm = Math.max(cadenceSpm, Math.min(220, instantaneousSpm));
    } else if (previewTimestamps.length === 1) {
      // First step initiation of a walk stride: default to natural walking onset (92 SPM)
      cadenceSpm = 92;
    }

    if (cadenceSpm < 60 || cadenceSpm > 210) {
      return {
        allowed: false,
        status: 'BLOCKED_CADENCE',
        cadenceSpm,
        peakG: roundedPeakG,
      };
    }

    return {
      allowed: true,
      status: 'VALID_GAIT',
      cadenceSpm,
      peakG: roundedPeakG,
    };
  }

  /**
   * 2. Sub-200ms Sensor-Fusion Engine:
   * Combines `Pedometer.watchStepCount` and `Accelerometer` (150ms interval)
   * for instant (<200ms) UI updates when walking, with Anti-Cheat Shake Filtering
   * and date-keyed AsyncStorage (`@pulsecorp_steps_YYYY-MM-DD`) + Cloud DB persistence.
   */
  async startRealtimeHardwareStream(
    userProfile: UserProfile,
    goals: WellnessGoals,
    onRealtimeUpdate: (
      stepMetrics: HealthMetrics['steps'],
      activeCalorieMetrics: HealthMetrics['activeCalories'],
      diagnostics: LiveTelemetryDiagnostics,
    ) => void,
  ): Promise<void> {
    this.stopRealtimeHardwareStream();

    const record = await this.loadOrInitDailyRecord(userProfile.uid);
    // Commit any prior session delta into today's saved baseline before starting a new watch listener
    if (record.liveSessionStepDelta > 0) {
      record.baselineSteps = record.mergedTotalSteps;
      record.liveSessionStepDelta = 0;
      await this.persistDailyRecord(record, true);
    }
    this.lastRawPedometerCount = 0;
    this.accelFusedStepDelta = 0;

    let pedometerAvailable = false;
    try {
      pedometerAvailable = await Pedometer.isAvailableAsync();
    } catch {
      pedometerAvailable = false;
    }

    let accelAvailable = false;
    try {
      accelAvailable = await Accelerometer.isAvailableAsync();
    } catch {
      accelAvailable = false;
    }

    // On iOS only, Pedometer.getStepCountAsync is supported by CoreMotion
    if (pedometerAvailable && Platform.OS === 'ios') {
      try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const now = new Date();
        const res = await Pedometer.getStepCountAsync(startOfDay, now);
        if (res && typeof res.steps === 'number' && res.steps > record.baselineSteps) {
          record.baselineSteps = res.steps;
          record.mergedTotalSteps = Math.max(record.baselineSteps, record.healthStoreSteps);
          await this.persistDailyRecord(record, true);
        }
      } catch {
        // CoreMotion historical query failed or denied
      }
    }

    this.diagnostics = {
      ...this.diagnostics,
      pedometerHardwareAvailable: pedometerAvailable,
      accelerometerAvailable: accelAvailable,
      sensorStatus:
        pedometerAvailable || accelAvailable
          ? 'LIVE_PEDOMETER_STREAMING'
          : 'PERMISSION_REQUIRED',
      todayBaselineSteps: record.baselineSteps,
      liveSessionStepDelta: record.liveSessionStepDelta,
      rejectedShakeSteps: record.rejectedShakeSteps || 0,
      healthStoreSteps: record.healthStoreSteps,
      mergedTotalSteps: record.mergedTotalSteps,
      dailyStorageKey: record.storageKey,
      lastCloudSyncIso: record.lastCloudSyncIso,
      syncSourceLabel:
        Platform.OS === 'android'
          ? 'Sub-200ms Sensor-Fusion (Pedometer + 150ms Accel + Health Connect)'
          : Platform.OS === 'ios'
            ? 'Sub-200ms Sensor-Fusion (CoreMotion + 150ms Accel + HealthKit)'
            : 'Sub-200ms Sensor-Fusion Stream',
    };

    const emitCurrentStepState = () => {
      const activeRecord = this.currentRecord || record;
      const totalSteps = activeRecord.mergedTotalSteps;
      const strideCm =
        userProfile.strideLengthCm ||
        calculateStrideLengthCm(userProfile.heightCm, userProfile.gender);
      const strideMeters = strideCm / 100;
      const distanceKm = calculateDistanceKmFromCm(totalSteps, strideCm);
      const activeCalories = calculateActiveCaloriesFromSteps(
        totalSteps,
        strideMeters,
        userProfile.weightKg,
        this.diagnostics.cadenceStepsPerMin,
        userProfile.heightCm,
        userProfile.age,
        userProfile.gender,
      );
      const activeMinutes = Math.round(totalSteps / 100);

      const hourlyLabels = ['6 am', '9 am', '12 pm', '3 pm', '6 pm'];
      const hourlyBreakdown = hourlyLabels.map((hour) => {
        const val = activeRecord.hourlySteps[hour] || 0;
        return { hour, steps: val, value: val };
      });

      const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weeklyTrend = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
          d.getDate(),
        ).padStart(2, '0')}`;
        const stepsForDay =
          i === 6 ? totalSteps : activeRecord.weeklyHistory[dKey] || 0;
        return {
          day: i === 6 ? 'Today' : dayLabels[d.getDay()],
          steps: stepsForDay,
          goalMet: stepsForDay >= goals.dailyStepsGoal,
        };
      });

      const stepPct = Math.min(
        100,
        Math.round((totalSteps / Math.max(1, goals.dailyStepsGoal)) * 100),
      );
      const calPct = Math.min(
        100,
        Math.round((activeCalories / Math.max(1, goals.dailyCaloriesGoal)) * 100),
      );

      onRealtimeUpdate(
        {
          current: totalSteps,
          count: totalSteps,
          goal: goals.dailyStepsGoal,
          percentage: stepPct,
          distanceKm,
          activeCalories,
          activeMinutes,
          hourlyBreakdown,
          weeklyTrend,
        },
        {
          burnedKcal: activeCalories,
          targetKcal: goals.dailyCaloriesGoal,
          percentage: calPct,
        },
        this.getLiveDiagnostics(),
      );
    };

    // Schedule midnight (00:00) automatic rollover
    this.scheduleMidnightRollover(userProfile.uid, emitCurrentStepState);

    // Emit initial persisted state immediately
    emitCurrentStepState();

    // Helper to commit validated step increments to @pulsecorp_steps_YYYY-MM-DD + Cloud DB
    const applyValidatedStepIncrement = (
      increment: number,
      nowMs: number,
      cadenceSpm: number,
      peakG: number,
    ) => {
      if (increment <= 0) return;
      const activeRecord = this.currentRecord || record;

      for (let i = 0; i < increment; i++) {
        this.validStepTimestampsMs.push(nowMs);
      }
      this.validStepTimestampsMs = this.validStepTimestampsMs.filter(
        (t) => t >= nowMs - 10000,
      );

      activeRecord.liveSessionStepDelta += increment;
      const hardwareSensorSteps =
        activeRecord.baselineSteps + activeRecord.liveSessionStepDelta;
      activeRecord.mergedTotalSteps = Math.max(
        hardwareSensorSteps,
        activeRecord.healthStoreSteps,
      );
      activeRecord.updatedAt = new Date(nowMs).toISOString();

      const currentHour = new Date(nowMs).getHours();
      const bucketLabel =
        currentHour < 8
          ? '6 am'
          : currentHour < 11
            ? '9 am'
            : currentHour < 14
              ? '12 pm'
              : currentHour < 17
                ? '3 pm'
                : '6 pm';
      activeRecord.hourlySteps[bucketLabel] =
        (activeRecord.hourlySteps[bucketLabel] || 0) + increment;

      let movementState: MovementState = 'WALKING';
      if (cadenceSpm >= 140 || peakG >= 1.95) {
        movementState = 'RUNNING';
      } else if (cadenceSpm >= 115) {
        movementState = 'BRISK_WALK';
      } else if (cadenceSpm >= 60) {
        movementState = 'WALKING';
      } else {
        movementState = 'IDLE';
      }

      const dynamicMet = calculateDynamicMetFromCadence(cadenceSpm);

      this.diagnostics = {
        ...this.diagnostics,
        sensorStatus: 'LIVE_PEDOMETER_STREAMING',
        movementState,
        antiCheatStatus: 'VALID_GAIT',
        peakGForce: peakG,
        cadenceStepsPerMin: cadenceSpm,
        currentDynamicMet: dynamicMet,
        liveSessionStepDelta: activeRecord.liveSessionStepDelta,
        todayBaselineSteps: activeRecord.baselineSteps,
        mergedTotalSteps: activeRecord.mergedTotalSteps,
        lastSensorEventTimestamp: nowMs,
        lastSensorEventTimestampMs: nowMs,
        lastStepTimestampIsoMs: formatMillisecondTimestamp(nowMs),
      };

      this.persistDailyRecord(activeRecord, true);
      emitCurrentStepState();
    };

    // Stream A1: Hardware Pedometer.watchStepCount
    if (pedometerAvailable) {
      try {
        this.pedometerSubscription = Pedometer.watchStepCount((result) => {
          const nowMs = Date.now();
          const rawTotal = Math.max(0, result.steps || 0);
          const rawDelta = Math.max(0, rawTotal - this.lastRawPedometerCount);
          this.lastRawPedometerCount = rawTotal;

          if (rawDelta <= 0) return;

          // Reconcile with steps already fused by the 150ms accelerometer peak detector
          const unfusedIncrement = Math.max(
            0,
            rawTotal - this.accelFusedStepDelta,
          );
          this.accelFusedStepDelta = Math.max(this.accelFusedStepDelta, rawTotal);

          if (unfusedIncrement <= 0) return;

          const gate = this.evaluateAntiCheatStepGate(nowMs, unfusedIncrement);
          if (!gate.allowed) {
            const activeRecord = this.currentRecord || record;
            activeRecord.rejectedShakeSteps =
              (activeRecord.rejectedShakeSteps || 0) + unfusedIncrement;
            this.diagnostics.antiCheatStatus = gate.status;
            this.diagnostics.rejectedShakeSteps = activeRecord.rejectedShakeSteps;
            this.diagnostics.peakGForce = gate.peakG;
            this.persistDailyRecord(activeRecord, false);
            emitCurrentStepState();
            return;
          }

          applyValidatedStepIncrement(
            unfusedIncrement,
            nowMs,
            gate.cadenceSpm,
            gate.peakG,
          );
        });
      } catch {
        this.diagnostics.sensorStatus = 'PERMISSION_REQUIRED';
      }
    }

    // Stream A2: Sub-200ms Accelerometer Sensor-Fusion (150ms interval) + Anti-Cheat Shake Filter
    if (accelAvailable) {
      try {
        Accelerometer.setUpdateInterval(150);
        this.accelerometerSubscription = Accelerometer.addListener(({ x, y, z }) => {
          const nowMs = Date.now();
          const mag = Math.sqrt(x * x + y * y + z * z);
          const roundedMag = Math.round(mag * 100) / 100;

          this.recentGForceSamples.push({ t: nowMs, g: roundedMag });
          this.recentGForceSamples = this.recentGForceSamples.filter(
            (s) => s.t >= nowMs - 1500,
          );
          const peakG = Math.max(...this.recentGForceSamples.map((s) => s.g));

          // Prune step timestamps older than 10s
          this.validStepTimestampsMs = this.validStepTimestampsMs.filter(
            (t) => t >= nowMs - 10000,
          );

          // Check for fake violent phone shaking (> 3.0g)
          if (roundedMag > 3.0) {
            const activeRecord = this.currentRecord || record;
            activeRecord.rejectedShakeSteps = (activeRecord.rejectedShakeSteps || 0) + 1;
            this.diagnostics.accelerationMagnitudeG = roundedMag;
            this.diagnostics.peakGForce = peakG;
            this.diagnostics.antiCheatStatus = 'BLOCKED_SHAKE_GFORCE';
            this.diagnostics.rejectedShakeSteps = activeRecord.rejectedShakeSteps;
            this.diagnostics.lastSensorEventTimestamp = nowMs;
            this.diagnostics.lastSensorEventTimestampMs = nowMs;
            emitCurrentStepState();
            return;
          }

          // Sub-200ms biomechanical step peak detection:
          // Real human walking/running footstrike produces 1.15g - 3.0g with 285ms - 1000ms between steps (60 - 210 SPM)
          const dtSinceLastPeak = nowMs - this.lastAccelPeakMs;
          if (roundedMag >= 1.15 && roundedMag <= 3.0 && dtSinceLastPeak >= 285) {
            this.lastAccelPeakMs = nowMs;
            if (dtSinceLastPeak <= 1000 || this.validStepTimestampsMs.length === 0) {
              const gate = this.evaluateAntiCheatStepGate(nowMs, 1);
              if (gate.allowed) {
                this.accelFusedStepDelta += 1;
                this.diagnostics.accelerationMagnitudeG = roundedMag;
                applyValidatedStepIncrement(1, nowMs, gate.cadenceSpm, gate.peakG);
                return;
              } else {
                const activeRecord = this.currentRecord || record;
                activeRecord.rejectedShakeSteps =
                  (activeRecord.rejectedShakeSteps || 0) + 1;
                this.diagnostics.antiCheatStatus = gate.status;
                this.diagnostics.rejectedShakeSteps = activeRecord.rejectedShakeSteps;
              }
            }
          }

          // Transition back to IDLE if no steps in the last 3 seconds and G-force is near 1.0g
          const timeSinceLastStep =
            this.validStepTimestampsMs.length > 0
              ? nowMs - this.validStepTimestampsMs[this.validStepTimestampsMs.length - 1]
              : 99999;

          let nextMovement: MovementState = this.diagnostics.movementState;
          let nextCadence = this.diagnostics.cadenceStepsPerMin;
          if (timeSinceLastStep > 3000 && Math.abs(roundedMag - 1.0) < 0.1) {
            nextMovement = 'IDLE';
            nextCadence = 0;
            this.diagnostics.antiCheatStatus = 'IDLE';
            this.diagnostics.currentDynamicMet = 1.0;
          }

          const gChanged =
            Math.abs(roundedMag - this.diagnostics.accelerationMagnitudeG) >= 0.04 ||
            nextMovement !== this.diagnostics.movementState;

          this.diagnostics.accelerationMagnitudeG = roundedMag;
          this.diagnostics.peakGForce = peakG;
          this.diagnostics.movementState = nextMovement;
          this.diagnostics.cadenceStepsPerMin = nextCadence;

          if (gChanged) {
            this.diagnostics.lastSensorEventTimestamp = nowMs;
            this.diagnostics.lastSensorEventTimestampMs = nowMs;
            emitCurrentStepState();
          }
        });
      } catch {
        // Accelerometer unavailable
      }
    }
  }

  stopRealtimeHardwareStream(): void {
    if (this.pedometerSubscription) {
      try {
        this.pedometerSubscription.remove();
      } catch {
        // ignore
      }
      this.pedometerSubscription = null;
    }
    if (this.accelerometerSubscription) {
      try {
        this.accelerometerSubscription.remove();
      } catch {
        // ignore
      }
      this.accelerometerSubscription = null;
    }
    if (this.midnightRolloverTimer) {
      clearTimeout(this.midnightRolloverTimer);
      this.midnightRolloverTimer = null;
    }
  }

  /**
   * Stream B: Native OS Health Store Sync (Android Health Connect / iOS Apple HealthKit)
   * Reconciles via `Math.max(hardwareSensorSteps, healthStoreSteps)`.
   */
  async syncNativeHealthStore(
    userProfile: UserProfile,
    goals: WellnessGoals,
  ): Promise<HealthMetrics> {
    const record = await this.loadOrInitDailyRecord(userProfile.uid);
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const sleepGoalHours = goals.sleepHoursGoal || 8;

    const strideCm =
      userProfile.strideLengthCm ||
      calculateStrideLengthCm(userProfile.heightCm, userProfile.gender);
    const strideMeters = strideCm / 100;

    const metrics = createZeroBaselineMetrics(goals, 'pedometer_live');

    let nativeSteps = 0;
    let nativeCalories = 0;
    let nativeDistanceKm = 0;

    // 1. Android Health Connect
    const hc = getNativeHealthConnect();
    if (hc) {
      try {
        const initialized = await hc.initialize();
        if (initialized) {
          const timeRangeFilter = {
            operator: 'between',
            startTime: startOfDay.toISOString(),
            endTime: now.toISOString(),
          };

          try {
            const stepsRecords = await hc.readRecords('Steps', { timeRangeFilter });
            if (Array.isArray(stepsRecords?.records)) {
              nativeSteps = stepsRecords.records.reduce(
                (sum: number, r: any) => sum + (Number(r.count) || 0),
                0,
              );
            }
          } catch {
            // Steps read not permitted
          }

          try {
            const calRecords = await hc.readRecords('ActiveCaloriesBurned', {
              timeRangeFilter,
            });
            if (Array.isArray(calRecords?.records)) {
              nativeCalories = Math.round(
                calRecords.records.reduce(
                  (sum: number, r: any) => sum + (Number(r.energy?.inKilocalories) || 0),
                  0,
                ),
              );
            }
          } catch {
            // ActiveCalories read not permitted
          }

          try {
            const distRecords = await hc.readRecords('Distance', { timeRangeFilter });
            if (Array.isArray(distRecords?.records)) {
              const meters = distRecords.records.reduce(
                (sum: number, r: any) => sum + (Number(r.distance?.inMeters) || 0),
                0,
              );
              nativeDistanceKm = Math.round((meters / 1000) * 100) / 100;
            }
          } catch {
            // Distance read not permitted
          }

          try {
            const hrRecords = await hc.readRecords('HeartRate', { timeRangeFilter });
            const samples: Array<{ time: string; bpm: number }> = [];
            if (Array.isArray(hrRecords?.records)) {
              hrRecords.records.forEach((rec: any) => {
                if (Array.isArray(rec.samples)) {
                  rec.samples.forEach((s: any) => {
                    const bpm = Number(s.beatsPerMinute);
                    if (bpm > 0) {
                      const d = new Date(s.time || rec.startTime);
                      samples.push({
                        time: `${String(d.getHours()).padStart(2, '0')}:${String(
                          d.getMinutes(),
                        ).padStart(2, '0')}`,
                        bpm,
                      });
                    }
                  });
                }
              });
            }

            if (samples.length > 0) {
              const bpms = samples.map((s) => s.bpm);
              const latestBpm = bpms[bpms.length - 1];
              const minBpm = Math.min(...bpms);
              const maxBpm = Math.max(...bpms);
              metrics.heartRate = {
                currentBpm: latestBpm,
                restingBpm: minBpm,
                maxBpmToday: maxBpm,
                minBpmToday: minBpm,
                hrvMs: 0,
                zone:
                  latestBpm > 135
                    ? 'peak'
                    : latestBpm > 110
                      ? 'cardio'
                      : latestBpm > 90
                        ? 'fat_burn'
                        : 'rest',
                hasReading: true,
                status:
                  latestBpm > 100 ? 'elevated' : latestBpm < 65 ? 'athletic' : 'optimal',
                intradayReadings: samples.slice(-12),
              };
            }
          } catch {
            // No HR records
          }

          try {
            const sleepStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const sleepRecords = await hc.readRecords('SleepSession', {
              timeRangeFilter: {
                operator: 'between',
                startTime: sleepStart.toISOString(),
                endTime: now.toISOString(),
              },
            });
            if (
              Array.isArray(sleepRecords?.records) &&
              sleepRecords.records.length > 0
            ) {
              const latestSleep =
                sleepRecords.records[sleepRecords.records.length - 1];
              const sTime = new Date(latestSleep.startTime).getTime();
              const eTime = new Date(latestSleep.endTime).getTime();
              const totalMinutes = Math.max(0, Math.round((eTime - sTime) / 60000));
              if (totalMinutes > 0) {
                const hrs = Math.floor(totalMinutes / 60);
                const mins = totalMinutes % 60;
                const eff = Math.min(
                  100,
                  Math.round((totalMinutes / (sleepGoalHours * 60)) * 100),
                );
                metrics.sleep = {
                  totalMinutes,
                  goalMinutes: sleepGoalHours * 60,
                  hoursFormatted: `${hrs}h ${mins}m`,
                  deepSleepMinutes: 0,
                  remSleepMinutes: 0,
                  lightSleepMinutes: totalMinutes,
                  awakeMinutes: 0,
                  efficiencyPercentage: eff,
                  recoveryScore: eff,
                  qualityLabel:
                    totalMinutes >= 420
                      ? 'Optimal'
                      : totalMinutes >= 360
                        ? 'Good'
                        : 'Needs Recovery',
                  hasReading: true,
                };
              }
            }
          } catch {
            // No Sleep records
          }

          try {
            const spo2Records = await hc.readRecords('OxygenSaturation', {
              timeRangeFilter,
            });
            if (
              Array.isArray(spo2Records?.records) &&
              spo2Records.records.length > 0
            ) {
              const latest =
                spo2Records.records[spo2Records.records.length - 1] ||
                spo2Records.records[0];
              const pct = Number(latest?.percentage?.value ?? latest?.percentage ?? 0);
              if (pct > 0) {
                metrics.oxygen = {
                  spo2Percentage: Math.round(pct * 10) / 10,
                  lastMeasuredAt: new Date(
                    latest.time || Date.now(),
                  ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  status: pct >= 95 ? 'optimal' : 'attention',
                  hasReading: true,
                };
              }
            }
          } catch {
            // No SpO2 records
          }

          metrics.syncSource = 'health_connect';
        }
      } catch {
        // Health Connect unavailable
      }
    }

    // 2. iOS Apple HealthKit
    const hk = getNativeAppleHealthKit();
    if (hk && Platform.OS === 'ios') {
      try {
        const opts = {
          date: now.toISOString(),
          startDate: startOfDay.toISOString(),
          endDate: now.toISOString(),
        };
        const stepCount = await new Promise<number>((resolve) => {
          hk.getStepCount(opts, (err: any, res: any) =>
            resolve(!err && res?.value ? Number(res.value) : 0),
          );
        });
        if (stepCount > 0) nativeSteps = Math.round(stepCount);

        const hrSamples = await new Promise<Array<{ time: string; bpm: number }>>(
          (resolve) => {
            hk.getHeartRateSamples(opts, (err: any, results: any[]) => {
              if (err || !Array.isArray(results)) return resolve([]);
              resolve(
                results
                  .filter((r) => Number(r.value) > 0)
                  .map((r) => {
                    const d = new Date(r.startDate);
                    return {
                      time: `${String(d.getHours()).padStart(2, '0')}:${String(
                        d.getMinutes(),
                      ).padStart(2, '0')}`,
                      bpm: Math.round(Number(r.value)),
                    };
                  }),
              );
            });
          },
        );
        if (hrSamples.length > 0) {
          const bpms = hrSamples.map((s) => s.bpm);
          const latestBpm = bpms[bpms.length - 1];
          metrics.heartRate = {
            currentBpm: latestBpm,
            restingBpm: Math.min(...bpms),
            maxBpmToday: Math.max(...bpms),
            minBpmToday: Math.min(...bpms),
            hrvMs: 0,
            zone:
              latestBpm > 135
                ? 'peak'
                : latestBpm > 110
                  ? 'cardio'
                  : latestBpm > 90
                    ? 'fat_burn'
                    : 'rest',
            hasReading: true,
            status:
              latestBpm > 100 ? 'elevated' : latestBpm < 65 ? 'athletic' : 'optimal',
            intradayReadings: hrSamples.slice(-12),
          };
        }
        metrics.syncSource = 'apple_healthkit';
      } catch {
        // HealthKit unavailable
      }
    }

    // 3. Reconcile via Math.max(hardwareSensorSteps, healthStoreSteps)
    record.healthStoreSteps = nativeSteps;
    const hardwareSensorSteps = record.baselineSteps + record.liveSessionStepDelta;
    const mergedSteps = Math.max(hardwareSensorSteps, nativeSteps);
    record.mergedTotalSteps = mergedSteps;
    record.updatedAt = now.toISOString();
    await this.persistDailyRecord(record, true);

    const stepDerivedDistanceKm = calculateDistanceKmFromCm(mergedSteps, strideCm);
    const mergedDistanceKm = Math.max(stepDerivedDistanceKm, nativeDistanceKm);

    const stepDerivedCalories = calculateActiveCaloriesFromSteps(
      mergedSteps,
      strideMeters,
      userProfile.weightKg,
      this.diagnostics.cadenceStepsPerMin,
      userProfile.heightCm,
      userProfile.age,
      userProfile.gender,
    );
    const mergedCalories = Math.max(stepDerivedCalories, nativeCalories);

    const hourlyLabels = ['6 am', '9 am', '12 pm', '3 pm', '6 pm'];
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const stepPct = Math.min(
      100,
      Math.round((mergedSteps / Math.max(1, goals.dailyStepsGoal)) * 100),
    );
    const calPct = Math.min(
      100,
      Math.round((mergedCalories / Math.max(1, goals.dailyCaloriesGoal)) * 100),
    );

    metrics.steps = {
      current: mergedSteps,
      count: mergedSteps,
      goal: goals.dailyStepsGoal,
      percentage: stepPct,
      distanceKm: mergedDistanceKm,
      activeCalories: mergedCalories,
      activeMinutes: Math.round(mergedSteps / 100),
      hourlyBreakdown: hourlyLabels.map((hour) => {
        const val = record.hourlySteps[hour] || 0;
        return { hour, steps: val, value: val };
      }),
      weeklyTrend: Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
          d.getDate(),
        ).padStart(2, '0')}`;
        const stepsForDay = i === 6 ? mergedSteps : record.weeklyHistory[dKey] || 0;
        return {
          day: i === 6 ? 'Today' : dayLabels[d.getDay()],
          steps: stepsForDay,
          goalMet: stepsForDay >= goals.dailyStepsGoal,
        };
      }),
    };

    metrics.activeCalories = {
      burnedKcal: mergedCalories,
      targetKcal: goals.dailyCaloriesGoal,
      percentage: calPct,
    };

    const stepRatio = Math.min(1, mergedSteps / Math.max(1, goals.dailyStepsGoal));
    const sleepRatio = metrics.sleep.hasReading
      ? Math.min(1, metrics.sleep.totalMinutes / Math.max(1, sleepGoalHours * 60))
      : 0;
    if (mergedSteps > 0 || metrics.sleep.hasReading || metrics.heartRate.hasReading) {
      metrics.overallReadinessScore = Math.round(
        stepRatio * (metrics.sleep.hasReading ? 50 : 100) +
        (metrics.sleep.hasReading ? sleepRatio * 50 : 0),
      );
    } else {
      metrics.overallReadinessScore = 0;
    }

    if (metrics.heartRate.hasReading) {
      const bpm = metrics.heartRate.currentBpm;
      const stressScore = Math.max(10, Math.min(95, Math.round((bpm - 50) * 1.4)));
      metrics.stress = {
        score: stressScore,
        label:
          stressScore < 35
            ? 'Low Rest'
            : stressScore < 65
              ? 'Optimal'
              : 'Elevated',
        recoveryMinutes: Math.round(mergedSteps / 200),
        burnoutRisk: stressScore >= 75 ? 'high' : stressScore >= 50 ? 'moderate' : 'low',
      };
    }

    metrics.lastSyncedAt = now.toISOString();
    const syncMs = Date.now();
    this.diagnostics.healthStoreSteps = nativeSteps;
    this.diagnostics.mergedTotalSteps = mergedSteps;
    this.diagnostics.lastHealthStoreSyncTimestamp = syncMs;
    this.diagnostics.lastNativeSyncTimestampMs = syncMs;

    return metrics;
  }
}

export const healthService = new RealTimeHealthService();
export type { HealthDiagnostics };
