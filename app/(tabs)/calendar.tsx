import { EventForm } from '@/src/components/calendar/EventForm';
import { Avatar } from '@/src/components/ui';
import { useCalendarEvents } from '@/src/hooks/useCalendarEvents';
import { useChores } from '@/src/hooks/useChores';
import { useHouseStore } from '@/src/store/houseStore';
import { isChoreDueOn } from '@/src/utils/choreSchedule';
import { FONTS, PALETTE, RADIUS, SPACING, TYPE } from '@/src/theme/palette';
import type { CalendarEvent } from '@/src/types';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { addDays, addMonths, endOfMonth, format, isSameDay, startOfMonth, startOfWeek } from 'date-fns';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function CalendarScreen() {
  const { events, addEvent, updateEvent } = useCalendarEvents();
  const { chores } = useChores();
  const memberMap = useHouseStore((s) => s.memberMap);
  const formRef = useRef<BottomSheetModal>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [mode, setMode] = useState<'week' | 'month'>('month');
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState(new Date());

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(mode === 'week' ? selected : monthStart, { weekStartsOn: 0 });
  const weeks = mode === 'week' ? 1 : 6;
  const gridDays = Array.from({ length: weeks * 7 }, (_, i) => addDays(gridStart, i));

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((e) => {
      const k = format(e.startTime.toDate(), 'yyyy-MM-dd');
      (map.get(k) ?? map.set(k, []).get(k)!).push(e);
    });
    return map;
  }, [events]);

  const dayEvents = events
    .filter((e) => isSameDay(e.startTime.toDate(), selected))
    .sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis());
  const dayChores = chores.filter((c) => !c.isCompleted && isChoreDueOn(c, selected));
  const doneToday = chores.filter(
    (c) => c.isCompleted && c.completedAt && isSameDay(c.completedAt.toDate(), selected),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={styles.title}>Your Calendar</Text>
        <Text style={styles.subtitle}>Check out your plans for the week</Text>

        {/* Month nav + Week/Month toggle */}
        <View style={styles.navRow}>
          <View style={styles.monthNav}>
            <Pressable hitSlop={8} onPress={() => setCursor((d) => addMonths(d, -1))}>
              <Ionicons name="chevron-back" size={20} color={PALETTE.ink} />
            </Pressable>
            <Text style={styles.monthLabel}>{format(cursor, 'MMMM')}</Text>
            <Pressable hitSlop={8} onPress={() => setCursor((d) => addMonths(d, 1))}>
              <Ionicons name="chevron-forward" size={20} color={PALETTE.ink} />
            </Pressable>
          </View>
          <View style={styles.toggle}>
            {(['week', 'month'] as const).map((m) => (
              <Pressable key={m} onPress={() => setMode(m)} style={[styles.toggleBtn, mode === m && styles.toggleBtnActive]}>
                <Text style={[styles.toggleText, mode === m && styles.toggleTextActive]}>
                  {m === 'week' ? 'Week' : 'Month'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={styles.selectedLabel}>{format(selected, 'MMMM d, yyyy')}</Text>

        {/* Grid */}
        <View style={styles.dowRow}>
          {DOW.map((d, i) => <Text key={i} style={styles.dow}>{d}</Text>)}
        </View>
        {Array.from({ length: weeks }).map((_, w) => (
          <View key={w} style={styles.weekRow}>
            {gridDays.slice(w * 7, w * 7 + 7).map((day) => {
              const inMonth = mode === 'week' || (day >= monthStart && day <= monthEnd);
              const isSel = isSameDay(day, selected);
              const evs = eventsByDay.get(format(day, 'yyyy-MM-dd')) ?? [];
              return (
                <Pressable key={day.toISOString()} style={styles.cell} onPress={() => setSelected(day)}>
                  <View style={[styles.dayCircle, isSel && styles.dayCircleSel]}>
                    <Text style={[styles.dayNum, !inMonth && styles.dayMuted, isSel && styles.daySel]}>
                      {format(day, 'd')}
                    </Text>
                  </View>
                  <View style={styles.dots}>
                    {evs.slice(0, 3).map((e) => <View key={e.id} style={[styles.dot, { backgroundColor: e.color || PALETTE.teal }]} />)}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}

        {/* Events + chores for selected day */}
        <Text style={styles.section}>
          {isSameDay(selected, new Date()) ? "Today's Events" : `Events · ${format(selected, 'MMM d')}`}
        </Text>
        {dayEvents.length === 0 && dayChores.length === 0 ? (
          <Text style={styles.empty}>Nothing scheduled</Text>
        ) : null}
        {dayEvents.map((e) => {
          const m = memberMap[e.createdBy];
          return (
            <Pressable key={e.id} style={styles.card} onPress={() => { setSelectedEvent(e); formRef.current?.present(); }}>
              <View style={styles.cardIcon}><Ionicons name="calendar" size={18} color={PALETTE.ink} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle} numberOfLines={1}>{e.title}</Text>
                <View style={styles.assignRow}>
                  <Avatar name={m?.displayName} uri={m?.avatarUrl} color={e.color || m?.color} size={18} />
                  <Text style={styles.assignText}>Assigned to {m?.displayName ?? '—'}</Text>
                </View>
              </View>
              <View style={[styles.timePill, { backgroundColor: e.color || PALETTE.pillBlue }]}>
                <Text style={styles.timePillText}>{format(e.startTime.toDate(), 'h:mma').toLowerCase()}</Text>
              </View>
            </Pressable>
          );
        })}
        {dayChores.map((c) => {
          const m = memberMap[c.assignedTo];
          return (
            <Pressable key={c.id} style={styles.card} onPress={() => formRef.current && undefined}>
              <View style={styles.cardIcon}><MaterialCommunityIcons name="broom" size={18} color={PALETTE.ink} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle} numberOfLines={1}>{c.title}</Text>
                <View style={styles.assignRow}>
                  <Avatar name={m?.displayName} uri={m?.avatarUrl} color={m?.color} size={18} />
                  <Text style={styles.assignText}>Assigned to {m?.displayName ?? '—'}</Text>
                </View>
              </View>
              <View style={styles.chorePill}><Text style={styles.chorePillText}>Chore</Text></View>
            </Pressable>
          );
        })}

        {doneToday.length > 0 ? (
          <>
            <Text style={styles.section}>Done ({doneToday.length})</Text>
            {doneToday.map((c) => {
              const m = memberMap[c.assignedTo];
              return (
                <View key={c.id} style={[styles.card, styles.cardDone]}>
                  <View style={styles.cardIcon}><MaterialCommunityIcons name="broom" size={18} color={PALETTE.inkFaint} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, styles.cardTitleDone]} numberOfLines={1}>{c.title}</Text>
                    <View style={styles.assignRow}>
                      <Avatar name={m?.displayName} uri={m?.avatarUrl} color={m?.color} size={18} />
                      <Text style={styles.assignText}>Assigned to {m?.displayName ?? '—'}</Text>
                    </View>
                  </View>
                  <View style={styles.donePill}><Text style={styles.donePillText}>Completed</Text></View>
                </View>
              );
            })}
          </>
        ) : null}
      </ScrollView>

      <Pressable accessibilityLabel="Add event" style={styles.fab} onPress={() => { setSelectedEvent(null); formRef.current?.present(); }}>
        <Ionicons name="add" size={28} color={PALETTE.ink} />
      </Pressable>

      <EventForm ref={formRef} onSubmit={addEvent} onUpdate={updateEvent} event={selectedEvent} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PALETTE.cream },
  scroll: { padding: SPACING.base, paddingBottom: 96 },
  title: { ...TYPE.header, color: PALETTE.ink },
  subtitle: { ...TYPE.small, color: PALETTE.inkMuted, marginBottom: SPACING.base },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  monthLabel: { ...TYPE.heading, color: PALETTE.ink },
  toggle: { flexDirection: 'row', backgroundColor: PALETTE.white, borderRadius: RADIUS.pill, padding: 3 },
  toggleBtn: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: RADIUS.pill },
  toggleBtnActive: { backgroundColor: PALETTE.ink },
  toggleText: { ...TYPE.label, color: PALETTE.ink },
  toggleTextActive: { color: PALETTE.onAction },
  selectedLabel: { ...TYPE.bodyMedium, color: PALETTE.ink, textAlign: 'center', marginVertical: SPACING.md },
  dowRow: { flexDirection: 'row' },
  dow: { flex: 1, textAlign: 'center', ...TYPE.small, color: PALETTE.inkMuted },
  weekRow: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  dayCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dayCircleSel: { backgroundColor: PALETTE.teal },
  dayNum: { ...TYPE.body, color: PALETTE.ink },
  dayMuted: { color: PALETTE.inkFaint },
  daySel: { color: PALETTE.onAction },
  dots: { flexDirection: 'row', gap: 2, height: 6, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  section: { ...TYPE.heading, color: PALETTE.ink, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  empty: { ...TYPE.small, color: PALETTE.inkMuted },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: PALETTE.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  choreCard: { backgroundColor: PALETTE.sand },
  cardDone: { backgroundColor: PALETTE.sand },
  cardIcon: { width: 36, height: 36, borderRadius: RADIUS.pill, backgroundColor: PALETTE.cream, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { ...TYPE.bodyMedium, color: PALETTE.ink },
  cardTitleDone: { color: PALETTE.inkFaint, textDecorationLine: 'line-through' },
  cardMeta: { ...TYPE.small, color: PALETTE.inkMuted, marginTop: 2 },
  assignRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  assignText: { ...TYPE.small, color: PALETTE.inkMuted },
  chorePill: { backgroundColor: PALETTE.tealTint, borderRadius: RADIUS.pill, paddingVertical: 5, paddingHorizontal: 10 },
  chorePillText: { ...TYPE.label, color: PALETTE.ink },
  timePill: { borderRadius: RADIUS.pill, paddingVertical: 5, paddingHorizontal: 10 },
  timePillText: { ...TYPE.label, color: PALETTE.ink },
  donePill: { backgroundColor: PALETTE.ink, borderRadius: RADIUS.pill, paddingVertical: 5, paddingHorizontal: 10 },
  donePillText: { ...TYPE.label, color: PALETTE.onAction },
  fab: {
    position: 'absolute', right: SPACING.lg, bottom: SPACING.lg,
    width: 56, height: 56, borderRadius: RADIUS.pill, backgroundColor: PALETTE.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#403021', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
});
