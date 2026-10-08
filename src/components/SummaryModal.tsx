import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { categoryColor, categoryIcon, Expense, Month, monthLabel, peso } from '../expenses';
import { summarize, summaryText } from '../summary';
import { Theme } from '../theme';
import { FadeInView, PressableScale } from './motion';

// Shareable month-end report card.
export default function SummaryModal({
  theme,
  visible,
  month,
  expenses,
  onClose,
}: {
  theme: Theme;
  visible: boolean;
  month: Month;
  expenses: Expense[];
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {visible && <Card theme={theme} month={month} expenses={expenses} onClose={onClose} />}
      </Pressable>
    </Modal>
  );
}

function Card({ theme: t, month, expenses, onClose }: { theme: Theme; month: Month; expenses: Expense[]; onClose: () => void }) {
  const [now] = useState(() => Date.now());
  const s = useMemo(() => summarize(expenses, month, now), [expenses, month, now]);
  const [pop] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 8 }).start();
  }, [pop]);

  const share = () => Share.share({ message: summaryText(s) }).catch(() => {});

  const big = (label: string, value: string, color: string) => (
    <View style={{ flex: 1 }}>
      <Text style={{ color: t.textMuted, fontSize: 11 }}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ color, fontSize: 20, fontWeight: '800' }}>
        {value}
      </Text>
    </View>
  );

  return (
    <Animated.View
      style={{
        opacity: pop,
        transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
        maxHeight: '90%',
      }}
    >
      <Pressable style={[styles.card, { backgroundColor: t.card, borderColor: t.accent }]}>
        <ScrollView contentContainerStyle={{ gap: 14 }}>
          <View style={styles.headerRow}>
            <View>
              <Text style={{ color: t.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 }}>MONTH IN REVIEW</Text>
              <Text style={{ color: t.text, fontSize: 22, fontWeight: '800' }}>{monthLabel(month)}</Text>
              {s.isCurrent && <Text style={{ color: t.textFaint, fontSize: 11 }}>So far this month</Text>}
            </View>
            <Pressable hitSlop={10} onPress={onClose}>
              <Feather name="x" size={20} color={t.textMuted} />
            </Pressable>
          </View>

          {s.count === 0 ? (
            <Text style={{ color: t.textMuted, textAlign: 'center', paddingVertical: 24 }}>Nothing logged in {monthLabel(month)}.</Text>
          ) : (
            <>
              <FadeInView delay={80}>
                <View style={styles.bigRow}>
                  {big('Spent', peso(s.spent), t.accent)}
                  {s.income > 0 && big('Income', peso(s.income), t.income)}
                </View>
              </FadeInView>
              {s.income > 0 && (
                <FadeInView delay={140}>
                  <View style={[styles.savedPill, { backgroundColor: s.saved >= 0 ? t.accentSoft : t.dangerSoft }]}>
                    <Text style={{ color: s.saved >= 0 ? t.accent : t.danger, fontWeight: '800', fontSize: 15 }}>
                      {s.saved >= 0 ? '🏦 Saved ' : '⚠️ Overspent '}
                      {peso(Math.abs(s.saved))}
                      {s.rate != null && s.saved >= 0 ? ` · ${s.rate.toFixed(0)}% of income` : ''}
                    </Text>
                  </View>
                </FadeInView>
              )}

              <FadeInView delay={200}>
                <View style={styles.factRow}>
                  <Fact theme={t} label="Daily average" value={peso(s.dailyAvg)} />
                  <Fact theme={t} label="Entries" value={String(s.count)} />
                  <Fact
                    theme={t}
                    label="vs last month"
                    value={s.change == null ? '—' : `${s.change > 0 ? '▲' : '▼'} ${Math.abs(s.change).toFixed(0)}%`}
                    color={s.change == null ? t.textMuted : s.change > 0 ? t.danger : t.accent}
                  />
                </View>
              </FadeInView>

              {s.top.length > 0 && (
                <FadeInView delay={260} style={{ gap: 8 }}>
                  <Text style={{ color: t.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>TOP CATEGORIES</Text>
                  {s.top.map((c, i) => (
                    <View key={c.name} style={styles.topRow}>
                      <Text style={{ color: t.textFaint, fontWeight: '800', width: 16 }}>{i + 1}</Text>
                      <View style={[styles.dot, { backgroundColor: categoryColor(c.name) }]} />
                      <Text numberOfLines={1} style={{ flex: 1, color: t.text, fontSize: 13 }}>
                        {categoryIcon(c.name)} {c.name}
                      </Text>
                      <Text style={{ color: t.text, fontWeight: '700', fontSize: 13 }}>{peso(c.total)}</Text>
                      <Text style={{ color: t.textFaint, fontSize: 11, width: 36, textAlign: 'right' }}>{c.share.toFixed(0)}%</Text>
                    </View>
                  ))}
                </FadeInView>
              )}

              <FadeInView delay={320} style={{ gap: 6 }}>
                {s.biggest && (
                  <Text style={{ color: t.textMuted, fontSize: 12 }}>
                    💥 Biggest: <Text style={{ color: t.text, fontWeight: '700' }}>{s.biggest.item}</Text> · {peso(s.biggest.amount)}
                  </Text>
                )}
                {s.busiest && (
                  <Text style={{ color: t.textMuted, fontSize: 12 }}>
                    🔥 Busiest day:{' '}
                    <Text style={{ color: t.text, fontWeight: '700' }}>
                      {new Date(month.year, month.month, s.busiest.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>{' '}
                    · {peso(s.busiest.total)}
                  </Text>
                )}
              </FadeInView>
            </>
          )}

          <PressableScale onPress={share} disabled={s.count === 0} style={[styles.share, { backgroundColor: t.accent, opacity: s.count ? 1 : 0.5 }]}>
            <Feather name="share-2" size={16} color="#020617" />
            <Text style={{ color: '#020617', fontWeight: '700' }}>Share summary</Text>
          </PressableScale>
        </ScrollView>
      </Pressable>
    </Animated.View>
  );
}

function Fact({ theme: t, label, value, color }: { theme: Theme; label: string; value: string; color?: string }) {
  return (
    <View style={[styles.fact, { backgroundColor: t.cardAlt, borderColor: t.border }]}>
      <Text style={{ color: t.textFaint, fontSize: 10 }}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: color ?? t.text, fontWeight: '800', fontSize: 14 }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 16 },
  card: { borderRadius: 24, borderWidth: 1.5, padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bigRow: { flexDirection: 'row', gap: 16 },
  savedPill: { borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center' },
  factRow: { flexDirection: 'row', gap: 8 },
  fact: { flex: 1, padding: 10, borderRadius: 12, borderWidth: 1, gap: 2 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  share: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
});
