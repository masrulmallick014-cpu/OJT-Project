# PulseCorp — Workplace Wellness App (React Native + Expo + JavaScript)

PulseCorp is a workplace wellness application built with **React Native (Expo)** and **JavaScript (`.js`)**. It focuses on helping people complete simple, positive daily wellness actions—such as logging hydration, taking a 2-minute breathing break, and joining opt-in team step challenges—with clear privacy controls.

---

## 🧭 App Flow & Navigation

```
index.js → App.js → WellnessProvider → RootNavigator → Active Screen
```

### 1. Transparent 3-Step Onboarding
1. **Step 1 — Health Access (`HealthPermissionsScreen.js`)**: Explains in plain English why each permission is requested and what data is read. Never triggers OS permission dialogs automatically on screen mount, and allows skipping permissions to use manual logging.
2. **Step 2 — Profile & Body Info (`OnboardingScreen.js`)**: Collects height, weight, and gender to estimate stride length and resting energy locally on the device.
3. **Step 3 — Company Workspace (`CompanyVerificationScreen.js`)**: Lets the user select their company workspace and optionally attach an ID card image (`UNDER_REVIEW` status pending HR review). Does not use synthetic OCR stuffing or fake auto-verification badges.

### 2. Four-Destination Bottom Navigation (`RootNavigator.js`)
- **Home (`HomeScreen.js`)**: One primary daily step goal at the top, three quick actions (*Log water (+250 ml)*, *Start 2-minute breathing*, *Join a walk*), honest personal health readings (*No reading yet* / *Permission needed* / *Last updated*), and a compact Team Updates summary.
- **Move (`ChallengesScreen.js` + `MindfulScreen.js`)**: Contains three sub-tabs:
  - **Challenges**: Opt-in team step challenges and workspace leaderboard.
  - **Calm**: 2-minute 4-4-4 guided box breathing timer.
  - **Office Activities**: Propose and vote on opt-in team wellness breaks.
- **Community (`CommunityScreen.js` + `src/features/social/*`)**:
  - **Feed (`FeedScreen.js`)**: Recent updates, wellness wins, coworker connection cards (`CrossCompanyCarousel.js`), and a finite *"You’re all caught up"* footer (no endless scroll). Seeded items and sample profiles are clearly labeled as **Demo**.
  - **Team Chats**: Local demo office chat rooms and 1-on-1 messages.
  - **Support & Ideas**: Workplace support board with an anonymous posting option.
  - **Work Tips**: Practical tips and Q&A sorted by category.
- **Profile (`SettingsScreen.js`)**:
  - Explicit **Share Health Data with HR** opt-in toggle (defaults to `false`).
  - Notification & reminder controls.
  - Client-side HR role & consent privacy check demonstration.
  - Collapsible **Technical & Sensor Diagnostics** drawer (collapsed by default).

---

## 🔒 What Runs Locally vs. What Is Demo/Stubbed

- **On-Device / Real Native APIs**:
  - `AsyncStorage` persistence for user profile, onboarding steps, hydration logs, workout logs, and privacy/notification settings.
  - `expo-sensors` (`Pedometer` and `Accelerometer`) when running on a physical device after the user taps *Grant Health Permissions*.
  - `react-native-health-connect` bridge on Android (`src/services/healthConnect.android.js`) when Health Connect is installed and authorized.
  - `expo-image-picker` for selecting a local ID card photo.
- **Local In-Memory Demo Helpers (Not Deployed Cloud Services)**:
  - `src/services/apiClient.js` & `backend/src/server.js`: Client-side in-memory leaderboard sorting and HR consent check helpers.
  - `src/lib/supabase.js`: Local in-memory store for seeded community posts, sample coworker profiles, connection requests, and demo chat auto-replies.
  - `src/services/companyService.js`: Local workspace directory and local image dimension check (marks uploaded IDs as `UNDER_REVIEW`).

---

## 🚀 Running the Project

```bash
# 1. Install dependencies
npm install

# 2. Start the Expo development server
npx expo start
```
