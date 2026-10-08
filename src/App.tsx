import { Feather } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import EditModal from './components/EditModal';
import { Expense, isSameDay, toCSV } from './expenses';
import AddScreen from './screens/AddScreen';
import HistoryScreen from './screens/HistoryScreen';
import StatsScreen from './screens/StatsScreen';
import { usePersistentState } from './storage';
import { darkTheme, lightTheme } from './theme';
import { useUpdateCheck, versionLabel } from './updates';

type Tab = 'add' | 'history' | 'stats';

const TABS: { key: Tab; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: 'add', label: 'Add Log', icon: 'plus' },
  { key: 'history', label: 'Table Log', icon: 'list' },
  { key: 'stats', label: 'Stats', icon: 'bar-chart-2' },
];

export default function App() {
  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}

function Main() {
  useUpdateCheck();

  const [expenses, setExpenses] = usePersistentState<Expense[]>('spendtrack.expenses', []);
  const [darkMode, setDarkMode] = usePersistentState('spendtrack.darkMode', true);
  const [tab, setTab] = useState<Tab>('add');
  const [editing, setEditing] = useState<Expense | null>(null);
  const t = darkMode ? darkTheme : lightTheme;

  const totalSpent = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const spentToday = useMemo(() => {
    const now = Date.now();
    return expenses.filter((e) => isSameDay(e.timestamp, now)).reduce((s, e) => s + e.amount, 0);
  }, [expenses]);

  const addExpense = (e: Omit<Expense, 'id' | 'timestamp'>) => {
    const now = Date.now();
    setExpenses((prev) => [{ ...e, id: now.toString(), timestamp: now }, ...prev]);
  };

  const saveEdit = (updated: Expense) => {
    setExpenses((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    setEditing(null);
  };

  const exportCSV = async () => {
    if (expenses.length === 0) {
      Alert.alert('Nothing to export', 'Add an expense first.');
      return;
    }
    try {
      const file = new File(Paths.cache, `Expense_Log_${new Date().toISOString().slice(0, 10)}.csv`);
      file.create({ overwrite: true });
      file.write(toCSV(expenses));
      await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Export expenses' });
    } catch (err) {
      Alert.alert('Export failed', String(err));
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]} edges={['top', 'left', 'right']}>
      <StatusBar style={darkMode ? 'light' : 'dark'} />

      <View style={[styles.header, { backgroundColor: t.card, borderBottomColor: t.border }]}>
        <View style={styles.row}>
          <View style={[styles.logo, { backgroundColor: t.accentSoft }]}>
            <Feather name="credit-card" size={18} color={t.accent} />
          </View>
          <View>
            <Text style={{ color: t.text, fontWeight: '700', fontSize: 17 }}>SpendTrack</Text>
            <Text style={{ color: t.textMuted, fontSize: 10, fontWeight: '500' }}>
              PHP (₱) Quick Logger · {versionLabel()}
            </Text>
          </View>
        </View>
        <View style={styles.row}>
          <Pressable onPress={exportCSV} style={[styles.iconBtn, { borderColor: t.border }]}>
            <Feather name="download" size={16} color={t.textMuted} />
          </Pressable>
          <Pressable onPress={() => setDarkMode(!darkMode)} style={[styles.iconBtn, { borderColor: t.border }]}>
            <Feather name={darkMode ? 'sun' : 'moon'} size={16} color={darkMode ? t.amber : t.textMuted} />
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {tab === 'add' && (
            <AddScreen
              theme={t}
              expenses={expenses}
              spentToday={spentToday}
              totalSpent={totalSpent}
              onAdd={addExpense}
              onViewAll={() => setTab('history')}
            />
          )}
          {tab === 'history' && (
            <HistoryScreen
              theme={t}
              expenses={expenses}
              onEdit={setEditing}
              onDelete={(id) => setExpenses((prev) => prev.filter((e) => e.id !== id))}
            />
          )}
          {tab === 'stats' && (
            <StatsScreen
              theme={t}
              expenses={expenses}
              spentToday={spentToday}
              totalSpent={totalSpent}
              onClear={() => setExpenses([])}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <SafeAreaView edges={['bottom']} style={[styles.nav, { backgroundColor: t.card, borderTopColor: t.border }]}>
        {TABS.map(({ key, label, icon }) => {
          const active = tab === key;
          const color = active ? t.accent : t.textMuted;
          return (
            <Pressable key={key} onPress={() => setTab(key)} style={styles.navBtn}>
              <Feather name={icon} size={20} color={color} />
              <Text style={{ color, fontSize: 11, fontWeight: active ? '700' : '400' }}>{label}</Text>
            </Pressable>
          );
        })}
      </SafeAreaView>

      <EditModal theme={t} expense={editing} onClose={() => setEditing(null)} onSave={saveEdit} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { padding: 8, borderRadius: 12 },
  iconBtn: { padding: 8, borderRadius: 10, borderWidth: 1 },
  content: { padding: 16, paddingBottom: 32, width: '100%', maxWidth: 520, alignSelf: 'center' },
  nav: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, paddingTop: 8 },
  navBtn: { alignItems: 'center', gap: 2, paddingHorizontal: 16, paddingBottom: 6 },
});
