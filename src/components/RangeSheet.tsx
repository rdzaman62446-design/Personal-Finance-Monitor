import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { daysInMonth, Month, monthLabel, shiftMonth } from '../expenses';
import { Theme } from '../theme';
import { PressableScale } from './motion';

const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const dayStart = (ms: number) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};
const fmt = (ms: number) => new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

type Props = {
  theme: Theme;
  visible: boolean;
  // Current range as [start of first day, start of the day after the last day).
  value: [number, number] | null;
  onClose: () => void;
  onPick: (range: [number, number]) => void;
};

// Calendar for choosing a date range: tap the first day, then the last day.
export default function RangeSheet(props: Props) {
  return (
    <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onClose}>
      <Pressable style={styles.backdrop} onPress={props.onClose}>
        {props.visible && <Sheet {...props} />}
      </Pressable>
    </Modal>
  );
}

function Sheet({ theme: t, value, onPick }: Props) {
  const [today] = useState(() => dayStart(Date.now()));
  const [from, setFrom] = useState<number | null>(value ? value[0] : null);
  // Inclusive last day.
  const [to, setTo] = useState<number | null>(value ? dayStart(value[1] - 1) : null);
  const [view, setView] = useState<Month>(() => {
    const d = new Date(value ? value[0] : today);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [slide] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(slide, { toValue: 1, duration: 320, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }).start();
  }, [slide]);

  // First tap sets the start; second tap sets the end (swapping if it's earlier); a third starts over.
  const tap = (ts: number) => {
    if (from == null || to != null) {
      setFrom(ts);
      setTo(null);
    } else if (ts < from) {
      setTo(from);
      setFrom(ts);
    } else {
      setTo(ts);
    }
  };

  const first = new Date(view.year, view.month, 1).getDay();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: daysInMonth(view) }, (_, i) => i + 1)];
  const now = new Date(today);
  const atCurrentMonth = view.year === now.getFullYear() && view.month === now.getMonth();
  const end = to ?? from;
  const days = from != null && end != null ? Math.round((end - from) / 86400000) + 1 : 0;
  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });

  return (
    <Animated.View style={{ transform: [{ translateY }] }}>
      <Pressable style={[styles.sheet, { backgroundColor: t.card, borderColor: t.border }]}>
        <View style={[styles.handle, { backgroundColor: t.border }]} />
        <Text style={{ color: t.text, fontWeight: '700', fontSize: 17 }}>Custom range</Text>
        <Text style={{ color: t.textMuted, fontSize: 12 }}>
          {from == null ? 'Tap the first day.' : to == null ? 'Now tap the last day (or Apply for just this day).' : 'Tap a day to start over.'}
        </Text>

        <View style={[styles.summary, { backgroundColor: t.cardAlt, borderColor: t.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.textFaint, fontSize: 10 }}>FROM</Text>
            <Text style={{ color: from ? t.text : t.textFaint, fontWeight: '700' }}>{from ? fmt(from) : '—'}</Text>
          </View>
          <Feather name="arrow-right" size={16} color={t.textFaint} />
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={{ color: t.textFaint, fontSize: 10 }}>TO</Text>
            <Text style={{ color: end ? t.text : t.textFaint, fontWeight: '700' }}>{end ? fmt(end) : '—'}</Text>
          </View>
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
            <Text key={`w${i}`} style={[styles.cell, { color: t.textFaint, fontSize: 11, fontWeight: '700', textAlign: 'center' }]}>
              {w}
            </Text>
          ))}
          {cells.map((d, i) => {
            if (d == null) return <View key={`b${i}`} style={styles.cell} />;
            const ts = new Date(view.year, view.month, d).getTime();
            const future = ts > today;
            const isEdge = ts === from || ts === end;
            const inside = from != null && end != null && ts > from && ts < end;
            return (
              <Pressable key={d} disabled={future} onPress={() => tap(ts)} style={styles.cell}>
                {/* Band behind days inside the range. */}
                {(inside || (isEdge && from !== end)) && (
                  <View
                    style={[
                      styles.band,
                      { backgroundColor: t.accentSoft },
                      ts === from && { left: '50%' },
                      ts === end && { right: '50%' },
                    ]}
                  />
                )}
                <View style={[styles.dayDot, isEdge && { backgroundColor: t.accent }, !isEdge && ts === today && { borderWidth: 1, borderColor: t.accent }]}>
                  <Text style={{ color: isEdge ? '#020617' : future ? t.border : inside ? t.accent : t.text, fontSize: 13, fontWeight: isEdge || inside ? '800' : '500' }}>
                    {d}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <PressableScale
          onPress={() => from != null && end != null && onPick([from, end + 86400000])}
          disabled={from == null}
          style={[styles.done, { backgroundColor: t.accent, opacity: from != null ? 1 : 0.5 }]}
        >
          <Text style={{ color: '#020617', fontWeight: '700', fontSize: 15 }}>
            {from == null ? 'Pick a start day' : `Apply · ${days} day${days === 1 ? '' : 's'}`}
          </Text>
        </PressableScale>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, paddingBottom: 32, gap: 10 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', justifyContent: 'center', paddingVertical: 3 },
  band: { position: 'absolute', left: 0, right: 0, top: 3, bottom: 3 },
  dayDot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  done: { alignItems: 'center', paddingVertical: 14, borderRadius: 12 },
});
