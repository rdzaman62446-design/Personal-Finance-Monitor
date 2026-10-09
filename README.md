# SpendTrack

A quick expense and income logger for Android (PHP ₱), built with React Native + Expo.
All data stays on your phone. Back it up from the menu.

## Features

**Logging**
- Add expenses or income in a few taps. Each entry has an amount, a description, a category and a date & time. The date defaults to now, and you can pick any past date.
- Descriptions are tidied automatically when saved: spacing, punctuation, capital letters.
- **Repeat monthly** expenses (rent, bills, subscriptions) are logged automatically each month, including months the app wasn't opened.
- **Saved incomes**: set up each job once (monthly on a day, or weekly on a weekday). On payday, pick it from the Income form. Sources due today and ones already logged are marked.

**Table Log**
- Opens on today's entries. A period dropdown switches to Yesterday, This/Last week, This/Last month, Last 3 months, This year, All time, or a custom date range picked on a calendar.
- Search by text, or by amount: `>500`, `under 200`, `100-300`, `=150`. Filter by expenses, income or category.
- Tap a row to edit it, or long-press to delete it (with Undo).

**Stats**
- Total savings: savings before SpendTrack + all income − all spending.
- Savings goals with progress bars, add/withdraw money, and an optional deadline showing how much is needed per month.
- A month-end summary card you can share as text.
- Month by month: spent, income, saved, daily average, and change vs last month.
- Daily spending chart and a breakdown by category.
- Monthly budget and per-category budgets, with warnings when you go over.
- Manage income sources and monthly expenses.

**Menu (☰)**
- Dark mode and the font used for log entries.
- Custom expense and income categories, each with its own emoji and color.
- Export to CSV, import from a Google Sheets link or an `.xlsx`/`.csv` file, back up, restore, and clear all data.
- **Google Sheets sync**: every change is copied to a Google Sheet in your own account (Entries, Daily and Monthly tabs) through a small Apps Script you deploy once. The script and step-by-step setup are inside the app (☰ → Data → Google Sheets sync). It syncs while the app is open; offline changes are sent next time.
- Shortcuts to budgets, income sources and past savings.

**Forecast**
- A planner like an "assumed savings" sheet. Your income sources and monthly expenses are filled in automatically, and you can add or edit lines (salary, rent, utilities…).
- A month-by-month table where you can change any single month (e.g. a smaller first paycheck). Weekly income counts the real paydays in each month.
- Pick a month to see how much you'll have by then, with a 3D chart of your balance growing.

Swipe left and right to move between Add Log, Table Log, Stats and Forecast.

## First-time setup (once)

1. **Create a free Expo account** at https://expo.dev/signup.
2. **Create an access token**: expo.dev → Account settings → Access tokens → *Create token*.
3. **Add it to GitHub**: this repo → Settings → Secrets and variables → Actions → *New repository secret*.
   Name: `EXPO_TOKEN`, value: the token.
4. **Link the project**: Actions tab → *Setup Expo project* → *Run workflow*.
5. **Build the app**: Actions tab → *Release APK* → *Run workflow* (about 15 min).

## Install on your phone

1. Open the repo's **Releases** page on your phone and download `SpendTrack-vX.Y.Z.apk`.
2. Tap the file. If asked, allow installs from this source.
3. Tap **Install**.

## How updates work

| Change | What to do | What you see on the phone |
|---|---|---|
| Screens, features, fixes (most changes) | Merge to `main`. *Publish OTA update* runs automatically. | Next launch: "Update ready → Restart now". |
| New native library or Expo SDK upgrade | Bump `version` in `app.json`, merge, run *Release APK*. | Next launch: "New app version → Download". Install over the old one. Your data is kept. |

Over-the-air updates only reach installs with the same `version` (runtime), so an APK
built from `1.0.0` never receives JavaScript that expects newer native code. Pure-JS
libraries (like `fflate` for spreadsheets or the Google Fonts) ship over the air.

## Develop

```bash
npm install
npx expo start      # dev server
npm run typecheck
npm run lint
```

Code layout: `src/App.tsx` (state, pager, menu), `src/screens/` (Add, Table Log, Stats, Forecast),
`src/components/` (sheets, pickers, charts, animation helpers), and plain logic modules in `src/`
(`expenses`, `recurring`, `incomeSources`, `goals`, `forecast`, `summary`, `amountQuery`, `importer`, `backup`, `sheetsSync`, `sheetsScript`, `tidy`, `fonts`).
