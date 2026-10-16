# SpendTrack 💸

**A fast, offline-first personal finance app for Android.** Log expenses and income in a few taps,
see where your money goes with charts, plan your savings months ahead, and keep everything synced to
your own Google Sheet.

Built with **React Native + Expo (TypeScript)**. Ships **over-the-air updates** through a GitHub Actions → Expo EAS pipeline.

[**⬇️ Download the latest APK**](https://github.com/rdzaman62446-design/Personal-Finance-Monitor/releases/latest) · Android 7+ · Free · No sign-up · Your data stays on your phone

<!--
## Screenshots
Add phone screenshots to docs/screenshots/ with these names, then delete this comment line and the one at the end.

<p align="center">
  <img src="docs/screenshots/add.png" width="200" alt="Add Log" />
  <img src="docs/screenshots/table-log.png" width="200" alt="Table Log" />
  <img src="docs/screenshots/stats.png" width="200" alt="Stats" />
  <img src="docs/screenshots/forecast.png" width="200" alt="Forecast" />
</p>
-->

---

## Install (Android)

1. On your Android phone, open **[Releases → latest](https://github.com/rdzaman62446-design/Personal-Finance-Monitor/releases/latest)** and download `SpendTrack-vX.Y.Z.apk`.
2. Tap the downloaded file. If Android asks, allow your browser or Files app to **install unknown apps**.
3. Tap **Install**. If Play Protect shows a warning, choose **Install anyway**. The app isn't from the Play Store, so Android always shows this warning.

After that, the app keeps itself up to date. Small updates download automatically, and when a new version needs a reinstall, the app offers it.

> iPhone isn't supported yet. The code is cross-platform, but iOS distribution needs an Apple Developer account.

---

## Features

### ✍️ Logging
- Add **expenses or income** in a few taps: amount, description, category, and date & time (defaults to now, or pick any past date).
- **Auto-tidy:** descriptions are cleaned up as you save (spacing, punctuation, capital letters), without changing what you wrote.
- **Repeat monthly:** rent, bills and subscriptions are logged automatically every month, including months the app wasn't opened.
- **Saved incomes:** set up each job once (monthly on a day or weekly on a weekday). On payday, pick it from a list. Sources due today and ones already logged are marked.
- **Custom categories** with your own emoji and color, for both expenses and income.

### 📋 Table Log
- Opens on **today's** entries. A **period dropdown** switches to Yesterday, This/Last week, This/Last month, Last 3 months, This year, All time, or a **custom date range** picked on a calendar.
- **Search** by text or by amount: `>500`, `under 200`, `100-300`, `=150`.
- **Sortable columns:** sort by amount (highest or lowest first) or by date (newest or oldest first).
- Filter by expenses, income or category. Tap a row to edit it, or long-press to delete it (with **Undo**).

### 📊 Stats
- **Total savings:** savings before the app + all income − all spending.
- **Savings goals** with progress bars, add/withdraw money, and a deadline showing how much you need per month.
- Month by month: spent, income, saved, daily average, and change vs last month.
- Charts: **3D bar charts** (overview, 6-month trend), a **3D pie** by category, a **budget gauge**, and a **daily spending line chart**. Tap any chart to see the entries behind it.
- A **monthly budget** and **per-category budgets**, with warnings when you go over.
- A **month-end summary** card you can share.

### 🧭 Forecast
- A planner like an "assumed savings" spreadsheet. Your salary and must-pay expenses are filled in from the app, and you can edit or add lines.
- A month-by-month table where you can change any single month. Weekly income counts the real paydays in each month.
- *"By end of February you'll have ₱X"*, with a chart of your balance growing.

### 🔄 Data
- **Google Sheets sync:** every change is copied to a Google Sheet in **your own** Google account (Entries, Daily and Monthly tabs) through a small Apps Script you deploy once. Setup steps are in the app.
- **Import** from a Google Sheets link or an `.xlsx`/`.csv` file. The header row is detected automatically, categories are guessed, and duplicates are skipped.
- **Export** to CSV, and **back up / restore** everything as a JSON file.

### 🕌 Extras
- **Prayer times** in the top bar: the current prayer and a countdown to the next. Calculated on the device (works offline), with a selectable method and Asr (Standard or Hanafi).
- **Dark/light mode**, a choice of **fonts** for log entries, smooth animations, and swipeable pages.

---

## Tech highlights

| Area | What's used |
|---|---|
| App | React Native 0.86, Expo SDK 57, React 19, TypeScript (strict) |
| Storage | AsyncStorage, local-first with no backend. JSON backup/restore. |
| Charts | `react-native-gifted-charts` + `react-native-svg` (3D bars), plus custom view-based pie, gauge and line charts |
| Data I/O | `fflate` (pure-JS unzip) for reading `.xlsx`, a custom CSV parser, `expo-file-system` + `expo-sharing` |
| Sync | Google Apps Script web app. The app posts JSON and the script rewrites the sheet's tabs. A per-device secret blocks other writers. |
| Prayer times | `adhan` (on-device astronomy). Location from an IP lookup, done once. |
| CI/CD | GitHub Actions → **Expo EAS Build** (cloud APK → GitHub Release) and **EAS Update** (OTA on every push to `main`) |
| Updates | `runtimeVersion: appVersion` keeps over-the-air JS updates on compatible native builds. The app checks GitHub Releases for new APKs. |
| Quality | `tsc --noEmit`, ESLint (`eslint-config-expo`, React Compiler rules), Android bundle check before each release |

### How releases work
```
push to main ──► GitHub Action "Publish OTA update" ──► Expo EAS Update ──► phones get "Update ready → Restart now"
bump version ──► GitHub Action "Release APK" ──► EAS Build (cloud) ──► GitHub Release v1.x.x ──► app offers "New app version → Download"
```
- **JS-only changes** (screens, features, fixes) reach phones within minutes without a reinstall.
- **Native changes** (new native libraries, Expo SDK upgrades) bump `version` in `app.json`, which creates a new runtime, then publish a new APK. Older installs are offered the download and never receive incompatible JavaScript.

---

## Run it yourself

### Your own copy with automatic updates (once)
1. Fork the repo and create a free **Expo** account at https://expo.dev/signup.
2. expo.dev → Account settings → **Access tokens** → *Create token*.
3. In GitHub: Settings → Secrets and variables → Actions → *New repository secret* named **`EXPO_TOKEN`**.
4. Actions tab → **Setup Expo project** → *Run workflow*. This links the Expo project and enables updates.
5. Actions tab → **Release APK** → *Run workflow*. This builds the APK in the cloud (about 15 minutes) and publishes a Release.
6. Change `GITHUB_REPO` in `src/updates.ts` to your fork so the app checks your Releases.

A step-by-step guide for starting a new app the same way is in [`docs/NEW_APP_PLAYBOOK.md`](docs/NEW_APP_PLAYBOOK.md).

### Local development
```bash
npm install
npx expo start        # dev server (a development build is needed for native modules)
npm run typecheck
npm run lint
```

### Project structure
```
src/
  App.tsx              state, swipeable pages, side menu, sheets
  screens/             Add, Table Log, Stats, Forecast
  components/          sheets, pickers, dropdowns, charts, animation helpers
  expenses.ts          entries, categories, money & date helpers
  recurring.ts         monthly repeating expenses
  incomeSources.ts     saved incomes (monthly / weekly)
  goals.ts  forecast.ts  summary.ts
  amountQuery.ts       ">500", "100-300" search parsing
  periods.ts           Table Log date ranges
  importer.ts          xlsx / csv / Google Sheets import
  backup.ts            JSON backup & restore
  sheetsSync.ts  sheetsScript.ts   Google Sheets sync
  prayer.ts            prayer-time calculation
  tidy.ts  fonts.ts  updates.ts
.github/workflows/     setup-expo, release-apk, publish-update
docs/                  playbook, Apps Script source
```

---

## Privacy
- No account, no analytics, no server: entries are stored **only on your phone**.
- Network calls are limited to:
  - checking this repo's GitHub Releases for app updates and downloading Expo updates;
  - the optional Google Sheets sync, which sends data to **your** Apps Script;
  - imports from a Google Sheets link you provide;
  - a one-time approximate location lookup by IP for prayer times (you can also enter coordinates).
