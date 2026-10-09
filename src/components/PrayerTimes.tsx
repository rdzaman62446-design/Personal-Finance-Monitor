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
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { clock, defaultsFor, locateByIp, METHODS, PrayerSettings, prayerNow, untilText } from '../prayer';
import { Theme } from '../theme';
import { PressableScale } from './motion';

// Between sunrise and Dhuhr there's no obligatory prayer; Duha is prayed then.
const nowLabel = (key: string, label: string) => (key === 'sunrise' ? 'Duha' : label);

// Re-renders every 30 seconds so the current prayer and countdown stay fresh.
function useMinuteTick() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// Compact header chip: current prayer and a countdown to the next one.
export function PrayerChip({ theme: t, settings, onPress }: { theme: Theme; settings: PrayerSettings | null; onPress: () => void }) {
  const now = useMinuteTick();
  if (!settings) {
    return (
      <Pressable onPress={onPress} hitSlop={8} style={[styles.chip, { borderColor: t.border }]}>
        <Text style={{ fontSize: 13 }}>🕌</Text>
        <Text style={{ color: t.textMuted, fontSize: 11, fontWeight: '600' }}>Prayer times</Text>
      </Pressable>
    );
  }
  const { current, next } = prayerNow(settings, now);
  const soon = next.time - now < 15 * 60000;
  return (
    <Pressable onPress={onPress} hitSlop={8} style={[styles.chip, { borderColor: soon ? t.amber : t.border, backgroundColor: soon ? 'rgba(251,191,36,0.12)' : 'transparent' }]}>
      <Text style={{ fontSize: 14 }}>🕌</Text>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ color: t.text, fontSize: 12, fontWeight: '800' }}>{nowLabel(current.key, current.label)}</Text>
        <Text style={{ color: soon ? t.amber : t.textMuted, fontSize: 9, fontWeight: '600' }}>
          {next.label} in {untilText(next.time - now)}
        </Text>
      </View>
    </Pressable>
  );
}

type SheetProps = {
  theme: Theme;
  visible: boolean;
  settings: PrayerSettings | null;
  showInHeader: boolean;
  onClose: () => void;
  onChange: (s: PrayerSettings) => void;
  onToggleHeader: (show: boolean) => void;
};

// Today's prayer times, location and calculation settings.
export function PrayerSheet(props: SheetProps) {
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

function Sheet({ theme: t, settings, showInHeader, onChange, onToggleHeader }: SheetProps) {
  const now = useMinuteTick();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [lat, setLat] = useState(settings ? String(settings.lat) : '');
  const [lng, setLng] = useState(settings ? String(settings.lng) : '');
  const [methodsOpen, setMethodsOpen] = useState(false);
  const [slide] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(slide, { toValue: 1, duration: 320, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }).start();
  }, [slide]);

  const detect = async () => {
    setBusy(true);
    setError(null);
    try {
      const loc = await locateByIp();
      // Keep the user's chosen method/Asr if they already set them.
      onChange({ ...loc, ...(settings ? { method: settings.method, hanafi: settings.hanafi } : defaultsFor(loc.countryCode)) });
      setLat(String(loc.lat));
      setLng(String(loc.lng));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const saveManual = () => {
    const la = parseFloat(lat);
    const ln = parseFloat(lng);
    if (!(Math.abs(la) <= 90 && Math.abs(ln) <= 180)) {
      setError('Latitude must be between -90 and 90, longitude between -180 and 180.');
      return;
    }
    setError(null);
    onChange({
      lat: la,
      lng: ln,
      place: `${la.toFixed(3)}, ${ln.toFixed(3)}`,
      countryCode: settings?.countryCode ?? '',
      method: settings?.method ?? 'MuslimWorldLeague',
      hanafi: settings?.hanafi ?? false,
    });
    setManual(false);
  };

  const info = settings ? prayerNow(settings, now) : null;
  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [700, 0] });
  const inputStyle = [styles.input, { backgroundColor: t.input, borderColor: t.border, color: t.text }];

  return (
    <Animated.View style={{ transform: [{ translateY }], maxHeight: '92%' }}>
      <Pressable style={[styles.sheet, { backgroundColor: t.card, borderColor: t.border }]}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 10 }}>
          <View style={[styles.handle, { backgroundColor: t.border }]} />
          <Text style={{ color: t.text, fontWeight: '700', fontSize: 17 }}>🕌 Prayer times</Text>

          {info && settings ? (
            <>
              <Text style={{ color: t.textMuted, fontSize: 12 }}>
                {new Date(now).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · {settings.place}
              </Text>
              <View style={[styles.table, { borderColor: t.border }]}>
                {info.times.map((p) => {
                  const active = p.key === info.current.key && (p.time <= now);
                  const upcoming = p.key === info.next.key && p.time === info.next.time;
                  return (
                    <View
                      key={p.key}
                      style={[styles.timeRow, { borderBottomColor: t.border, backgroundColor: active ? t.accentSoft : 'transparent' }]}
                    >
                      <Text style={{ flex: 1, color: p.key === 'sunrise' ? t.textMuted : t.text, fontSize: 15, fontWeight: active ? '800' : '500' }}>
                        {p.label}
                        {active ? '  · now' : ''}
                      </Text>
                      {upcoming && <Text style={{ color: t.amber, fontSize: 11, marginRight: 8 }}>in {untilText(p.time - now)}</Text>}
                      <Text style={{ color: active ? t.accent : t.text, fontSize: 15, fontWeight: '700' }}>{clock(p.time)}</Text>
                    </View>
                  );
                })}
              </View>
              {info.next.key === 'fajr' && info.next.time > info.times[0].time && (
                <Text style={{ color: t.textFaint, fontSize: 11 }}>Next Fajr tomorrow at {clock(info.next.time)}</Text>
              )}
            </>
          ) : (
            <Text style={{ color: t.textMuted, fontSize: 13 }}>
              Detect your location once and prayer times are calculated on your phone — no internet needed after that.
            </Text>
          )}

          <View style={styles.row}>
            <PressableScale onPress={detect} disabled={busy} style={[styles.btn, { backgroundColor: t.accent, flex: 1 }]}>
              {busy ? <ActivityIndicator color="#020617" /> : <Feather name="map-pin" size={15} color="#020617" />}
              <Text style={{ color: '#020617', fontWeight: '700' }}>{settings ? 'Update location' : 'Detect my location'}</Text>
            </PressableScale>
            <PressableScale onPress={() => setManual(!manual)} style={[styles.btn, { borderColor: t.border, borderWidth: 1 }]}>
              <Feather name="edit-2" size={15} color={t.text} />
              <Text style={{ color: t.text, fontWeight: '600' }}>Manual</Text>
            </PressableScale>
          </View>
          <Text style={{ color: t.textFaint, fontSize: 11 }}>
            Location is estimated from your internet connection (city level). For exact times, enter coordinates from Google Maps
            (long-press your spot → copy the numbers).
          </Text>

          {manual && (
            <View style={{ gap: 8 }}>
              <View style={styles.row}>
                <TextInput value={lat} onChangeText={setLat} placeholder="Latitude e.g. 14.5995" placeholderTextColor={t.textFaint} keyboardType="numbers-and-punctuation" style={[inputStyle, { flex: 1 }]} />
                <TextInput value={lng} onChangeText={setLng} placeholder="Longitude e.g. 120.9842" placeholderTextColor={t.textFaint} keyboardType="numbers-and-punctuation" style={[inputStyle, { flex: 1 }]} />
              </View>
              <PressableScale onPress={saveManual} style={[styles.btn, { backgroundColor: t.accent }]}>
                <Text style={{ color: '#020617', fontWeight: '700' }}>Use these coordinates</Text>
              </PressableScale>
            </View>
          )}

          {error && <Text style={{ color: t.danger, fontSize: 12 }}>{error}</Text>}

          {settings && (
            <>
              <Text style={[styles.label, { color: t.textMuted }]}>Calculation method</Text>
              <Pressable onPress={() => setMethodsOpen(!methodsOpen)} style={[styles.select, { borderColor: methodsOpen ? t.accent : t.border, backgroundColor: t.input }]}>
                <Text style={{ flex: 1, color: t.text, fontSize: 13 }}>{METHODS.find((m) => m.key === settings.method)?.label}</Text>
                <Feather name={methodsOpen ? 'chevron-up' : 'chevron-down'} size={16} color={t.textMuted} />
              </Pressable>
              {methodsOpen &&
                METHODS.map((m) => (
                  <Pressable
                    key={m.key}
                    onPress={() => {
                      onChange({ ...settings, method: m.key });
                      setMethodsOpen(false);
                    }}
                    style={[styles.option, { backgroundColor: m.key === settings.method ? t.accentSoft : 'transparent' }]}
                  >
                    <Text style={{ flex: 1, color: m.key === settings.method ? t.accent : t.text, fontSize: 13 }}>{m.label}</Text>
                    {m.key === settings.method && <Feather name="check" size={14} color={t.accent} />}
                  </Pressable>
                ))}

              <Text style={[styles.label, { color: t.textMuted }]}>Asr time</Text>
              <View style={[styles.segments, { borderColor: t.border, backgroundColor: t.input }]}>
                {[false, true].map((h) => (
                  <Pressable key={String(h)} onPress={() => onChange({ ...settings, hanafi: h })} style={[styles.segment, settings.hanafi === h && { backgroundColor: t.accent }]}>
                    <Text style={{ color: settings.hanafi === h ? '#020617' : t.textMuted, fontWeight: '700', fontSize: 12 }}>
                      {h ? 'Hanafi (later)' : 'Standard (Shafi‘i)'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={[styles.row, { marginTop: 6 }]}>
                <Text style={{ flex: 1, color: t.text, fontSize: 13 }}>Show in the top bar</Text>
                <Switch value={showInHeader} onValueChange={onToggleHeader} trackColor={{ true: t.accent, false: t.border }} thumbColor="#fff" />
              </View>
            </>
          )}
        </ScrollView>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, paddingBottom: 32 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2 },
  table: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  timeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13 },
  label: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  select: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11 },
  option: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8 },
  segments: { flexDirection: 'row', padding: 4, borderRadius: 12, borderWidth: 1 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 9 },
});
