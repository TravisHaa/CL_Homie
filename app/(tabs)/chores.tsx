import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

const CHORES = [
  { id: '1', title: 'Take out trash', assignee: 'Travis', color: '#6C5CE7', recurrence: 'Weekly', isCompleted: true },
  { id: '2', title: 'Vacuum living room', assignee: 'Jordan', color: '#00B894', recurrence: 'Weekly', isCompleted: false },
  { id: '3', title: 'Clean bathroom', assignee: 'Casey', color: '#E17055', recurrence: 'Biweekly', isCompleted: false },
  { id: '4', title: 'Wipe down kitchen', assignee: 'Travis', color: '#6C5CE7', recurrence: 'Weekly', isCompleted: false },
  { id: '5', title: 'Mop floors', assignee: 'Jordan', color: '#00B894', recurrence: 'Monthly', isCompleted: true },
  { id: '6', title: 'Clean fridge', assignee: 'Casey', color: '#E17055', recurrence: 'Monthly', isCompleted: false },
];

export default function ChoresScreen() {
  const [completed, setCompleted] = useState<Set<string>>(
    new Set(CHORES.filter((c) => c.isCompleted).map((c) => c.id))
  );

  const toggle = (id: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const done = CHORES.filter((c) => completed.has(c.id)).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Chores</Text>
        <Text style={styles.subtitle}>{done}/{CHORES.length} done this week</Text>

        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(done / CHORES.length) * 100}%` }]} />
        </View>

        <Text style={styles.sectionLabel}>THIS WEEK</Text>
        {CHORES.map((chore) => {
          const isDone = completed.has(chore.id);
          return (
            <TouchableOpacity key={chore.id} style={styles.card} onPress={() => toggle(chore.id)} activeOpacity={0.7}>
              <View style={[styles.checkbox, isDone && styles.checkboxDone]}>
                {isDone && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <View style={styles.cardBody}>
                <Text style={[styles.cardTitle, isDone && styles.cardTitleDone]}>{chore.title}</Text>
                <Text style={styles.cardMeta}>{chore.recurrence}</Text>
              </View>
              <View style={[styles.assigneeBadge, { backgroundColor: chore.color + '22' }]}>
                <View style={[styles.dot, { backgroundColor: chore.color }]} />
                <Text style={[styles.assigneeText, { color: chore.color }]}>{chore.assignee}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFBF5' },
  container: { flex: 1, padding: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#2D3436' },
  subtitle: { color: '#636e72', marginTop: 4, marginBottom: 12 },
  progressBar: { height: 6, backgroundColor: '#DFE6E9', borderRadius: 3, marginBottom: 24 },
  progressFill: { height: 6, backgroundColor: '#6C5CE7', borderRadius: 3 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#B2BEC3', letterSpacing: 1, marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#DFE6E9', alignItems: 'center', justifyContent: 'center' },
  checkboxDone: { backgroundColor: '#6C5CE7', borderColor: '#6C5CE7' },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#2D3436' },
  cardTitleDone: { textDecorationLine: 'line-through', color: '#B2BEC3' },
  cardMeta: { fontSize: 12, color: '#636e72', marginTop: 2 },
  assigneeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  assigneeText: { fontSize: 12, fontWeight: '600' },
});
