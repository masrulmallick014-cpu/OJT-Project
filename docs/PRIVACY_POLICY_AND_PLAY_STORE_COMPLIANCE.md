# PulseCorp — Privacy Policy, Data Inventory & Google Play Compliance Guide

> **Document Purpose**: Evidence-based documentation of PulseCorp’s actual data collection, permissions, storage behavior, Health Connect disclosures, UGC moderation controls, account deletion flows, and Google Play Console submission requirements.
>
> **Owner Action Required**: All fields marked `[OWNER_REQUIRED: ...]` must be replaced with your verified legal entity, domain, and support contact before publishing to Google Play.

---

## 1. Data Inventory (Code-Verified)

| Data Category | Specific Data Elements | Purpose | Storage Location | Default Sharing / Recipients | Deletion Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Account Identity** | Email address, Full Name, User ID (`uid`), Department, Job Title, Company Workspace ID | Account profile, workspace membership, and onboarding progress | On-device `AsyncStorage` (`@pulsecorp_user_profiles_v2`, `@pulsecorp_auth_accounts_v2`); Supabase `auth.users` & `public.profiles` when cloud env vars are configured | Not shared with third parties. Passwords are **never** stored in local device storage. | Permanently deleted when the user taps **Delete Account & Data** in Profile & Settings (`deleteAccount()` / `delete_my_account()` RPC). |
| **Physical Calibration** | Height (cm), Weight (kg), Age, Gender, calculated Stride Length & BMR | Estimating walking distance and active energy burned from step counts | On-device `AsyncStorage` (`@pulsecorp_user_profiles_v2`); `public.profiles` when Supabase is configured | Private to the user by default | Permanently deleted on account deletion. |
| **Health & Fitness Metrics** | Daily Steps, Walking Distance (km), Active Calories Burned (kcal), Resting/Current Heart Rate (BPM), Sleep Duration, Hydration Log (ml), Mindful Minutes | Displaying personal daily progress, weekly recap, and opt-in wellness challenges | On-device `AsyncStorage` (`@pulsecorp_steps_YYYY-MM-DD`, `@pulsecorp_app_workspace_v2`); `public.daily_health_metrics` when Supabase is configured | **Private by default (`hrHealthConsent = false`)**. Shared with same-company HR Admins **only** if the user explicitly turns on *Share My Health Data with HR* and selects specific granular categories. Aggregate company metrics require a minimum group size of **5 opted-in employees** (`k >= 5`). | Permanently deleted on account deletion. Users can revoke HR sharing consent at any time in Profile & Settings. |
| **Company ID Card Image (Optional)** | Local image URI, width/height dimensions, file size, submission status (`UNDER_REVIEW`) | Optional company workspace verification | On-device `AsyncStorage` (`@pulsecorp_id_submissions_db_v2`) | Marked `UNDER_REVIEW` locally; not uploaded to an external AI/OCR service | Permanently deleted on account deletion. |
| **Community & User-Generated Content (UGC)** | Posts, replies, poll votes, activity proposals, content reports, blocked user IDs, UGC rules acceptance timestamp | Workplace wellness community feed, support board, and UGC moderation | On-device `AsyncStorage` (`@pulsecorp_app_workspace_v2`, `@pulsecorp_moderation_v2`); `public.community_posts`, `public.content_reports`, `public.user_blocks` when Supabase is configured | Visible to workspace members (excluding blocked users). Seeded items are labeled `Demo`. | All user-authored posts, replies, messages, blocks, and reports are permanently deleted on account deletion. |

---

## 2. Android Permissions & Health Connect Audit

Only permissions required for active user-facing features are declared in `android/app/src/main/AndroidManifest.xml` and `app.json`:

| Android Permission | Feature Using It | When Requested | Removed Unused Permissions |
| :--- | :--- | :--- | :--- |
| `android.permission.INTERNET` | Network requests when Supabase cloud backend is configured | Install-time standard permission | — |
| `android.permission.VIBRATE` | Subtle haptic feedback on button presses (`expo-haptics`) | Install-time standard permission | — |
| `android.permission.ACTIVITY_RECOGNITION` | Hardware step counter (`expo-sensors` `Pedometer`) | **Runtime only**, after user reads Step 1 explanation and taps *Grant Health Permissions* | — |
| `android.permission.health.READ_STEPS` | Reading daily step count from Android Health Connect | **Runtime only**, upon explicit user action | — |
| `android.permission.health.READ_ACTIVE_CALORIES_BURNED` | Reading active energy burned from Android Health Connect | **Runtime only**, upon explicit user action | — |
| `android.permission.health.READ_HEART_RATE` | Displaying optional heart rate reading on Today screen | **Runtime only**, upon explicit user action | — |
| `android.permission.health.READ_SLEEP` | Displaying optional sleep duration on Today screen | **Runtime only**, upon explicit user action | — |
| *(Removed)* `SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `READ_OXYGEN_SATURATION` | Removed from production `AndroidManifest.xml`, `app.json`, and `healthService.js` to enforce data minimization | N/A | **Removed** |

Additionally, `android:allowBackup="false"` and `android:fullBackupContent="false"` are enforced in `AndroidManifest.xml` so sensitive local health caches are not uploaded to unencrypted device cloud backups.

---

## 3. Privacy Policy Draft (Accurate to Implementation)

> **Instructions for Owner**: Host this policy on an HTTPS URL under your verified domain (`[OWNER_REQUIRED: https://<your-domain>/privacy-policy]`) and link it in Google Play Console -> App Content -> Privacy Policy and inside your Health Connect rationale flow.

### **PulseCorp Privacy Policy**
- **Effective Date**: `[OWNER_REQUIRED: YYYY-MM-DD]`
- **Developer / Data Controller**: `[OWNER_REQUIRED: Legal Company Name & Registered Address]`
- **Privacy & Support Contact**: `[OWNER_REQUIRED: privacy@<your-domain>]`

1. **Overview & Non-Medical Scope**
   PulseCorp is a workplace wellness application that helps users track daily walking goals, hydration, guided breathing pauses, and optional team wellness challenges. PulseCorp is **not** a medical device and does not provide medical diagnosis or clinical treatment advice.
2. **Information We Collect and Why**
   - **Account & Profile Data**: Your work email, name, department, and optional body calibration metrics (height, weight, age, gender) used locally to estimate walking stride length and active energy.
   - **Health & Sensor Data (Optional)**: With your explicit permission via Android Physical Activity Recognition (`ACTIVITY_RECOGNITION`) or Google Health Connect (`READ_STEPS`, `READ_ACTIVE_CALORIES_BURNED`, `READ_HEART_RATE`, `READ_SLEEP`), PulseCorp reads your step count, active calories, heart rate, and sleep duration to display your personal progress on the Today and Challenges screens. You can decline health permissions and use manual water, breathing, and walk logging instead.
   - **Community Content**: Posts, replies, activity proposals, content reports, and user blocks you submit in the Community tab.
3. **Health Connect Data Use & Limited Use Compliance**
   - PulseCorp’s use of information received from Google Health Connect adheres strictly to the **Health Connect Permissions Policy**, including the **Limited Use** requirements.
   - Health data is **never** sold, **never** used for advertising, marketing, or creditworthiness, and **never** shared with third-party data brokers.
   - **Employer / HR Sharing is Strictly Opt-In (`OFF` by default)**: Your personal health readings are private by default. An employer or HR Administrator cannot view your individual health metrics unless you explicitly enable **Share My Health Data with HR** in *Profile & Settings* and select specific categories. You may revoke this consent at any time.
   - **Minimum Group Size for Aggregate Insights**: Workplace aggregate wellness summaries require at least **5 opted-in employees** (`k >= 5`) before averages are computed, preventing re-identification of individuals in small teams.
4. **Data Storage, Retention & Account Deletion**
   - Data is stored on your device in application storage and, when connected to your organization’s cloud workspace, in access-controlled PostgreSQL tables protected by Row Level Security (RLS).
   - **In-App Deletion**: You can permanently delete your account and all associated profile, health, consent, and community data at any time by opening **Profile & Settings → Delete Account & Data → Delete Permanently**.
   - **Web Deletion Request**: If you have uninstalled the app, you may request permanent account and data deletion at `[OWNER_REQUIRED: https://<your-domain>/delete-account]`. Deletion requests are processed within `[OWNER_REQUIRED: e.g., 7 business days]`.

---

## 4. Google Play Console Checklists

### A. Data Safety Form Preparation Checklist
- **Does your app collect or share any of the required user data types?** Yes.
- **Health and Fitness (`Health info`, `Fitness info`)**:
  - Collected: **Yes** (Optional — user-initiated permission grant or manual entry).
  - Shared with third parties: **No** (Optional internal workplace HR sharing is disabled by default and requires explicit granular user opt-in).
  - Ephemeral: **No**.
  - Purpose: **App functionality** (displaying personal daily step goal, hydration, breathing pauses, and opt-in challenges).
- **Personal Info (`Name`, `Email address`, `User IDs`)**:
  - Collected: **Yes** (Required for account/profile setup).
  - Purpose: **App functionality, Account management**.
- **Photos and Videos (`Photos`)**:
  - Collected: **Optional** (Only if user chooses to attach a company ID card image).
- **App Activity (`In-app messages`, `Other user-generated content`)**:
  - Collected: **Optional** (Community posts, replies, and activity proposals).
- **Data Deletion Mechanism**:
  - In-app deletion path provided: **Yes** (*Profile & Settings → Delete Account & Data*).
  - Web deletion URL provided: **Yes** (`[OWNER_REQUIRED: Host web/delete-account.html and paste HTTPS URL in Play Console]`).

### B. Google Play Health Apps & Health Connect Declaration Checklist
- **Health App Category**: Physical Fitness / Wellness & Stress Management (Non-medical).
- **Requested Health Connect Permissions**:
  1. `android.permission.health.READ_STEPS`: Displays daily walking progress toward the user's personal step goal and opt-in team step challenges.
  2. `android.permission.health.READ_ACTIVE_CALORIES_BURNED`: Displays daily active energy burned alongside walking progress.
  3. `android.permission.health.READ_HEART_RATE`: Displays optional resting and current heart rate on the Today screen when a compatible watch is connected.
  4. `android.permission.health.READ_SLEEP`: Displays optional daily sleep duration on the Today screen.
- **Manifest Compliance Verified in Code**:
  - `androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE` intent-filter declared on `.MainActivity`.
  - `android.permission.health.START_ONBOARDING` intent-filter declared on `.MainActivity`.
  - `ViewPermissionUsageActivity` `<activity-alias>` with `android.permission.START_VIEW_PERMISSION_USAGE` and `android.intent.action.VIEW_PERMISSION_USAGE` / `android.intent.category.HEALTH_PERMISSIONS` declared for Android 14+.

### C. User-Generated Content (UGC) Policy Checklist
- **Before posting/commenting**: Users must accept the in-app **Community Guidelines** modal (`ugcRulesAccepted`).
- **In-app Reporting**: Every community post includes a working **Report** button that opens a reason selector, hides the content immediately, and records a moderation ticket (`content_reports`).
- **In-app User Blocking**: Every community post includes a working **Block User** button that immediately filters out all posts, stories, and messages from that author (`blockedUsers`), with an **Unblock** list in *Profile & Settings*.
- **Rate Limiting**: Cooldown checks prevent rapid automated spam submissions.
