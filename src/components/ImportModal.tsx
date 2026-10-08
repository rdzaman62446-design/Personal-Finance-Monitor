import { Feather } from '@expo/vector-icons';
import { File } from 'expo-file-system';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { importFromBytes, importFromGoogleSheet, ImportResult } from '../importer';
import { Theme } from '../theme';
import { PressableScale } from './motion';

type Props = {
  theme: Theme;
  visible: boolean;
  onClose: () => void;
  onResult: (result: ImportResult) => void;
};

// Bottom sheet for importing expenses from a Google Sheets link or a spreadsheet file.
export default function ImportModal(props: Props) {
  return (
    <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <Pressable style={styles.backdrop} onPress={props.onClose}>
          {props.visible && <ImportSheet {...props} />}
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ImportSheet({ theme: t, onResult }: Props) {
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState<'link' | 'file' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slide] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(slide, { toValue: 1, duration: 320, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }).start();
  }, [slide]);

  const run = async (source: 'link' | 'file', task: () => Promise<ImportResult | null>) => {
    setBusy(source);
    setError(null);
    try {
      const result = await task();
      if (result) onResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const fromLink = () => run('link', () => importFromGoogleSheet(link));

  const fromFile = () =>
    run('file', async () => {
      const picked = await File.pickFileAsync({
        mimeTypes: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/csv',
          'text/comma-separated-values',
          '*/*',
        ],
      });
      if (picked.canceled) return null;
      const bytes = new Uint8Array(await picked.result.arrayBuffer());
      return importFromBytes(picked.result.name, bytes);
    });

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [500, 0] });
  const linkOk = /docs\.google\.com\/spreadsheets\/d\//.test(link);

  return (
    <Animated.View style={{ transform: [{ translateY }] }}>
      <Pressable style={[styles.sheet, { backgroundColor: t.card, borderColor: t.border }]}>
        <View style={[styles.handle, { backgroundColor: t.border }]} />
        <Text style={{ color: t.text, fontWeight: '700', fontSize: 17 }}>Import expenses</Text>
        <Text style={{ color: t.textMuted, fontSize: 12 }}>
          From a spreadsheet with columns like Date, Time, “What did I spend on” and “How much”. Categories are guessed from
          the description — you can edit them after.
        </Text>

        <Text style={[styles.label, { color: t.textMuted }]}>Google Sheets link</Text>
        <TextInput
          value={link}
          onChangeText={setLink}
          placeholder="https://docs.google.com/spreadsheets/d/…"
          placeholderTextColor={t.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={[styles.input, { backgroundColor: t.input, borderColor: t.border, color: t.text }]}
        />
        <Text style={{ color: t.textFaint, fontSize: 11 }}>The sheet must be shared as “Anyone with the link”.</Text>
        <PressableScale
          onPress={fromLink}
          disabled={!linkOk || busy != null}
          style={[styles.btn, { backgroundColor: t.accent, opacity: linkOk && !busy ? 1 : 0.5 }]}
        >
          {busy === 'link' ? <ActivityIndicator color="#020617" /> : <Feather name="link" size={16} color="#020617" />}
          <Text style={{ color: '#020617', fontWeight: '700' }}>{busy === 'link' ? 'Downloading…' : 'Import from link'}</Text>
        </PressableScale>

        <View style={styles.orRow}>
          <View style={[styles.line, { backgroundColor: t.border }]} />
          <Text style={{ color: t.textFaint, fontSize: 11 }}>OR</Text>
          <View style={[styles.line, { backgroundColor: t.border }]} />
        </View>

        <PressableScale
          onPress={fromFile}
          disabled={busy != null}
          style={[styles.btn, { borderColor: t.border, borderWidth: 1, opacity: busy ? 0.5 : 1 }]}
        >
          {busy === 'file' ? <ActivityIndicator color={t.text} /> : <Feather name="file-text" size={16} color={t.text} />}
          <Text style={{ color: t.text, fontWeight: '600' }}>Choose a file (.xlsx or .csv)</Text>
        </PressableScale>

        {error && (
          <View style={[styles.error, { backgroundColor: t.dangerSoft }]}>
            <Feather name="alert-circle" size={14} color={t.danger} />
            <Text style={{ color: t.danger, fontSize: 12, flex: 1 }}>{error}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, paddingBottom: 32, gap: 8 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 6 },
  label: { fontSize: 12, fontWeight: '500', marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 4,
  },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 6 },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  error: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 10, marginTop: 6 },
});
