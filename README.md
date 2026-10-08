# SpendTrack

A quick expense logger for Android (PHP ₱), built with React Native + Expo.
Data stays on your phone.

## First-time setup (once)

1. **Create a free Expo account** at https://expo.dev/signup.
2. **Create an access token**: expo.dev → Account settings → Access tokens → *Create token*. Copy it.
3. **Add it to GitHub**: this repo → Settings → Secrets and variables → Actions → *New repository secret*.
   Name: `EXPO_TOKEN`, value: the token.
4. **Link the project**: Actions tab → *Setup Expo project* → *Run workflow*.
5. **Build the app**: Actions tab → *Release APK* → *Run workflow* (takes ~15 min).

## Install on your phone

1. Open the repo's **Releases** page on your phone and download `SpendTrack-vX.Y.Z.apk`.
2. Tap the file. If asked, allow your browser/files app to *install unknown apps*.
3. Tap **Install**. SpendTrack appears on your home screen.

## How updates work

| Change | What to do | What you see on the phone |
|---|---|---|
| Screens, features, fixes (most changes) | Push/merge to `main`. The *Publish OTA update* workflow runs automatically. | Next time you open the app: "Update ready → Restart now". |
| New native library or Expo SDK upgrade | Bump `version` in `app.json`, merge, run *Release APK*. | Next time you open the app: "New app version → Download". Install over the old one; data is kept. |

Over-the-air updates only reach installs with the same `version` (runtime), so
an APK built from version `1.0.0` never receives JS that expects newer native code.

## Develop

```bash
npm install
npx expo start      # dev server
npm run typecheck
```
