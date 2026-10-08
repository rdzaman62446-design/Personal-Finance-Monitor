import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SHEETS_SCRIPT } from '../sheetsScript';
import { isScriptUrl, SheetsSync } from '../sheetsSync';
import { Theme } from '../theme';
import { PressableScale } from './motion';

type Props = {
  theme: Theme;
  visible: boolean;
  sync: SheetsSync | null;
  syncing: boolean;
  onClose: () => void;
  // Connects (or reconnects) with a web app URL; resolves when the first sync is done.
  onConnect: (url: string) => Promise<void>;
  onSyncNow: () => void;
  onDisconnect: () => void;
};

const ago = (ts: number) => {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

// Setup and status for syncing to the user's own Google Sheet.
export default function SheetsSyncModal(props: Props) {
  return (
    <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <Pressable style={styles.backdrop} onPress={props.onClose}>
          {props.visible && <Sheet {...props} />}
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Sheet({ theme: t, sync, syncing, onConnect, onSyncNow, onDisconnect }: Props) {
  const [url, setUrl] = useState(sync?.url ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScript, setShowScript] = useState(!sync);
  const [slide] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(slide, { toValue: 1, duration: 320, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }).start();
  }, [slide]);

  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConnect(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [800, 0] });
  const step = (n: number, text: string) => (
    <View style={styles.step}>
      <View style={[styles.stepNum, { backgroundColor: t.accentSoft }]}>
        <Text style={{ color: t.accent, fontWeight: '800', fontSize: 12 }}>{n}</Text>
      </View>
      <Text style={{ flex: 1, color: t.text, fontSize: 13, lineHeight: 19 }}>{text}</Text>
    </View>
  );

  return (
    <Animated.View style={{ transform: [{ translateY }], maxHeight: '94%' }}>
      <Pressable style={[styles.sheet, { backgroundColor: t.card, borderColor: t.border }]}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 10 }}>
          <View style={[styles.handle, { backgroundColor: t.border }]} />
          <View style={styles.row}>
            <Feather name="grid" size={18} color={t.accent} />
            <Text style={{ color: t.text, fontWeight: '700', fontSize: 17 }}>Google Sheets sync</Text>
          </View>

          {sync && (
            <View style={[styles.status, { backgroundColor: sync.lastError ? t.dangerSoft : t.accentSoft }]}>
              <Feather
                name={sync.lastError ? 'alert-circle' : 'check-circle'}
                size={16}
                color={sync.lastError ? t.danger : t.accent}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ color: sync.lastError ? t.danger : t.accent, fontWeight: '700', fontSize: 13 }}>
                  {syncing ? 'Syncing…' : sync.lastError ? 'Last sync failed' : 'Connected'}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: 11 }}>
                  {sync.lastError ?? (sync.lastSync ? `Last synced ${ago(sync.lastSync)}` : 'Not synced yet')}
                </Text>
              </View>
              <PressableScale onPress={onSyncNow} disabled={syncing} style={[styles.smallBtn, { borderColor: t.border }]}>
                {syncing ? <ActivityIndicator size="small" color={t.accent} /> : <Feather name="refresh-cw" size={14} color={t.text} />}
                <Text style={{ color: t.text, fontSize: 12, fontWeight: '600' }}>Sync now</Text>
              </PressableScale>
            </View>
          )}

          <Text style={{ color: t.textMuted, fontSize: 12 }}>
            Every change you make is copied to a Google Sheet in your own account, with tabs for Entries, Daily and
            Monthly totals. It syncs whenever the app is open; offline changes go up next time.
          </Text>

          <Pressable onPress={() => setShowScript(!showScript)} style={styles.row}>
            <Feather name={showScript ? 'chevron-down' : 'chevron-right'} size={16} color={t.accent} />
            <Text style={{ color: t.accent, fontWeight: '700', fontSize: 13 }}>{sync ? 'Setup steps' : 'One-time setup (≈5 min)'}</Text>
          </Pressable>

          {showScript && (
            <View style={{ gap: 10 }}>
              {step(1, 'Create a new Google Sheet (sheets.new) in the Google account you want to use. A computer is easiest for these steps.')}
              {step(2, 'In the sheet, open Extensions → Apps Script. Delete what’s there and paste the script below.')}
              <View style={styles.row}>
                <PressableScale
                  onPress={() => Share.share({ message: SHEETS_SCRIPT, title: 'SpendTrack Apps Script' }).catch(() => {})}
                  style={[styles.smallBtn, { borderColor: t.accent, backgroundColor: t.accentSoft }]}
                >
                  <Feather name="share" size={14} color={t.accent} />
                  <Text style={{ color: t.accent, fontSize: 12, fontWeight: '700' }}>Send script to myself</Text>
                </PressableScale>
                <Text style={{ color: t.textFaint, fontSize: 11, flex: 1 }}>e.g. email it, then copy on a computer</Text>
              </View>
              <ScrollView
                nestedScrollEnabled
                style={[styles.code, { backgroundColor: t.input, borderColor: t.border }]}
                contentContainerStyle={{ padding: 10 }}
              >
                <Text selectable style={{ color: t.textMuted, fontFamily: 'monospace', fontSize: 10 }}>
                  {SHEETS_SCRIPT}
                </Text>
              </ScrollView>
              <Text style={{ color: t.textFaint, fontSize: 11 }}>Long-press the code to select and copy it.</Text>
              {step(3, 'Click Deploy → New deployment → ⚙ Web app. Set “Execute as: Me” and “Who has access: Anyone”, then Deploy.')}
              {step(4, 'Google asks for permission: choose your account → Advanced → Go to (unsafe) → Allow. It’s your own script, so this is expected.')}
              {step(5, 'Copy the Web app URL (ends in /exec) and paste it below.')}
            </View>
          )}

          <Text style={[styles.label, { color: t.textMuted }]}>Web app URL</Text>
          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder="https://script.google.com/macros/s/…/exec"
            placeholderTextColor={t.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={[styles.input, { backgroundColor: t.input, borderColor: url && !isScriptUrl(url) ? t.danger : t.border, color: t.text }]}
          />
          {url.length > 0 && !isScriptUrl(url) && (
            <Text style={{ color: t.danger, fontSize: 11 }}>It should look like https://script.google.com/macros/s/…/exec</Text>
          )}

          {error && (
            <View style={[styles.status, { backgroundColor: t.dangerSoft }]}>
              <Feather name="alert-circle" size={14} color={t.danger} />
              <Text style={{ color: t.danger, fontSize: 12, flex: 1 }}>{error}</Text>
            </View>
          )}

          <PressableScale
            onPress={connect}
            disabled={!isScriptUrl(url) || busy}
            style={[styles.btn, { backgroundColor: t.accent, opacity: isScriptUrl(url) && !busy ? 1 : 0.5 }]}
          >
            {busy ? <ActivityIndicator color="#020617" /> : <Feather name="link" size={16} color="#020617" />}
            <Text style={{ color: '#020617', fontWeight: '700' }}>
              {busy ? 'Connecting…' : sync && sync.url === url.trim() ? 'Reconnect' : 'Connect & sync'}
            </Text>
          </PressableScale>

          {sync && (
            <Pressable onPress={onDisconnect} style={{ alignSelf: 'center', padding: 6 }}>
              <Text style={{ color: t.danger, fontSize: 12, fontWeight: '600' }}>Stop syncing</Text>
            </Pressable>
          )}
        </ScrollView>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, paddingBottom: 32 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12 },
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  step: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  stepNum: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  code: { maxHeight: 170, borderWidth: 1, borderRadius: 10 },
  label: { fontSize: 12, fontWeight: '500', marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 13 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
});
