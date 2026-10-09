# Playbook: Android app with automatic updates (Expo + GitHub)

**Give this whole file to a new Claude Code chat.** It explains how to set up a new Android
app exactly like SpendTrack: built in the cloud, installed from a GitHub Release, with
automatic updates every time code reaches `main`. No computer or Android Studio is needed.

---

## 0. Fill these in first (the person tells Claude)

| Placeholder | Example | Meaning |
|---|---|---|
| `{{APP_NAME}}` | `ShopLedger` | Display name on the phone |
| `{{SLUG}}` | `shopledger` | Lowercase, no spaces (Expo project slug) |
| `{{PACKAGE}}` | `com.yourname.shopledger` | Android package id. Unique and **never changed later** |
| `{{GITHUB_OWNER}}/{{GITHUB_REPO}}` | `myname/shop-ledger` | The new, empty GitHub repo |
| `{{EXPO_ACCOUNT}}` | the new Expo account | Used only through the `EXPO_TOKEN` secret |
| `{{PHONE}}` | Android model | iPhone needs an Apple developer account. This playbook is Android-only. |
| `{{IDEA}}` | one paragraph | What the app does. Attach any mockup (`.tsx`, image, spreadsheet). |

---

## 1. What the person does (about 10 minutes, all from a phone browser)

1. **GitHub:** create a new **empty, public** repo, `{{GITHUB_OWNER}}/{{GITHUB_REPO}}`.
   - It must be public because the app checks the repo's Releases for new versions without a token.
   - Connect this repo to Claude Code (claude.ai/code) and start the session in it.
2. **Expo:** sign up at https://expo.dev/signup with the account for this app.
3. **Expo token:** expo.dev → Account settings → **Access tokens** → *Create token*. Copy it. **Never paste it into chat.**
4. **GitHub secret:** repo → Settings → Secrets and variables → **Actions** → *New repository secret*.
   Name it `EXPO_TOKEN` and paste the token as the value.
5. **Permission for Claude to push to `main`:** pushing to `main` publishes an update to the phone.
   Tell Claude up front: *"You may push to main; that's how we ship."* Otherwise Claude must ask every time.
6. When Claude says the APK is ready, open the Releases link on the phone, download the `.apk`,
   allow "install unknown apps" for the browser or Files app, and install it.

---

## 2. What Claude does: step by step

### 2.1 Scaffold (Expo, TypeScript)
```bash
npx create-expo-app@latest {{SLUG}} --template blank-typescript --no-install
# copy everything except .git into the repo root, then:
npm install
npx expo install expo-updates expo-application @react-native-async-storage/async-storage react-native-safe-area-context @expo/vector-icons
```
- The scaffold's `AGENTS.md` says to read the Expo docs. The cloud sandbox usually **cannot reach docs.expo.dev**.
  In that case, **read the type definitions in `node_modules/<pkg>/build/*.d.ts`** to get the current APIs, and don't rely on memory.
- If `npx expo install` fails on the network, prefix it with `EXPO_OFFLINE=1`.
- Put the code in `src/`, entry `index.ts` → `src/App.tsx`.

### 2.2 `app.json` essentials
```json
{
  "expo": {
    "name": "{{APP_NAME}}",
    "slug": "{{SLUG}}",
    "version": "1.0.0",
    "orientation": "portrait",
    "userInterfaceStyle": "dark",
    "runtimeVersion": { "policy": "appVersion" },
    "android": { "package": "{{PACKAGE}}" }
  }
}
```
- `runtimeVersion.policy = appVersion` ties over-the-air updates to `version`. This is what keeps updates safe (see 2.6).
- Don't add `updates.url` or `extra.eas.projectId` by hand. The **Setup** workflow writes them.

### 2.3 `eas.json`
```json
{
  "cli": { "version": ">= 16.0.0", "appVersionSource": "local" },
  "build": {
    "production": {
      "channel": "production",
      "environment": "production",
      "distribution": "internal",
      "android": { "buildType": "apk" }
    }
  }
}
```

### 2.4 Three GitHub Actions workflows (`.github/workflows/`)

**`setup-expo.yml`**: run once. It links the Expo project and commits the project ID.
```yaml
name: Setup Expo project
on: { workflow_dispatch: {} }
permissions: { contents: write }
jobs:
  setup:
    runs-on: ubuntu-latest
    env: { EXPO_TOKEN: "${{ secrets.EXPO_TOKEN }}" }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx --yes eas-cli@latest init --non-interactive --force
      - run: npx --yes eas-cli@latest update:configure --platform android --non-interactive
      - run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add app.json eas.json
          git diff --cached --quiet && exit 0
          git commit -m "Link Expo project and enable EAS Update"
          git push
```

**`release-apk.yml`**: builds the APK in the cloud and attaches it to a GitHub Release `v<version>`.
```yaml
name: Release APK
on: { workflow_dispatch: {} }
permissions: { contents: write }
concurrency: { group: release-apk, cancel-in-progress: false }
jobs:
  build:
    runs-on: ubuntu-latest
    env:
      EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
      GH_TOKEN: ${{ github.token }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - id: version
        run: |
          VERSION=$(node -p "require('./app.json').expo.version")
          echo "version=$VERSION" >> "$GITHUB_OUTPUT"
          if gh release view "v$VERSION" >/dev/null 2>&1; then
            echo "::error::Release v$VERSION exists. Bump expo.version in app.json first."; exit 1
          fi
      - run: npx --yes eas-cli@latest build --platform android --profile production --non-interactive --wait --json > build.json
      - run: curl -fL "$(node -p "require('./build.json')[0].artifacts.buildUrl")" -o "{{APP_NAME}}-v${{ steps.version.outputs.version }}.apk"
      - run: |
          gh release create "v${{ steps.version.outputs.version }}" "{{APP_NAME}}-v${{ steps.version.outputs.version }}.apk" \
            --target "${{ github.sha }}" --title "{{APP_NAME}} v${{ steps.version.outputs.version }}" \
            --notes "Download the .apk on your Android phone and tap it to install."
```

**`publish-update.yml`**: every push to `main` sends an over-the-air update.
```yaml
name: Publish OTA update
on:
  push:
    branches: [main]
    paths-ignore: ['docs/**', '**/*.md', '.github/**']   # docs/workflow edits don't ship an update
  workflow_dispatch: {}
concurrency: { group: publish-update, cancel-in-progress: true }
jobs:
  update:
    runs-on: ubuntu-latest
    env: { EXPO_TOKEN: "${{ secrets.EXPO_TOKEN }}" }
    steps:
      - uses: actions/checkout@v4
      - id: linked
        run: node -e "process.exit(require('./app.json').expo.extra?.eas?.projectId ? 0 : 1)" && echo "ok=true" >> "$GITHUB_OUTPUT" || echo "::warning::Run 'Setup Expo project' first."
      - if: steps.linked.outputs.ok == 'true'
        uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - if: steps.linked.outputs.ok == 'true'
        run: npm ci && npx tsc --noEmit
      - if: steps.linked.outputs.ok == 'true'
        run: npx --yes eas-cli@latest update --channel production --platform android --environment production --non-interactive --message "$(git log -1 --pretty=%s)"
```
(`--environment` is required for Expo SDK 55 and later.)

### 2.5 In-app update check (`src/updates.ts`): call `useUpdateCheck()` in the root component
```ts
import * as Application from 'expo-application';
import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { Alert, Linking } from 'react-native';

const GITHUB_REPO = '{{GITHUB_OWNER}}/{{GITHUB_REPO}}';

export function compareVersions(a: string, b: string) {
  const pa = a.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

// Small updates (JS only): download in the background, then offer a restart.
async function checkOverTheAirUpdate() {
  if (__DEV__ || !Updates.isEnabled) return;
  const check = await Updates.checkForUpdateAsync();
  if (!check.isAvailable) return;
  const fetched = await Updates.fetchUpdateAsync();
  if (!fetched.isNew) return;
  Alert.alert('Update ready', 'A new version was downloaded.', [
    { text: 'Later', style: 'cancel' },
    { text: 'Restart now', onPress: () => Updates.reloadAsync() },
  ]);
}

// Big updates (native changes): a newer GitHub Release means a new APK to install.
async function checkNewApkRelease(): Promise<boolean> {
  const current = Application.nativeApplicationVersion;
  if (!current) return false;
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) return false;
  const release: { tag_name: string; html_url: string; assets?: { name: string; browser_download_url: string }[] } = await res.json();
  if (compareVersions(release.tag_name, current) <= 0) return false;
  const apk = release.assets?.find((a) => a.name.endsWith('.apk'));
  Alert.alert('New app version', `Version ${release.tag_name.replace(/^v/, '')} is available (you have ${current}). Your data is kept.`, [
    { text: 'Later', style: 'cancel' },
    { text: 'Download', onPress: () => Linking.openURL(apk?.browser_download_url ?? release.html_url) },
  ]);
  return true;
}

export function useUpdateCheck() {
  useEffect(() => {
    checkNewApkRelease()
      .catch(() => false)
      .then((shown) => (shown ? undefined : checkOverTheAirUpdate()))
      .catch(() => {});
  }, []);
}
```

### 2.6 First release, in this order
1. Commit and push to the working branch. Then create `main` from it with the person's permission (`git push origin <branch>:main`).
2. Run **Setup Expo project** (GitHub MCP `actions_run_trigger`, `workflow_id: setup-expo.yml`, `ref: main`). Then pull, because it commits to `main`.
3. Run **Release APK** (`ref: main`). It takes 10–20 minutes. Poll `https://api.github.com/repos/{{GITHUB_OWNER}}/{{GITHUB_REPO}}/actions/runs/<id>` with `curl` in a background loop, not with a foreground sleep.
4. Give the person the direct link: `https://github.com/{{GITHUB_OWNER}}/{{GITHUB_REPO}}/releases/download/v1.0.0/{{APP_NAME}}-v1.0.0.apk`.
5. Prove the update path early: make a tiny visible change, push it to `main`, and have the person close and reopen the app to see **"Update ready → Restart now"**.

---

## 3. Rules Claude must follow every time it ships

**Update or reinstall?**
- **JS-only changes** (screens, logic, pure-JS npm packages, fonts loaded with `expo-font`, `fetch` calls) ship **over the air**. Push to `main` and you're done.
- **Native changes** (any package with Android code, such as `react-native-svg`, `expo-location`, `expo-notifications` or camera; a new config plugin; an Expo SDK upgrade):
  1. Bump `version` in `app.json` (for example 1.0.0 → 1.1.0). That creates a new runtime, so the new JS never reaches old installs and can't crash them.
  2. Push to `main`, then run **Release APK**.
  3. The old app offers "New app version → Download". The user reinstalls once and their data stays.
- **Check before adding a dependency.** Look in `node_modules/<pkg>/` for `android/` or `expo-module.config.json`. If it has native code, tell the person it needs a reinstall *before* building.
- **Prefer no-native solutions** when the person doesn't want to reinstall: plain `Animated`, view-based UI, `fetch`, pure-JS libraries.

**Before every push to `main`:**
```bash
npx tsc --noEmit
npx expo lint                     # set up with: EXPO_OFFLINE=1 npx expo install eslint eslint-config-expo -- --save-dev
EXPO_OFFLINE=1 npx expo export --platform android --output-dir /tmp/bundle-check   # proves the JS bundle builds
```
- Unit-test pure logic (dates, money math, parsers) with `npx -y tsx some-test.ts`, then delete the test file.
- After pushing, wait for **Publish OTA update** to finish successfully before saying "it's live".

**Code conventions that kept lint clean (React Compiler rules in SDK 54+):**
- Animated values: `const [x] = useState(() => new Animated.Value(0))`, not `useRef(...).current`.
- Don't call `setState` synchronously in effects. To reset form state, mount the form as a child with a `key`.
- No `Date.now()` during render. Capture it with `useState(() => Date.now())`, or call it in handlers or in non-component helpers.
- Persist state with a small `usePersistentState(key, initial)` hook built on AsyncStorage that returns `[value, set, loaded]`.
- Keep pure logic in `src/*.ts`, separate from components, so it can be tested with `tsx`.

**Working with the person:**
- Keep replies short and in simple words. Show a small table of options, then give a recommendation.
- Say clearly what was tested and what can't be tested from the cloud (anything on the real phone).
- Never ask for or accept secrets in chat. Tokens go in GitHub Secrets, and API keys go into the app's own settings.
- Data stays on the phone by default. Offer **Backup/Restore** (a JSON file shared to Drive) early.
- Commit messages: describe the change and why, ending with the attribution lines the session requires.

---

## 4. Optional add-ons that worked well (all over the air)
- **Google Sheets sync:** a small Apps Script deployed as a web app ("Execute as me", "Anyone"). The app POSTs JSON as `text/plain`, and the script rewrites the tabs. The first device's secret is stored in Script Properties.
- **Import from xlsx/csv or a Google Sheets link:** `fflate` (pure JS) unzips the xlsx, and the export URL is `.../export?format=xlsx`.
- **Custom fonts:** `@expo-google-fonts/*` with `useFonts`. Import only the weights you use, through subpaths.
- **Prayer times:** the `adhan` library (offline), with location from `https://ipwho.is/` and `https://ipapi.co/json/` as a fallback.
- **Real charts** (needs a reinstall): `react-native-gifted-charts` + `react-native-svg` + `expo-linear-gradient`.

---

## 5. Prompt to start the new chat
> I want to build **{{APP_NAME}}**: {{IDEA}}. Use the attached playbook exactly.
> Repo: {{GITHUB_OWNER}}/{{GITHUB_REPO}} (empty). The `EXPO_TOKEN` secret is already added. Phone: {{PHONE}}.
> You may push to `main` to ship updates. Start with v1.0.0: get it running on my phone first,
> then we'll add features in small releases. Keep explanations short and simple.
