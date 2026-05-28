import { format, isToday, isTomorrow } from 'date-fns';
import { useRouter } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCalendarEvents } from '@/src/hooks/useCalendarEvents';
import { useChores } from '@/src/hooks/useChores';
import { useShoppingList } from '@/src/hooks/useShoppingList';
import { useAuthStore } from '@/src/store/authStore';
import { useHouseStore } from '@/src/store/houseStore';
import { FONTS, PALETTE } from '@/src/theme/palette';

const CANVAS = 402;
const INK = PALETTE.ink;

function eventWhen(ts: Timestamp): string {
  const d = ts.toDate();
  if (isToday(d)) return `Today, ${format(d, 'h:mm a')}`;
  if (isTomorrow(d)) return `Tomorrow, ${format(d, 'h:mm a')}`;
  return format(d, 'MMM d, h:mm a');
}

/** Decorative fridge magnet — colored disc with 4 dots + inner shadow. */
function Magnet({ color, inner }: { color: string; inner: string }) {
  return (
    <View style={[styles.magnet, { backgroundColor: color }]}>
      <View style={[styles.magnetInner, { backgroundColor: inner }]}>
        <View style={styles.magnetDots}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.magnetDot} />
          ))}
        </View>
      </View>
    </View>
  );
}

/** Faint background grid (Figma "background grid" — grid-green @ 40%). */
function GridBackground() {
  const lines = Array.from({ length: 60 });
  return (
    <View style={styles.grid} pointerEvents="none">
      {lines.map((_, i) => (
        <View key={`h${i}`} style={[styles.gridLineH, { top: i * 16 }]} />
      ))}
      {lines.map((_, i) => (
        <View key={`v${i}`} style={[styles.gridLineV, { left: i * 16 }]} />
      ))}
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const userProfile = useAuthStore((s) => s.userProfile);
  const house = useHouseStore((s) => s.house);

  const { chores, toggleChore } = useChores();
  const { events } = useCalendarEvents();
  const { items: shopping } = useShoppingList();

  const uid = userProfile?.id;
  const myChores = chores.filter((c) => !c.isCompleted && (!uid || c.assignedTo === uid));
  const now = Date.now();
  const nextEvent = events
    .filter((e) => e.startTime.toMillis() >= now)
    .sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis())[0];
  const unchecked = shopping.filter((i) => !i.isChecked);
  const shopTotal = shopping.length;
  const firstName = userProfile?.displayName?.split(' ')[0] ?? 'there';

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.canvas}>
          <GridBackground />

          {/* Header */}
          <SafeAreaView edges={['top']} style={styles.headerSafe}>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                {house?.name ? <Text style={styles.houseName}>{house.name}</Text> : null}
                <Text style={styles.firstName}>{firstName}</Text>
              </View>
              <View style={styles.headerIcons}>
                <Ionicons name="notifications" size={26} color={INK} />
                <Pressable hitSlop={6} onPress={() => router.push('/(tabs)/settings')}>
                  <Ionicons name="settings-sharp" size={26} color={INK} />
                </Pressable>
              </View>
            </View>
          </SafeAreaView>

          {/* My Chores widget */}
          <Pressable
            style={[styles.widget, { top: 132, left: 24, width: 167 }]}
            onPress={() => router.push('/(tabs)/chores')}
          >
            <View style={styles.widgetHead}>
              <MaterialCommunityIcons name="format-list-checks" size={16} color={INK} />
              <Text style={styles.widgetTitle}>My Chores</Text>
            </View>
            <View style={styles.tealRule} />
            <View style={styles.choreBody}>
              <View style={styles.marginLine} />
              {(myChores.length ? myChores.slice(0, 5) : []).map((c) => (
                <View key={c.id} style={styles.choreRow}>
                  <Pressable
                    hitSlop={8}
                    onPress={() => toggleChore(c.id)}
                    style={styles.choreBox}
                  />
                  <Text style={styles.choreText} numberOfLines={1}>{c.title}</Text>
                </View>
              ))}
              {myChores.length === 0 ? (
                <Text style={styles.widgetEmpty}>All done ✓</Text>
              ) : null}
              {myChores.length > 5 ? (
                <Text style={styles.choreText}>and {myChores.length - 5} more…</Text>
              ) : null}
            </View>
          </Pressable>

          {/* Next Event widget */}
          <Pressable
            style={[styles.widget, { top: 360, left: 24, width: 167 }]}
            onPress={() => router.push('/(tabs)/calendar')}
          >
            <View style={styles.eventHead}>
              <Ionicons name="calendar-outline" size={14} color={INK} />
              <Text style={styles.widgetTitle}>Next Event:</Text>
            </View>
            <View style={styles.eventBody}>
              {nextEvent ? (
                <>
                  <Text style={styles.eventTitle} numberOfLines={1}>{nextEvent.title}</Text>
                  <Text style={styles.eventMeta}>{eventWhen(nextEvent.startTime)}</Text>
                  {nextEvent.description ? (
                    <Text style={styles.eventDesc} numberOfLines={2}>{nextEvent.description}</Text>
                  ) : null}
                </>
              ) : (
                <Text style={styles.widgetEmpty}>No upcoming events</Text>
              )}
            </View>
          </Pressable>

          {/* Shopping List widget */}
          <Pressable
            style={[styles.widget, styles.shopWidget, { top: 540, left: 24, width: 167 }]}
            onPress={() => router.push('/(tabs)/shopping')}
          >
            <View style={styles.widgetHead}>
              <Ionicons name="cart-outline" size={16} color={INK} />
              <Text style={styles.widgetTitle}>Shopping List</Text>
            </View>
            <View style={styles.tealRule} />
            {unchecked.slice(0, 4).map((i) => (
              <View key={i.id} style={styles.shopRow}>
                <Text style={styles.shopText}>{i.quantity > 1 ? `${i.quantity}x ` : ''}{i.name}</Text>
                <View style={styles.leader} />
              </View>
            ))}
            {unchecked.length === 0 ? <Text style={styles.widgetEmpty}>List is empty</Text> : null}
            {unchecked.length > 4 ? (
              <Text style={styles.shopText}>and {unchecked.length - 4} other items</Text>
            ) : null}
            <View style={styles.tealRule} />
            <Text style={styles.shopMeta}>Item count: {shopTotal}</Text>
          </Pressable>

          {/* Decorative magnets */}
          <View style={[styles.magnetPos, { top: 470, left: 300, transform: [{ rotate: '5deg' }] }]}>
            <Magnet color="#FFC7C3" inner="#F3B5B0" />
          </View>
          <View style={[styles.magnetPos, { top: 690, left: 232, transform: [{ rotate: '15deg' }] }]}>
            <Magnet color="#FFD1B2" inner="#FBCA9C" />
          </View>
          <View style={[styles.magnetPos, { top: 735, left: 210, transform: [{ rotate: '-18deg' }] }]}>
            <Magnet color="#AED389" inner="#A2C381" />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.cream },
  scroll: { alignItems: 'center', minHeight: 820, paddingBottom: 24 },
  canvas: { width: CANVAS, minHeight: 820 },

  grid: { ...StyleSheet.absoluteFillObject, opacity: 0.4, overflow: 'hidden' },
  gridLineH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: PALETTE.gridGreen },
  gridLineV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: PALETTE.gridGreen },

  headerSafe: { paddingHorizontal: 24 },
  header: { flexDirection: 'row', alignItems: 'flex-end', paddingTop: 8, paddingBottom: 8 },
  houseName: { fontFamily: FONTS.display, fontSize: 16, color: INK },
  firstName: { fontFamily: FONTS.display, fontSize: 32, color: INK },
  headerIcons: { flexDirection: 'row', gap: 12, alignItems: 'center' },

  widget: {
    position: 'absolute',
    backgroundColor: PALETTE.white,
    borderRadius: 4,
    shadowColor: '#403021',
    shadowOpacity: 0.17,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
    overflow: 'hidden',
  },
  widgetHead: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 12 },
  widgetTitle: { fontFamily: FONTS.display, fontSize: 16, color: INK },
  tealRule: { height: 1, backgroundColor: PALETTE.tealTint },
  widgetEmpty: { fontFamily: FONTS.bodyRegular, fontSize: 12, color: PALETTE.inkMuted, padding: 12 },

  choreBody: { paddingLeft: 30 },
  marginLine: { position: 'absolute', left: 30, top: 0, bottom: 0, width: 1, backgroundColor: '#FAB9B9' },
  choreRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: PALETTE.tealTint },
  choreBox: { width: 14, height: 14, borderRadius: 4, borderWidth: 1, borderColor: INK, backgroundColor: PALETTE.white },
  choreText: { fontFamily: FONTS.bodyRegular, fontSize: 12, color: INK, flex: 1 },

  eventHead: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: PALETTE.pillBlue, padding: 10 },
  eventBody: { padding: 12, gap: 4 },
  eventTitle: { fontFamily: FONTS.bodyMedium, fontSize: 14, color: INK },
  eventMeta: { fontFamily: FONTS.bodyRegular, fontSize: 12, color: PALETTE.inkMuted },
  eventDesc: { fontFamily: FONTS.bodyRegular, fontSize: 12, color: PALETTE.inkMuted },

  shopWidget: { padding: 12, gap: 8 },
  shopRow: { flexDirection: 'row', alignItems: 'flex-end' },
  shopText: { fontFamily: FONTS.bodyRegular, fontSize: 12, color: INK },
  leader: { flex: 1, height: 1, borderBottomWidth: 1, borderStyle: 'dashed', borderColor: PALETTE.inkHairline, marginLeft: 6, marginBottom: 3 },
  shopMeta: { fontFamily: FONTS.bodyRegular, fontSize: 12, color: INK },

  magnetPos: { position: 'absolute' },
  magnet: { width: 36, height: 36, borderRadius: 18, padding: 4 },
  magnetInner: { flex: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  magnetDots: { width: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  magnetDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: PALETTE.white },
});
