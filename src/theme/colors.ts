/**
 * "Your Wellness, In Bloom" — Botanical Warm Alabaster, Sage & Sand Design System
 * Matches reference screenshots and enterprise 100K-user specification.
 */
export const colors = {
  // Core Canvas & Surfaces
  background: '#FAF9F5', // Warm Alabaster / Cream
  backgroundElevated: '#F3F0EA',
  card: '#FFFFFF', // Pure White card surface
  surface: '#FFFFFF',
  cardHighlight: '#F7FAF7',
  surfaceBorder: '#EFECE6', // Subtle warm stone border
  sageBorder: '#CBE0CF',

  // Primary Brand — Deep Forest Green & Soft Sage
  primary: '#1E3A2F', // Deep Forest Green
  primaryGlow: '#4A7C59', // Muted Sage
  primaryDark: '#142820',
  primarySoftBg: '#DFECE2', // Soft Sage Hero Surface start
  primarySoftEnd: '#EBF3EC', // Soft Sage Hero Surface end
  primarySoftBorder: '#CBE0CF',

  // Secondary Accent — Warm Sand / Beige (Streak & Avatar Badges)
  accent: '#7A5C43',
  accentGlow: '#B87D4B',
  accentSoftBg: '#F5EBE1',
  accentRing: '#D5C3B0',
  streakIcon: '#B87D4B',
  streakBg: '#F5EBE1',
  streakBorder: '#D5C3B0',
  sandAvatarBg: '#D8C3B0',
  sandAvatarRing: '#F2EAE1',
  sandAvatarText: '#43382E',

  // Semantic Telemetry Accents
  heartRate: '#9E4754', // Coral Pink icon
  heartRateSoftBg: '#F9E8EA', // Coral Pink badge
  chartTeal: '#4F8F8B', // Smooth teal area wave
  cyan: '#4F8F8B',
  chartTealFill: 'rgba(79, 143, 139, 0.18)',
  calories: '#C87D55',
  sleep: '#6C7A9C',
  oxygen: '#4F8F8B',
  stress: '#3B8256',

  // Typography Hierarchy
  textPrimary: '#1E3A2F', // Deep Forest / Charcoal
  textSecondary: '#5C645E', // Warm Slate
  textMuted: '#8A8E89', // Muted Warm Gray
  textInverse: '#FFFFFF',

  // Status Indicators
  success: '#3B8256', // Connected / Low Stress Green
  warning: '#D97706', // Warning Amber
  danger: '#C94A4A',
  info: '#4F8F8B',

  // Gradients
  gradients: {
    heroCard: ['#DFECE2', '#EBF3EC', '#F4F8F4'] as const,
    primaryButton: ['#1E3A2F', '#2E5444'] as const,
    emeraldBadge: ['#DFECE2', '#EBF3EC'] as const,
    profileHeader: ['#EBF3EC', '#F7FAF7', '#FFFFFF'] as const,
    podiumGold: ['#FBF3DC', '#F5E4B8'] as const,
  },
};
