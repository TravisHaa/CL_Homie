import { AddButtonIcon } from '@/src/components/AddButtonIcon';
import { HeaderImage } from '@/src/components/HeaderImage';
import { ChoreCard } from '@/src/components/chores/ChoreCard';
import { ChoreDetailSheet } from '@/src/components/chores/ChoreDetailSheet';
import { ChoreForm } from '@/src/components/chores/ChoreForm';
import { ProgressRing } from '@/src/components/chores/ProgressRing';
import { GridBackground } from '@/src/components/GridBackground';
import { useChores } from '@/src/hooks/useChores';
import { CHORE_THEME } from '@/src/theme/chores';
import type { Chore } from '@/src/types';
import { isChoreDueOn } from '@/src/utils/choreSchedule';
import { getDayKey } from '@/src/utils/weekKey';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { format, isToday } from 'date-fns';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DAY_NAME_SHORT = ['Sun', 'Mon', 'Tues', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Compact recurrence/due label rendered inside the trailing pill. Completed
 * chores always show "Completed"; otherwise we surface the most useful piece
 * of cadence info per recurrence shape.
 */
function getStatusLabel(chore: Chore): string {
  if (chore.isCompleted) return 'Completed';
  switch (chore.recurrence) {
    case 'once': {
      if (!chore.dueAt) return 'One-time';
      const d = chore.dueAt.toDate();
      if (isToday(d)) return 'Due Today';
      return `Due ${format(d, 'M/d')}`;
    }
    case 'daily':
      return 'Daily';
    case 'weekly':
      return chore.dayOfWeek != null ? `Every ${DAY_NAME_SHORT[chore.dayOfWeek]}` : 'Weekly';
    case 'monthly':
      return chore.dayOfMonth != null ? `Day ${chore.dayOfMonth}` : 'Monthly';
    case 'custom': {
      const cr = chore.customRecurrence;
      if (!cr) return 'Custom';
      if (cr.unit === 'days') {
        return cr.count === 1 ? 'Daily' : `Every ${cr.count}d`;
      }
      if (cr.daysOfWeek && cr.daysOfWeek.length === 1) {
        return `Every ${DAY_NAME_SHORT[cr.daysOfWeek[0]]}`;
      }
      return cr.count === 1 ? 'Weekly' : `Every ${cr.count}w`;
    }
    default:
      return '';
  }
}

/**
 * Best-effort consecutive-day completion streak. Counts the number of days
 * ending today where at least one chore in the live snapshot carries a
 * `completedAt` on that day. Because the nightly reset clears `completedAt`
 * for the next cycle, this caps at 1 day in practice without a persisted
 * history collection — kept honest rather than fabricated, and easy to
 * upgrade once a `choreCompletions/` log is added.
 */
function computeStreak(chores: Chore[]): number {
  const days = new Set<string>();
  for (const c of chores) {
    if (c.completedAt) days.add(getDayKey(c.completedAt.toDate()));
  }
  let count = 0;
  const cursor = new Date();
  while (days.has(getDayKey(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export default function ChoresScreen() {
  const router = useRouter();
  const { chores, isLoading, addChore, toggleChore, updateChore, deleteChore } = useChores();
  const sheetRef = useRef<BottomSheetModal>(null);
  const detailRef = useRef<BottomSheetModal>(null);
  const [selectedChore, setSelectedChore] = useState<Chore | null>(null);

  const openChoreDetail = (chore: Chore) => {
    setSelectedChore(chore);
    detailRef.current?.present();
  };

  const now = new Date();
  const todo = chores.filter((c) => !c.isCompleted);
  const done = chores.filter((c) => c.isCompleted);
  const total = chores.length;
  const percent = total > 0 ? Math.round((done.length / total) * 100) : 0;

  // Due-today count for the hero stat pill: one-time chores due today plus
  // any recurring chore whose schedule fires today. Already-completed chores
  // don't count — they're not "due" anymore from the user's POV.
  const dueTodayCount = chores.filter((c) => {
    if (c.isCompleted) return false;
    if (c.recurrence === 'once') {
      return !!c.dueAt && isToday(c.dueAt.toDate());
    }
    return isChoreDueOn(c, now);
  }).length;

  const streak = computeStreak(chores);

  return (
    <View style={styles.container}>
      <GridBackground />
      <View style={{ width: '100%', overflow: 'hidden' }}>
        <HeaderImage height={117} pointerEvents="none" />
        <Text style={styles.headerTitle}>Chores</Text>
      </View>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero summary card: title, big progress ring, due-today + streak pills. */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <Text style={styles.heroTitle}>Home Chore Tracker</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open rotation schedule"
              onPress={() => router.push('/rotation')}
              hitSlop={8}
              style={({ pressed }) => [styles.heroRefresh, pressed && { opacity: 0.6 }]}
            >
              <Image
                source={require('@/assets/images/rotation-icon.png')}
                style={styles.heroRefreshIcon}
                resizeMode="contain"
                accessible={false}
              />
            </Pressable>
          </View>

          <View style={styles.ringWrap}>
            <ProgressRing
              size={172}
              stroke={14}
              progress={total > 0 ? done.length / total : 0}
              trackColor={CHORE_THEME.hairline}
              fillColor={CHORE_THEME.accent}
              centerColor="#FFFFFF"
            >
              <Text style={styles.percentText}>{percent}%</Text>
              <Text style={styles.percentLabel}>of chores done</Text>
            </ProgressRing>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <View style={styles.statIconWrap}>
                <Ionicons name="calendar-outline" size={16} color={CHORE_THEME.text} />
              </View>
              <View style={styles.statBody}>
                <Text style={styles.statLabel}>Due Today</Text>
                <Text style={styles.statValue}>
                  {dueTodayCount} {dueTodayCount === 1 ? 'chore' : 'chores'}
                </Text>
              </View>
            </View>
            <View style={styles.statPill}>
              <View style={styles.statIconWrap}>
                <Ionicons name="flame-outline" size={16} color={CHORE_THEME.text} />
              </View>
              <View style={styles.statBody}>
                <Text style={styles.statLabel}>Streak</Text>
                <Text style={styles.statValue}>
                  {streak} day{streak === 1 ? '' : 's'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator style={styles.loader} color={CHORE_THEME.accent} />
        ) : total === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="sparkles-outline" size={28} color={CHORE_THEME.accent} />
            <Text style={styles.emptyTitle}>No chores yet</Text>
            <Text style={styles.emptyBody}>Tap + to add your first one.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>To do ({todo.length})</Text>
            {todo.map((chore) => (
              <ChoreCard
                key={chore.id}
                chore={chore}
                statusLabel={getStatusLabel(chore)}
                onToggle={toggleChore}
                onPress={openChoreDetail}
                onDelete={deleteChore}
              />
            ))}
            {todo.length === 0 && (
              <Text style={styles.sectionInline}>All caught up ✨</Text>
            )}

            {done.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, styles.sectionLabelSecondary]}>
                  Done ({done.length})
                </Text>
                {done.map((chore) => (
                  <ChoreCard
                    key={chore.id}
                    chore={chore}
                    statusLabel="Completed"
                    onToggle={toggleChore}
                    onPress={openChoreDetail}
                    onDelete={deleteChore}
                  />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => sheetRef.current?.present()}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Add chore"
      >
        <AddButtonIcon size={64} />
      </TouchableOpacity>

      <ChoreForm ref={sheetRef} onSubmit={addChore} />
      <ChoreDetailSheet
        ref={detailRef}
        chore={selectedChore}
        onUpdate={updateChore}
        onDelete={deleteChore}
      />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CHORE_THEME.bg,
  },
  headerTitle: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: 'GowunBatang_700Bold',
    fontSize: 22,
    color: '#2E0800',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 96 },

  // ── Hero card ───────────────────────────────────────────────────────────────
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#2E0800',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  // Title sits centered; refresh ornament is absolutely placed top-right so the
  // title stays optically balanced regardless of icon size.
  heroHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    marginBottom: 4,
  },
  heroTitle: {
    fontFamily: 'GowunBatang_700Bold',
    fontSize: 17,
    color: CHORE_THEME.text,
    letterSpacing: -0.2,
  },
  heroRefresh: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 4,
  },
  heroRefreshIcon: {
    width: 22,
    height: 22,
    tintColor: CHORE_THEME.textMuted,
  },
  ringWrap: {
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 14,
  },
  percentText: {
    fontFamily: 'AlbertSans_800ExtraBold',
    fontSize: 28,
    color: CHORE_THEME.text,
  },
  percentLabel: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 11,
    color: CHORE_THEME.textMuted,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: CHORE_THEME.cardBg,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBody: { flex: 1 },
  statLabel: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 10,
    color: CHORE_THEME.textMuted,
    letterSpacing: 0.2,
  },
  statValue: {
    fontFamily: 'AlbertSans_700Bold',
    fontSize: 13,
    color: CHORE_THEME.text,
    marginTop: 1,
  },

  // ── Sections ────────────────────────────────────────────────────────────────
  sectionLabel: {
    fontFamily: 'GowunBatang_700Bold',
    fontSize: 14,
    color: CHORE_THEME.text,
    marginBottom: 10,
    marginLeft: 2,
  },
  sectionLabelSecondary: {
    marginTop: 14,
  },
  sectionInline: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 12,
    color: CHORE_THEME.textMuted,
    paddingVertical: 8,
    marginLeft: 2,
  },

  // ── Empty / loading ─────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    gap: 6,
  },
  emptyTitle: {
    fontFamily: 'AlbertSans_700Bold',
    fontSize: 15,
    color: CHORE_THEME.text,
    marginTop: 6,
  },
  emptyBody: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 13,
    color: CHORE_THEME.textMuted,
  },
  loader: {
    marginTop: 40,
  },

  // ── FAB ─────────────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    bottom: 110,
    right: 20,
  },
});
