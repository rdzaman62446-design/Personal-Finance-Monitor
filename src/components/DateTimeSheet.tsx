import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { daysInMonth, Month, monthLabel, shiftMonth } from '../expenses';
import { Theme } from '../theme';
import { PressableScale } from './motion';

const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

// Short label for a chosen moment: "Now", "Today, 2:30 PM", "Yesterday, 9:00 AM", "Oct 03, 7:15 PM".
export function whenLabel(ts: number | null) {
  if (ts == null) return 'Now';
  const d = new Date(ts);
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const days = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  const day =
    days === 0
      ? 'Today'
      : days === 1
        ? 'Yesterday'
        : d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', ...(d.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) });
  return `${day}, ${time}`;
}

type Props = {
  theme: Theme;
  visible: boolean;
  // Starting value; null means "now".
  value: number | null;
  onClose: () => void;
  // null = use the moment the entry is saved.
  onPick: (ts: number | null) => void;
};

// Bottom sheet with quick picks, a month calendar and a time field. Future dates are disabled.
export default function DateTimeSheet(props: Props) {
  return (
    <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onClose}>
      <Pressable style={styles.backdrop} onPress={props.onClose}>
        {props.visible && <Sheet {...props} />}
      </Pressable>
    </Modal>
  );
}

function Sheet({ theme: t, value, onPick }: Props) {
  const [initial] = useState(() => new Date(value ?? Date.now()));
  const [now] = useState(() => new Date());
  const [day, setDay] = useState(() => startOfDay(initial));
  const [view, setView] = useState<Month>({ year: initial.getFullYear(), month: initial.getMonth() });
  const [hour, setHour] = useState(String(initial.getHours() % 12 || 12));
  const [minute, setMinute] = useState(String(initial.getMinutes()).padStart(2, '0'));
  const [pm, setPm] = useState(initial.getHours() >= 12);
  const [slide] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(slide, { toValue: 1, duration: 320, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }).start();
  }, [slide]);

  const h = parseInt(hour, 10);
  const m = parseInt(minute, 10);
  const timeOk = h >= 1 && h <= 12 && m >= 0 && m <= 59;
  const picked = (() => {
    const d = new Date(day);
    d.setHours((h % 12) + (pm ? 12 : 0), m, 0, 0);
    return d.getTime();
  })();
  // Compared with when the sheet opened (plus a minute of slack).
  const inFuture = timeOk && picked > now.getTime() + 60000;

  const todayStart = startOfDay(now);
  const quick = (label: string, daysAgo: number) => {
    const ts = todayStart - daysAgo * 86400000;
    const active = day === ts;
    return (
      <PressableScale
        key={label}
        onPress={() => {
          setDay(ts);
          const d = new Date(ts);
          setView({ year: d.getFullYear(), month: d.getMonth() });
        }}
        style={[styles.quick, { borderColor: active ? t.accent : t.border, backgroundColor: active ? t.accentSoft : t.input }]}
      >
        <Text style={{ color: active ? t.accent : t.textMuted, fontSize: 12, fontWeight: '600' }}>{label}</Text>
      </PressableScale>
    );
  };

  // Calendar cells: leading blanks for the weekday the month starts on, then each day.
  const first = new Date(view.year, view.month, 1).getDay();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: daysInMonth(view) }, (_, i) => i + 1)];
  const atCurrentMonth = view.year === now.getFullYear() && view.month === now.getMonth();

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });

  return (
    <Animated.View style={{ transform: [{ translateY }] }}>
      <Pressable style={[styles.sheet, { backgroundColor: t.card, borderColor: t.border }]}>
        <View style={[styles.handle, { backgroundColor: t.border }]} />
        <View style={styles.headerRow}>
          <Text style={{ color: t.text, fontWeight: '700', fontSize: 17 }}>When was it?</Text>
          <Pressable onPress={() => onPick(null)} hitSlop={8}>
            <Text style={{ color: t.accent, fontSize: 13, fontWeight: '700' }}>Use now</Text>
          </Pressable>
        </View>

        <View style={styles.quickRow}>
          {quick('Today', 0)}
          {quick('Yesterday', 1)}
          {quick('2 days ago', 2)}
        </View>

        <View style={styles.monthNav}>
          <Pressable hitSlop={10} onPress={() => setView(shiftMonth(view, -1))}>
            <Feather name="chevron-left" size={20} color={t.text} />
          </Pressable>
          <Text style={{ color: t.text, fontWeight: '700' }}>{monthLabel(view)}</Text>
          <Pressable hitSlop={10} disabled={atCurrentMonth} onPress={() => setView(shiftMonth(view, 1))}>
            <Feather name="chevron-right" size={20} color={atCurrentMonth ? t.border : t.text} />
          </Pressable>
        </View>

        <View style={styles.grid}>
          {WEEK.map((w, i) => (
            <Text key={`w${i}`} style={[styles.cell, { color: t.textFaint, fontSize: 11, fontWeight: '700' }]}>
              {w}
            </Text>
          ))}
          {cells.map((d, i) => {
            if (d == null) return <View key={`b${i}`} style={styles.cell} />;
            const ts = new Date(view.year, view.month, d).getTime();
            const future = ts > todayStart;
            const selected = ts === day;
            const isToday = ts === todayStart;
            return (
              <Pressable key={d} disabled={future} onPress={() => setDay(ts)} style={styles.cell}>
                <View
                  style={[
                    styles.dayDot,
                    selected && { backgroundColor: t.accent },
                    !selected && isToday && { borderWidth: 1, borderColor: t.accent },
                  ]}
                >
                  <Text
                    style={{
                      color: selected ? '#020617' : future ? t.border : t.text,
                      fontSize: 13,
                      fontWeight: selected || isToday ? '800' : '500',
                    }}
                  >
                    {d}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.timeRow}>
          <Feather name="clock" size={16} color={t.textMuted} />
          <TextInput
            value={hour}
            onChangeText={(v) => setHour(v.replace(/[^0-9]/g, '').slice(0, 2))}
            keyboardType="number-pad"
            style={[styles.timeInput, { backgroundColor: t.input, borderColor: timeOk ? t.border : t.danger, color: t.text }]}
          />
          <Text style={{ color: t.text, fontWeight: '800', fontSize: 18 }}>:</Text>
          <TextInput
            value={minute}
            onChangeText={(v) => setMinute(v.replace(/[^0-9]/g, '').slice(0, 2))}
            onBlur={() => timeOk && setMinute(String(m).padStart(2, '0'))}
            keyboardType="number-pad"
            style={[styles.timeInput, { backgroundColor: t.input, borderColor: timeOk ? t.border : t.danger, color: t.text }]}
          />
          <View style={[styles.ampm, { borderColor: t.border, backgroundColor: t.input }]}>
            {(['AM', 'PM'] as const).map((label) => {
              const active = (label === 'PM') === pm;
              return (
                <Pressable key={label} onPress={() => setPm(label === 'PM')} style={[styles.ampmBtn, active && { backgroundColor: t.accent }]}>
                  <Text style={{ color: active ? '#020617' : t.textMuted, fontWeight: '700', fontSize: 12 }}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {inFuture && <Text style={{ color: t.danger, fontSize: 12 }}>That time hasn’t happened yet.</Text>}

        <PressableScale
          onPress={() => onPick(picked)}
          disabled={!timeOk || inFuture}
          style={[styles.done, { backgroundColor: t.accent, opacity: timeOk && !inFuture ? 1 : 0.5 }]}
        >
          <Text style={{ color: '#020617', fontWeight: '700', fontSize: 15 }}>
            {timeOk ? `Set to ${whenLabel(picked)}` : 'Enter a valid time'}
          </Text>
        </PressableScale>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, paddingBottom: 32, gap: 12 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quickRow: { flexDirection: 'row', gap: 8 },
  quick: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', justifyContent: 'center', paddingVertical: 3, textAlign: 'center' },
  dayDot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeInput: { width: 54, textAlign: 'center', borderWidth: 1, borderRadius: 10, paddingVertical: 8, fontSize: 18, fontWeight: '700' },
  ampm: { flexDirection: 'row', marginLeft: 'auto', padding: 3, borderRadius: 10, borderWidth: 1 },
  ampmBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  done: { alignItems: 'center', paddingVertical: 14, borderRadius: 12 },
});

// Tappable "When" row that opens the date & time sheet.
export function WhenField({
  theme: t,
  value,
  onChange,
  allowNow = true,
}: {
  theme: Theme;
  value: number | null;
  onChange: (ts: number | null) => void;
  // When false (e.g. editing a saved entry) "Use now" sets the current time instead of null.
  allowNow?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[fieldStyles.field, { backgroundColor: t.input, borderColor: value == null ? t.border : t.accent }]}
      >
        <Feather name="calendar" size={16} color={value == null ? t.textMuted : t.accent} />
        <Text style={{ flex: 1, color: t.text, fontSize: 14, fontWeight: '600' }}>{whenLabel(value)}</Text>
        <Text style={{ color: t.accent, fontSize: 12, fontWeight: '600' }}>Change</Text>
      </Pressable>
      <DateTimeSheet
        theme={t}
        visible={open}
        value={value}
        onClose={() => setOpen(false)}
        onPick={(ts) => {
          onChange(ts ?? (allowNow ? null : Date.now()));
          setOpen(false);
        }}
      />
    </>
  );
}

const fieldStyles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
});
