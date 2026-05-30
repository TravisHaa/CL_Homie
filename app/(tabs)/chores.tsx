import { ChoreDetailSheet } from '@/src/components/chores/ChoreDetailSheet';
import { ChoreForm } from '@/src/components/chores/ChoreForm';
import { Avatar } from '@/src/components/ui';
import { useChores } from '@/src/hooks/useChores';
import { useHouseStore } from '@/src/store/houseStore';
import { isChoreDueOn } from '@/src/utils/choreSchedule';
import { PALETTE, FONTS, RADIUS, SPACING, TYPE } from '@/src/theme/palette';
import type { Chore } from '@/src/types';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { format } from 'date-fns';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function choreIcon(title: string): MCIName {
  const t = title.toLowerCase();
  if (/(couch|sofa|living)/.test(t)) return 'sofa-outline';
  if (/(plant|water|garden|sprout)/.test(t)) return 'sprout-outline';
  if (/(dish|kitchen|cook)/.test(t)) return 'silverware-fork-knife';
  if (/(trash|garbage|bin)/.test(t)) return 'trash-can-outline';
  if (/(shower|bath|toilet)/.test(t)) return 'shower';
  return 'broom';
}

function recurrenceLabel(c: Chore): string {
  switch (c.recurrence) {
    case 'once':
      return c.dueAt ? `Due ${format(c.dueAt.toDate(), 'M/d')}` : 'One-time';
    case 'daily':
      return 'Daily';
    case 'weekly':
      return c.dayOfWeek != null
        ? `Every ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][c.dayOfWeek]}`
        : 'Weekly';
    case 'monthly':
      return c.dayOfMonth ? `Monthly · ${c.dayOfMonth}` : 'Monthly';
    case 'custom':
      return c.customRecurrence ? `Every ${c.customRecurrence.count} ${c.customRecurrence.unit}` : 'Custom';
    default:
      return '';
  }
}

// Streak = consecutive days back from today where any chore was completed.
function calcStreak(chores: Chore[]): number {
  const days = new Set<string>();
  for (const c of chores) {
    if (c.completedAt) days.add(format(c.completedAt.toDate(), 'yyyy-MM-dd'));
  }
  let n = 0;
  const cursor = new Date();
  while (days.has(format(cursor, 'yyyy-MM-dd'))) {
    n += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return n;
}

function ProgressRing({ pct }: { pct: number }) {
  const size = 200;
  const stroke = 22;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={PALETTE.sand} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={PALETTE.teal}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={styles.ringPct}>{Math.round(pct * 100)}%</Text>
      <Text style={styles.ringLabel}>of chores done</Text>
    </View>
  );
}

function StatPill({ icon, label, value }: { icon: MCIName; label: string; value: string }) {
  return (
    <View style={styles.statPill}>
      <MaterialCommunityIcons name={icon} size={18} color={PALETTE.ink} />
      <View style={{ flex: 1 }}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function ChoresScreen() {
  const { chores, addChore, toggleChore, updateChore, deleteChore } = useChores();
  const memberMap = useHouseStore((s) => s.memberMap);
  const sheetRef = useRef<BottomSheetModal>(null);
  const detailRef = useRef<BottomSheetModal>(null);
  const [selected, setSelected] = useState<Chore | null>(null);

  const openDetail = (c: Chore) => {
    setSelected(c);
    detailRef.current?.present();
  };

  const todo = chores.filter((c) => !c.isCompleted);
  const done = chores.filter((c) => c.isCompleted);
  const pct = chores.length ? done.length / chores.length : 0;
  const today = new Date();
  const dueToday = todo.filter((c) => isChoreDueOn(c, today)).length;
  const streak = calcStreak(chores);

  const renderCard = (c: Chore, completed: boolean) => {
    const m = memberMap[c.assignedTo];
    return (
      <Pressable key={c.id} style={[styles.card, completed && styles.cardDone]} onPress={() => openDetail(c)}>
        <Pressable hitSlop={8} onPress={() => toggleChore(c.id, c.isCompleted)} style={styles.cardIcon}>
          <MaterialCommunityIcons name={choreIcon(c.title)} size={20} color={completed ? PALETTE.inkFaint : PALETTE.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, completed && styles.cardTitleDone]} numberOfLines={1}>{c.title}</Text>
          <View style={styles.assignRow}>
            <Avatar name={m?.displayName} uri={m?.avatarUrl} color={m?.color} size={18} />
            <Text style={styles.assignText}>Assigned to {m?.displayName ?? '—'}</Text>
          </View>
        </View>
        <View style={[styles.recPill, completed && styles.donePill]}>
          <Text style={styles.recPillText}>
            {completed ? 'Completed' : recurrenceLabel(c)}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Tracker card — Figma 2694:28099 */}
        <View style={styles.tracker}>
          <View style={styles.trackerHead}>
            <Text style={styles.trackerTitle}>Home Chore Tracker</Text>
            <MaterialCommunityIcons name="restart" size={20} color={PALETTE.ink} style={styles.trackerReset} />
          </View>
          <ProgressRing pct={pct} />
          <View style={styles.stats}>
            <StatPill icon="calendar-today" label="Due Today" value={`${dueToday} chore${dueToday === 1 ? '' : 's'}`} />
            <StatPill icon="fire" label="Streak" value={`${streak} day streak`} />
          </View>
        </View>

        {/* To Do */}
        <Text style={styles.section}>To Do ({todo.length})</Text>
        {todo.length === 0 ? <Text style={styles.empty}>Nothing to do — nice ✓</Text> : todo.map((c) => renderCard(c, false))}

        {/* Done */}
        {done.length > 0 ? (
          <>
            <Text style={styles.section}>Done ({done.length})</Text>
            {done.map((c) => renderCard(c, true))}
          </>
        ) : null}
      </ScrollView>

      <Pressable accessibilityLabel="Add chore" style={styles.fab} onPress={() => sheetRef.current?.present()}>
        <Ionicons name="add" size={28} color={PALETTE.ink} />
      </Pressable>

      <ChoreForm ref={sheetRef} onSubmit={addChore} />
      <ChoreDetailSheet ref={detailRef} chore={selected} onUpdate={updateChore} onDelete={deleteChore} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PALETTE.cream },
  scroll: { padding: SPACING.base, gap: SPACING.md, paddingBottom: 96 },

  tracker: {
    backgroundColor: PALETTE.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.base,
    shadowColor: '#403021',
    shadowOpacity: 0.17,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  // Figma 2694:28134: Gowun Batang Bold 18 (not 24)
  trackerHead: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', justifyContent: 'space-between' },
  trackerTitle: { fontFamily: FONTS.display, fontSize: 18, color: PALETTE.ink, lineHeight: 22 },
  trackerReset: { marginLeft: 8 },
  ringPct: { fontFamily: FONTS.display, fontSize: 44, color: PALETTE.ink },
  ringLabel: { ...TYPE.small, color: PALETTE.inkMuted },
  stats: { flexDirection: 'row', gap: SPACING.md, alignSelf: 'stretch' },
  // Figma 2694:28139: pill bg sand, h 57.285, rounded 21.375
  statPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: PALETTE.sand,
    borderRadius: 22,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  statLabel: { ...TYPE.small, color: PALETTE.inkMuted },
  statValue: { ...TYPE.label, color: PALETTE.ink },

  section: { ...TYPE.heading, color: PALETTE.ink, marginTop: SPACING.sm },
  empty: { ...TYPE.small, color: PALETTE.inkMuted },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: PALETTE.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    shadowColor: '#403021',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  cardDone: { backgroundColor: PALETTE.sand },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    backgroundColor: PALETTE.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { ...TYPE.bodyMedium, color: PALETTE.ink },
  cardTitleDone: { color: PALETTE.inkFaint, textDecorationLine: 'line-through' },
  assignRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  assignText: { ...TYPE.small, color: PALETTE.inkMuted },
  // Figma 2694:28099: pill bg teal, text white, h 22.88, rounded 16.04, font Albert Sans Medium 12.48
  recPill: { backgroundColor: PALETTE.teal, borderRadius: 16, paddingVertical: 4, paddingHorizontal: 9, minWidth: 80, alignItems: 'center' },
  recPillText: { fontFamily: FONTS.bodyMedium, fontSize: 12, color: PALETTE.onAction },
  donePill: { backgroundColor: PALETTE.ink },

  fab: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: RADIUS.pill,
    backgroundColor: PALETTE.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#403021',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
});
