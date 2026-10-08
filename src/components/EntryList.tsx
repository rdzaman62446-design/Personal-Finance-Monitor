import { Pressable, StyleSheet, Text, View } from 'react-native';

import { categoryIcon, Expense, formatDate, formatTime, isIncome, peso } from '../expenses';
import { logText, useLogFont } from '../fonts';
import { Theme } from '../theme';
import { FadeInView } from './motion';

// Compact list of entries shown under a chart when a column is tapped.
export default function EntryList({
  theme: t,
  title,
  entries,
  onEdit,
  limit = 8,
}: {
  theme: Theme;
  title: string;
  entries: Expense[];
  onEdit: (e: Expense) => void;
  limit?: number;
}) {
  const font = useLogFont();
  const shown = entries.slice(0, limit);
  return (
    <FadeInView from={-8} style={[styles.box, { borderColor: t.border, backgroundColor: t.cardAlt }]}>
      <Text style={{ color: t.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 }}>{title}</Text>
      {shown.length === 0 ? (
        <Text style={{ color: t.textFaint, fontSize: 12, paddingVertical: 6 }}>Nothing here.</Text>
      ) : (
        shown.map((e, i) => (
          <FadeInView key={e.id} delay={i * 30} from={-4}>
            <Pressable onPress={() => onEdit(e)} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}>
              <Text style={{ fontSize: 15 }}>{categoryIcon(e.category)}</Text>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={[logText(font, true, 13), { color: t.text }]}>
                  {e.item}
                </Text>
                <Text style={[logText(font, false, 10), { color: t.textFaint }]}>
                  {formatDate(e.timestamp)} · {formatTime(e.timestamp)}
                </Text>
              </View>
              <Text style={[logText(font, true, 13), { color: isIncome(e) ? t.income : t.accent }]}>
                {isIncome(e) ? '+' : ''}
                {peso(e.amount)}
              </Text>
            </Pressable>
          </FadeInView>
        ))
      )}
      {entries.length > limit && (
        <Text style={{ color: t.textFaint, fontSize: 11 }}>+ {entries.length - limit} more in Table Log</Text>
      )}
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  box: { gap: 6, padding: 12, borderRadius: 14, borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
});
