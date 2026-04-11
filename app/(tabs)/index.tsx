import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { differenceInCalendarDays, format, isToday, isTomorrow } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { useHouseStore } from '@/src/store/houseStore';
import { useChores } from '@/src/hooks/useChores';
import { useCalendarEvents } from '@/src/hooks/useCalendarEvents';
import { usePantry } from '@/src/hooks/usePantry';
import { useShoppingList } from '@/src/hooks/useShoppingList';
import { getWeekKey } from '@/src/utils/weekKey';

function Magnet({ color }: { color: string }) {
  return <View style={[styles.magnetDot, { backgroundColor: color }]} />;
}

function formatEventTime(timestamp: Timestamp): string {
  const date = timestamp.toDate();
  const timeStr = format(date, 'h:mm a');
  if (isToday(date)) return `Today ${timeStr}`;
  if (isTomorrow(date)) return `Tomorrow ${timeStr}`;
  return format(date, 'MMM d');
}

export default function HomeScreen() {
  const house = useHouseStore((s) => s.house);
  const memberMap = useHouseStore((s) => s.memberMap);

  const { data: allChores = [], isLoading: choresLoading } = useChores();
  const { data: allEvents = [], isLoading: eventsLoading } = useCalendarEvents();
  const { data: allPantry = [], isLoading: pantryLoading } = usePantry();
  const { data: allShopping = [], isLoading: shoppingLoading } = useShoppingList();

  // Today's chores for this week
  const weekKey = getWeekKey();
  const todayDow = new Date().getDay();
  const chores = allChores.filter((c) => c.weekKey === weekKey && c.dayOfWeek === todayDow);
  const doneCount = chores.filter((c) => c.isCompleted).length;

  // Next 3 upcoming events
  const now = new Date();
  const events = allEvents
    .filter((e) => e.startTime.toDate() > now)
    .sort((a, b) => a.startTime.toDate().getTime() - b.startTime.toDate().getTime())
    .slice(0, 3);

  // Items expiring within 4 days
  const expiring = allPantry.filter((item) => {
    if (!item.expirationDate) return false;
    const days = differenceInCalendarDays(item.expirationDate.toDate(), now);
    return days >= 0 && days <= 4;
  });

  // Unchecked shopping items
  const uncheckedCount = allShopping.filter((i) => !i.isChecked).length;

  // Members as array
  const members = Object.entries(memberMap).map(([id, info]) => ({ id, ...info }));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.fridge}
        contentContainerStyle={styles.fridgeContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.houseName}>{house?.name ?? '-'}</Text>
          <View style={styles.membersRow}>
            {members.map((m) => (
              <View key={m.id} style={[styles.avatar, { backgroundColor: m.color }]}>
                <Text style={styles.avatarText}>{m.displayName[0]}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Row 1: Chores note (tilted left) + Events note (tilted right) */}
        <View style={styles.magnetRow}>
          {/* Chores magnet */}
          <View style={[styles.note, styles.noteTiltLeft, { flex: 1.1 }]}>
            <Magnet color="#6C5CE7" />
            <Text style={styles.noteTitle}>This week's chores</Text>
            {choresLoading ? (
              <Text style={styles.noteMeta}>Loading...</Text>
            ) : chores.length === 0 ? (
              <Text style={styles.noteMeta}>No chores today</Text>
            ) : (
              <>
                <Text style={styles.noteMeta}>{doneCount}/{chores.length} done</Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${(doneCount / chores.length) * 100}%` },
                    ]}
                  />
                </View>
                {chores.map((c) => {
                  const color = memberMap[c.assignedTo]?.color ?? '#636e72';
                  return (
                    <View key={c.id} style={styles.choreRow}>
                      <View
                        style={[
                          styles.choreDot,
                          { backgroundColor: c.isCompleted ? '#DFE6E9' : color },
                        ]}
                      />
                      <Text
                        style={[styles.choreText, c.isCompleted && styles.choreTextDone]}
                        numberOfLines={1}
                      >
                        {c.title}
                      </Text>
                    </View>
                  );
                })}
              </>
            )}
          </View>

          {/* Events magnet */}
          <View style={[styles.note, styles.noteTiltRight, { flex: 0.9 }]}>
            <Magnet color="#FDCB6E" />
            <Text style={styles.noteTitle}>Coming up</Text>
            {eventsLoading ? (
              <Text style={styles.eventTime}>Loading...</Text>
            ) : events.length === 0 ? (
              <Text style={styles.eventTime}>Nothing scheduled</Text>
            ) : (
              events.map((e) => (
                <View key={e.id} style={styles.eventRow}>
                  <View style={[styles.eventDot, { backgroundColor: e.color }]} />
                  <View>
                    <Text style={styles.eventTitle} numberOfLines={1}>{e.title}</Text>
                    <Text style={styles.eventTime}>{formatEventTime(e.startTime)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Row 2: Expiring soon note (full width, slight tilt) */}
        <View style={[styles.note, styles.noteTiltMild, styles.noteWide]}>
          <Magnet color="#E17055" />
          <Text style={styles.noteTitle}>Expiring soon</Text>
          {pantryLoading ? (
            <Text style={styles.expiringName}>Loading...</Text>
          ) : expiring.length === 0 ? (
            <Text style={styles.expiringName}>Nothing expiring soon</Text>
          ) : (
            <View style={styles.expiringList}>
              {expiring.map((item) => {
                const days = differenceInCalendarDays(item.expirationDate!.toDate(), now);
                return (
                  <View key={item.id} style={styles.expiringChip}>
                    <Text style={styles.expiringName}>{item.name}</Text>
                    <Text
                      style={[
                        styles.expiringDays,
                        { color: days <= 1 ? '#E17055' : '#FDCB6E' },
                      ]}
                    >
                      {days === 0 ? 'today' : days === 1 ? 'tmrw' : `${days}d`}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Row 3: Shopping list note */}
        <View style={[styles.note, styles.noteTiltLeft, styles.noteCompact]}>
          <Magnet color="#00B894" />
          <Text style={styles.noteTitle}>Shopping list</Text>
          {shoppingLoading ? (
            <Text style={styles.reminderText}>Loading...</Text>
          ) : (
            <Text style={styles.reminderText}>
              {uncheckedCount === 0
                ? 'All stocked up!'
                : `${uncheckedCount} item${uncheckedCount !== 1 ? 's' : ''} to grab`}
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#D6D3CC' },
  fridge: { flex: 1 },
  fridgeContent: { padding: 16, paddingBottom: 32 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  houseName: { fontSize: 22, fontWeight: '800', color: '#2D3436' },
  membersRow: { flexDirection: 'row', gap: 6 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  magnetRow: { flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'flex-start' },

  // Base note card
  note: {
    backgroundColor: '#FFFEF0',
    borderRadius: 4,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 2, height: 4 },
    elevation: 4,
  },
  noteWide: { marginBottom: 14 },
  noteCompact: { alignSelf: 'flex-start', maxWidth: '70%' },

  noteTiltLeft: { transform: [{ rotate: '-1.5deg' }] },
  noteTiltRight: { transform: [{ rotate: '2deg' }] },
  noteTiltMild: { transform: [{ rotate: '0.8deg' }] },

  magnetDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignSelf: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },

  noteTitle: { fontSize: 13, fontWeight: '800', color: '#2D3436', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  noteMeta: { fontSize: 11, color: '#636e72', marginBottom: 6 },

  progressBar: { height: 4, backgroundColor: '#DFE6E9', borderRadius: 2, marginBottom: 10 },
  progressFill: { height: 4, backgroundColor: '#6C5CE7', borderRadius: 2 },

  choreRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 5 },
  choreDot: { width: 8, height: 8, borderRadius: 4 },
  choreText: { fontSize: 13, color: '#2D3436', flex: 1 },
  choreTextDone: { color: '#B2BEC3', textDecorationLine: 'line-through' },

  eventRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  eventDot: { width: 8, height: 8, borderRadius: 4, marginTop: 3 },
  eventTitle: { fontSize: 13, fontWeight: '600', color: '#2D3436' },
  eventTime: { fontSize: 11, color: '#636e72' },

  expiringList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  expiringChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  expiringName: { fontSize: 12, fontWeight: '600', color: '#2D3436' },
  expiringDays: { fontSize: 11, fontWeight: '700' },

  reminderText: { fontSize: 13, color: '#2D3436', lineHeight: 22 },
});
