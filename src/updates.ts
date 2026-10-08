import * as Application from 'expo-application';
import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { Alert, Linking } from 'react-native';

const GITHUB_REPO = 'rdzaman62446-design/Personal-Finance-Monitor';

// Compares "1.2.3"-style versions (a leading "v" is ignored).
// Returns >0 if a is newer than b, <0 if older, 0 if equal.
export function compareVersions(a: string, b: string) {
  const pa = a.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

// Small updates: JS/screen changes published with `eas update`.
// Downloads in the background, then offers to restart into the new version.
async function checkOverTheAirUpdate() {
  if (__DEV__ || !Updates.isEnabled) return;
  const check = await Updates.checkForUpdateAsync();
  if (!check.isAvailable) return;
  const fetched = await Updates.fetchUpdateAsync();
  if (!fetched.isNew) return;
  Alert.alert('Update ready', 'A new version of SpendTrack was downloaded.', [
    { text: 'Later', style: 'cancel' },
    { text: 'Restart now', onPress: () => Updates.reloadAsync() },
  ]);
}

// Big updates: a new APK attached to a GitHub Release tagged "vX.Y.Z".
// Needed only when native code changes, so the app must be reinstalled.
async function checkNewApkRelease(): Promise<boolean> {
  const current = Application.nativeApplicationVersion;
  if (!current) return false;
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) return false;
  const release: {
    tag_name: string;
    html_url: string;
    assets?: { name: string; browser_download_url: string }[];
  } = await res.json();
  if (compareVersions(release.tag_name, current) <= 0) return false;
  const apk = release.assets?.find((a) => a.name.endsWith('.apk'));
  Alert.alert(
    'New app version',
    `Version ${release.tag_name.replace(/^v/, '')} is available. You have ${current}. ` +
      'Download and install it to get the latest features. Your data is kept.',
    [
      { text: 'Later', style: 'cancel' },
      {
        text: 'Download',
        onPress: () => Linking.openURL(apk?.browser_download_url ?? release.html_url),
      },
    ],
  );
  return true;
}

export function useUpdateCheck() {
  useEffect(() => {
    // A new APK takes priority: OTA updates are tied to the installed native version.
    checkNewApkRelease()
      .catch(() => false)
      .then((shown) => (shown ? undefined : checkOverTheAirUpdate()))
      .catch(() => {});
  }, []);
}

// e.g. "v1.0.0" for the build as installed, or "v1.0.0 · updated Oct 08, 3:15 PM"
// once an over-the-air update is running.
export function versionLabel() {
  const base = `v${Application.nativeApplicationVersion ?? '?'}`;
  if (Updates.isEmbeddedLaunch || !Updates.createdAt) return base;
  const when = Updates.createdAt.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${base} · updated ${when}`;
}
