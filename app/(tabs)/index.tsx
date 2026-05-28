import { differenceInCalendarDays, format, isToday, isTomorrow } from 'date-fns';
import { useRouter } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, Card } from '@/src/components/ui';
import { useCalendarEvents } from '@/src/hooks/useCalendarEvents';
import { useChores } from '@/src/hooks/useChores';
import { useShoppingList } from '@/src/hooks/useShoppingList';
import { useAuthStore } from '@/src/store/authStore';
import { useHouseStore } from '@/src/store/houseStore';
import { PALETTE, RADIUS, SPACING, TYPE } from '@/src/theme/palette';

function formatEventTime(ts: Timestamp): string {
  const d = ts.toDate();
  if (isToday(d)) return `Today · ${format(d, 'h:mm a')}`;
  if (isTomorrow(d)) return `Tomorrow · ${format(d, 'h:mm a')}`;
  return format(d, 'MMM d · h:mm a');
}

function WidgetHeader({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.widgetHeader}>
      <Ionicons name={icon} size={16} color={PALETTE.ink} />
      <Text style={TYPE.heading}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const userProfile = useAuthStore((s) => s.userProfile);
  const house = useHouseStore((s) => s.house);
  const memberMap = useHouseStore((s) => s.memberMap);

  const { chores, toggleChore } = useChores();
  const { events } = useCalendarEvents();
  const { items: shopping } = useShoppingList();

  const uid = userProfile?.id;
  const myChores = chores.filter((c) => !c.isCompleted && (!uid || c.assignedTo === uid)).slice(0, 5);
  const now = Date.now();
  const nextEvent = events
    .filter((e) => e.startTime.toMillis() >= now)
    .sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis())[0];
  const unchecked = shopping.filter((i) => !i.isChecked);

  const greetingName = userProfile?.displayName?.split(' ')[0] ?? 'there';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            {house?.name ? <Text style={styles.houseName}>{house.name}</Text> : null}
            <Text style={styles.greeting}>{greetingName}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable hitSlop={8} onPress={() => router.push('/(tabs)/settings')}>
              <Ionicons name="settings-outline" size={26} color={PALETTE.ink} />
            </Pressable>
          </View>
        </View>

        {/* My Chores */}
        <Card style={styles.widget}>
          <WidgetHeader icon="checkbox-outline" label="My Chores" />
          <View style={styles.divider} />
          {myChores.length === 0 ? (
            <Text style={styles.empty}>All done — nothing assigned to you ✓</Text>
          ) : (
            myChores.map((c) => (
              <Pressable key={c.id} style={styles.choreRow} onPress={() => toggleChore(c.id)}>
                <View style={styles.checkbox} />
                <Text style={styles.choreLabel} numberOfLines={1}>{c.title}</Text>
              </Pressable>
            ))
          )}
          <Pressable onPress={() => router.push('/(tabs)/chores')}>
            <Text style={styles.link}>View all chores →</Text>
          </Pressable>
        </Card>

        {/* Next Event */}
        <Card tone="teal" style={styles.widget}>
          <WidgetHeader icon="calendar-outline" label="Next Event" />
          <View style={styles.divider} />
          {nextEvent ? (
            <Pressable onPress={() => router.push('/(tabs)/calendar')}>
              <Text style={styles.eventTitle}>{nextEvent.title}</Text>
              <Text style={styles.eventTime}>{formatEventTime(nextEvent.startTime)}</Text>
              {nextEvent.description ? (
                <Text style={styles.eventDesc} numberOfLines={2}>{nextEvent.description}</Text>
              ) : null}
            </Pressable>
          ) : (
            <Text style={styles.empty}>No upcoming events</Text>
          )}
        </Card>

        {/* Shopping List */}
        <Card style={styles.widget}>
          <WidgetHeader icon="cart-outline" label="Shopping List" />
          <View style={styles.divider} />
          {unchecked.length === 0 ? (
            <Text style={styles.empty}>List is empty</Text>
          ) : (
            <>
              {unchecked.slice(0, 4).map((i) => (
                <View key={i.id} style={styles.shopRow}>
                  <Text style={styles.shopName} numberOfLines={1}>
                    {i.quantity > 1 ? `${i.quantity}x ` : ''}{i.name}
                  </Text>
                  <View style={styles.leader} />
                </View>
              ))}
              {unchecked.length > 4 ? (
                <Text style={styles.shopMore}>and {unchecked.length - 4} more…</Text>
              ) : null}
            </>
          )}
          <Pressable onPress={() => router.push('/(tabs)/shopping')}>
            <Text style={styles.link}>Open list →</Text>
          </Pressable>
        </Card>

        {/* Members */}
        {house ? (
          <View style={styles.members}>
            {Object.entries(memberMap).map(([id, m]) => (
              <Avatar key={id} name={m.displayName} uri={m.avatarUrl} color={m.color} size={36} />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PALETTE.cream },
  content: { padding: SPACING.base, gap: SPACING.base, paddingBottom: SPACING.xxl },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  headerText: { flex: 1 },
  houseName: { ...TYPE.heading, color: PALETTE.ink },
  greeting: { ...TYPE.header, color: PALETTE.ink },
  headerActions: { flexDirection: 'row', gap: SPACING.md, alignItems: 'center' },
  widget: { gap: SPACING.sm },
  widgetHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  divider: { height: 1, backgroundColor: PALETTE.tealTint },
  empty: { ...TYPE.small, color: PALETTE.inkMuted, paddingVertical: SPACING.xs },
  choreRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 6 },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: PALETTE.ink,
    backgroundColor: PALETTE.white,
  },
  choreLabel: { ...TYPE.body, color: PALETTE.ink, flex: 1 },
  link: { ...TYPE.small, color: PALETTE.terracotta, marginTop: SPACING.xs },
  eventTitle: { ...TYPE.bodyMedium, color: PALETTE.ink },
  eventTime: { ...TYPE.small, color: PALETTE.inkMuted, marginTop: 2 },
  eventDesc: { ...TYPE.small, color: PALETTE.inkMuted, marginTop: SPACING.xs },
  shopRow: { flexDirection: 'row', alignItems: 'flex-end', paddingVertical: 4 },
  shopName: { ...TYPE.small, color: PALETTE.ink },
  leader: { flex: 1, height: 1, borderBottomWidth: 1, borderStyle: 'dashed', borderColor: PALETTE.inkHairline, marginLeft: 6, marginBottom: 3 },
  shopMore: { ...TYPE.small, color: PALETTE.inkMuted, paddingVertical: 4 },
  members: { flexDirection: 'row', gap: -8, marginTop: SPACING.sm, paddingLeft: 4 },
});
