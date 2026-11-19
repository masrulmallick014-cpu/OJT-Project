8# PulseCorp — Enterprise Mobile Wellness Architecture

Production-grade, store-ready Corporate Wellness mobile application built with **React Native (Expo SDK 51+)** and **TypeScript**, engineered for deployment to Google Play Store and Apple App Store.

---

## 🏛️ Architectural Overview

PulseCorp employs a **Feature-Driven & Hybrid Adapter Architecture** designed for high scalability, fault tolerance, and multi-platform biometric synchronization.

```
pulsecorp/
├── App.tsx                               # Application Root & Wellness Provider
├── app.json                              # App Store & Health Connect Manifest
├── package.json                          # Dependencies & EAS Scripts
├── tsconfig.json                         # Strict Type Paths
└── src/
    ├── theme/                            # Motivational Dark-Mode Design System
    │   ├── colors.ts                     # #0F172A slate, #1E293B surface, #10B981 emerald, #06B6D4 cyan
    │   ├── typography.ts                 # Executive typography scales
    │   └── index.ts                      # Theme barrel export & shadows
    ├── types/                            # Strict Domain Interfaces
    │   └── index.ts                      # HealthMetrics, EmployeeProfile, WearableDevice, MotivationalQuote
    ├── constants/                        # Curated Libraries
    │   └── quotesLibrary.ts              # 150+ Curated High-Performance Quotes & Category Mappings
    ├── services/                         # Hybrid Health Adapter Layer
    │   └── healthService.ts              # Android Health Connect & iOS Apple HealthKit + Live Telemetry Sim
    ├── context/                          # Global State & Persistence
    │   └── WellnessContext.tsx           # Multi-Stage Sync Engine with AsyncStorage Persistence
    ├── components/common/                # Reusable Design System Primitives
    │   ├── Badge.tsx                     # Tier, Readiness, and Status Pills
    │   ├── Card.tsx                      # Slate Surface Container
    │   ├── Icon.tsx                      # Built-in SVG Icon System (No missing native glyphs)
    │   └── ProgressRing.tsx              # SVG Animated Circular Telemetry Rings
    ├── features/                         # Core Business Verticals
    │   ├── gate/                         # Launch Experience
    │   │   └── MotivationalGateScreen.tsx# Daily Gate, Animated Flame Streak, 150+ Quotes, Haptics
    │   ├── dashboard/                    # Real-Time Telemetry Hub
    │   │   └── DashboardScreen.tsx       # Steps (10k Goal), HR, Calories, Sleep, SpO2, Wearable Hub
    │   ├── challenges/                   # Corporate Social
    │   │   └── ChallengesScreen.tsx      # Cross-departmental leaderboards & Q4 Mobility Sprint
    │   └── settings/                     # App Store & Health Connect Compliance
    │       └── SettingsScreen.tsx        # Privacy Policy Rationale, Dept Switcher, QA Tools
    └── navigation/
        └── RootNavigator.tsx             # Motivational Gate Controller & Bottom Tab Navigator
```

---

## ⚡ Core Features

### 1. Daily Motivational Gate (Launch Experience)
- Every session initiates with a high-impact full-screen gate before dashboard entry.
- **150+ Curated Quotes** across *Discipline, Resilience, Leadership, Peak Energy, and Stoic Focus*.
- **Animated Daily Streak Counter** with pulse animation and departmental ranking tier.
- **Dynamic Readiness Index Badge** derived from sleep recovery and resting heart rate.
- **Haptic-Feedback CTA**: `"LOCK IN & ENTER DASHBOARD"` triggering immediate telemetry synchronization.

### 2. Hybrid Health Adapter Layer (`src/services/healthService.ts`)
- **Android Integration**: Native Google Health Connect (`react-native-health-connect`) permissions for:
  - `READ_STEPS`
  - `READ_HEART_RATE`
  - `READ_SLEEP`
  - `READ_ACTIVE_CALORIES_BURNED`
  - `READ_OXYGEN_SATURATION`
- **iOS Integration**: Apple HealthKit (`react-native-health`) with `NSHealthShareUsageDescription`.
- **Zero-Crash Development Fallback**: Automatic `USE_NATIVE_HEALTH_API` toggle. In Expo Go/web previews, gracefully switches to a realistic live-fluctuating telemetry simulator.

### 3. Real-Time Telemetry Grid
- **Daily Steps**: Real-time progress against the 10,000 Corporate Benchmark with SVG progress rings and distance estimation.
- **Heart Rate**: Current BPM, Resting BPM, and Zone indicators (*Rest, Fat Burn, Cardio, Peak*).
- **Active Calories Burned**: Calculated caloric expenditure with metabolic pace tracking.
- **Sleep & Recovery**: Deep sleep, REM breakdown, and physiological recovery score (0–100%).
- **Blood Oxygen & Stress**: SpO2 saturation (%) and HRV autonomic vagal nerve stress index.

### 4. App Store & Google Play Store Compliance
- **Google Health Connect Intent Filter**:
  Configured in `app.json` for `androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE` required by Google Play Store health policies.
- **Transparent Privacy Disclosures**:
  In-app disclosure screen certifying biometric data is encrypted at rest (AES-256) and never transferred to third-party data brokers or advertising platforms.

---

## 🚀 Running the Project

### Development (Expo Go / Web / Simulator)
```bash
# 1. Install dependencies
npm install

# 2. Start the Expo development server
npx expo start
```

### Production Native Build (EAS Build)
To compile native Health Connect and HealthKit binaries:
```bash
# Set USE_NATIVE_HEALTH_API = true in src/services/healthService.ts
eas build --profile development --platform all
```

## Verify phone-only step counting on a real device

The app uses the phone’s built-in pedometer as its step source. A smartwatch is not needed. The accelerometer only supplies motion diagnostics and does not add steps.

1. Start the app with npx expo start and open it on a physical Android or iPhone using Expo Go, or install the native development build.
2. Sign in, open the phone step permission screen, and allow Physical Activity / Motion access.
3. Open the dashboard and find the Phone Pedometer status. It should say active/streaming and show the phone step total.
4. Keep the app open, put the phone in your pocket or hand, and walk 20–50 steps. The phone step total and last-step timestamp should update.
5. The Phone Pedometer count is the app’s step total. External Health Connect / Apple Health records are shown separately.

The live expo-sensors stream pauses when the app is in the background. Android background step history is not provided by this live listener; this build counts live steps while the app is open. An emulator or web preview may not have a physical step sensor.
