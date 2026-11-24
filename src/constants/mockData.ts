import { EmployeeProfile, HealthMetrics, MotivationalQuote } from '../types';
import { createZeroBaselineMetrics, DEFAULT_USER_GOALS } from '../services/healthService';

export const DEFAULT_EMPLOYEE_PROFILE: EmployeeProfile = {
  id: '',
  employeeCode: '',
  name: '',
  email: '',
  role: '',
  userRole: 'EMPLOYEE',
  companyId: null,
  companyName: '',
  officeBranch: '',
  department: 'Engineering',
  tier: 'Bronze Associate',
  avatarUrl: '',
  currentStreakDays: 0,
  longestStreakDays: 0,
  readinessScore: 0,
  readinessState: 'Awaiting Wearable Sync',
  hrHealthConsent: false,
  granularConsent: {
    shareSteps: false,
    shareHeartRateAndStress: false,
    shareSleepAndRecovery: false,
  },
  competitionTrophies: [],
  verificationStatus: 'PENDING_ID_UPLOAD',
};

export const INITIAL_HEALTH_METRICS: HealthMetrics = createZeroBaselineMetrics(
  DEFAULT_USER_GOALS,
  'uninitialized',
);

export const MOTIVATIONAL_QUOTES: MotivationalQuote[] = [
  {
    id: 'q-01',
    quote: 'Progress isn’t always a leap. Sometimes, it’s a deep breath.',
    author: 'Your Daily Pause',
    category: 'Resilience',
    readinessTag: 'Mindful Balance',
  },
  {
    id: 'q-02',
    quote: 'Small daily habits compound into extraordinary calm and creative clarity.',
    author: 'Marcus Aurelius · Adapted',
    category: 'Discipline',
    readinessTag: 'Steady Momentum',
  },
  {
    id: 'q-03',
    quote: 'Protect your energy like your most valuable studio asset.',
    author: 'Elena Rostova',
    category: 'Peak Energy',
    readinessTag: 'Creative Flow',
  },
  {
    id: 'q-04',
    quote: 'Rest is not the absence of ambition; it is the foundation of sustainable craft.',
    author: 'Seneca · Letters',
    category: 'Stoic Focus',
    readinessTag: 'Deep Recovery',
  },
  {
    id: 'q-05',
    quote: 'Great teams move together — one mindful step, one honest check-in at a time.',
    author: 'Corporate Wellness Ethos',
    category: 'Leadership',
    readinessTag: 'Team Harmony',
  },
];
