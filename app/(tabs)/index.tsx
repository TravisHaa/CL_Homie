import { format, isToday, isTomorrow } from 'date-fns';
import { useRouter } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import DeadlinePill from '@/src/components/home/DeadlinePill';
import PolaroidNotice from '@/src/components/home/PolaroidNotice';
import RecentActivity from '@/src/components/home/RecentActivity';
import { useCalendarEvents } from '@/src/hooks/useCalendarEvents';
import { useChores } from '@/src/hooks/useChores';
import { useShoppingList } from '@/src/hooks/useShoppingList';
import { useAuthStore } from '@/src/store/authStore';
import { useHouseStore } from '@/src/store/houseStore';
import { FONTS, PALETTE } from '@/src/theme/palette';

const CANVAS = 402;
const HEADER_H = 132;
const INK = PALETTE.ink;
// Authoritative mesh-gradient stops sampled from Figma node 2694:26990 via
// use_figma → exportAsync 5×2 downsample with text/icons hidden. Diagonal
// peach (top-left) → soft-blue (bottom-right).
const GRADIENT_COLORS = ['#FDD9C5', '#F1D4BA', '#E1CEBF', '#C2CACC', '#B2CAD0'] as const;
const STAR_PURPLE = require('@/assets/images/home/star-purple.png');
const STAR_YELLOW = require('@/assets/images/home/star-yellow.png');

function eventWhen(ts: Timestamp): string {
  const d = ts.toDate();
  if (isToday(d)) return `Today, ${format(d, 'h:mm a')}`;
  if (isTomorrow(d)) return `Tomorrow, ${format(d, 'h:mm a')}`;
  return format(d, 'MMM d, h:mm a');
}

// ── Decorative fridge magnet ───────────────────────────────────────────────────
function Magnet({ outer, inner }: { outer: string; inner: string }) {
  return (
    <View style={[styles.magnet, { backgroundColor: outer }]}>
      <View style={[styles.magnetInner, { backgroundColor: inner }]}>
        <View style={styles.magnetDots}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.magnetDot} />
          ))}
        </View>
        {/* inner-shadow approximation per Figma "inner shadow v1" */}
        <View pointerEvents="none" style={styles.magnetInsetRim} />
      </View>
    </View>
  );
}

// ── Faint background grid (Figma "background grid" — gridGreen @ 40%) ─────────
function GridBackground() {
  const horizontals = Array.from({ length: 60 });
  return (
    <View style={styles.grid} pointerEvents="none">
      {horizontals.map((_, i) => (
        <View key={`h${i}`} style={[styles.gridLineH, { top: i * 16 }]} />
      ))}
      {horizontals.map((_, i) => (
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
          {/* Header band: authoritative mesh-gradient (Figma 2694:26990 image fill, sampled). */}
          <LinearGradient
            colors={GRADIENT_COLORS as unknown as readonly [string, string, ...string[]]}
            locations={[0, 0.25, 0.5, 0.75, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerBand}
          >
            <View style={styles.headerInner}>
              <View style={{ flex: 1 }}>
                {house?.name ? <Text style={styles.houseName}>{house.name}</Text> : null}
                <Text style={styles.firstName}>{firstName}</Text>
              </View>
              <View style={styles.headerIcons}>
                <View style={styles.headerIconBtn}>
                  <MaterialCommunityIcons name="bell-badge" size={20} color={INK} />
                </View>
                <Pressable
                  hitSlop={6}
                  onPress={() => router.push('/(tabs)/settings')}
                  style={styles.headerIconBtn}
                >
                  <MaterialCommunityIcons name="cog" size={20} color={INK} />
                </Pressable>
              </View>
            </View>
          </LinearGradient>

          {/* Grid spans the canvas behind everything below the header */}
          <View style={styles.belowHeader}>
            <GridBackground />

            {/* ── Stars (decorative) ─────────────────────────────────── */}
            <Image source={STAR_PURPLE} style={styles.starPurple} resizeMode="contain" />
            <Image source={STAR_YELLOW} style={styles.starYellow} resizeMode="contain" />

            {/* ── My Chores widget ───────────────────────────────────── */}
            <Pressable
              style={[styles.widget, { top: 24, left: 24, width: 167 }]}
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
                      onPress={() => toggleChore(c.id, c.isCompleted)}
                      style={styles.choreBox}
                    />
                    <Text style={styles.choreText} numberOfLines={1}>
                      {c.title}
                    </Text>
                  </View>
                ))}
                {myChores.length === 0 ? <Text style={styles.widgetEmpty}>All done ✓</Text> : null}
                {myChores.length > 5 ? (
                  <View style={styles.choreRow}>
                    <View style={[styles.choreBox, { opacity: 0 }]} />
                    <Text style={styles.choreText}>and {myChores.length - 5} more…</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>

            {/* ── Next Event widget ──────────────────────────────────── */}
            <Pressable
              style={[styles.widget, { top: 246, left: 24, width: 167 }]}
              onPress={() => router.push('/(tabs)/calendar')}
            >
              <View style={styles.eventHead}>
                <Ionicons name="calendar-outline" size={14} color={INK} />
                <Text style={styles.widgetTitle}>Next Event:</Text>
              </View>
              <View style={styles.eventBody}>
                {nextEvent ? (
                  <>
                    <Text style={styles.eventTitle} numberOfLines={2}>
                      {nextEvent.title}
                    </Text>
                    <Text style={styles.eventMeta}>{eventWhen(nextEvent.startTime)}</Text>
                    {nextEvent.description ? (
                      <Text style={styles.eventDesc} numberOfLines={2}>
                        {nextEvent.description}
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <Text style={styles.widgetEmpty}>No upcoming events</Text>
                )}
              </View>
            </Pressable>

            {/* ── Shopping List widget ───────────────────────────────── */}
            <Pressable
              style={[styles.widget, styles.shopWidget, { top: 438, left: 24, width: 167 }]}
              onPress={() => router.push('/(tabs)/shopping')}
            >
              <View style={styles.widgetHead}>
                <Ionicons name="cart-outline" size={16} color={INK} />
                <Text style={styles.widgetTitle}>Shopping List</Text>
              </View>
              <View style={styles.tealRule} />
              <View style={{ minHeight: 70, justifyContent: 'flex-start', gap: 8 }}>
                {unchecked.slice(0, 4).map((i) => (
                  <View key={i.id} style={styles.shopRow}>
                    <Text style={styles.shopText}>
                      {i.quantity > 1 ? `${i.quantity}x ` : ''}
                      {i.name}
                    </Text>
                    <View style={styles.leader} />
                  </View>
                ))}
                {unchecked.length === 0 ? (
                  <Text style={styles.widgetEmpty}>List is empty</Text>
                ) : null}
                {unchecked.length > 4 ? (
                  <Text style={styles.shopText}>and {unchecked.length - 4} other items</Text>
                ) : null}
              </View>
              <View style={styles.tealRule} />
              <Text style={styles.shopMeta}>Item count: {shopTotal}</Text>
              <Text style={styles.shopMeta}>Estimated total: —</Text>
            </Pressable>

            {/* ── Polaroid notice widget ─────────────────────────────── */}
            <View style={{ position: 'absolute', top: 24, left: 211 }}>
              <PolaroidNotice />
            </View>

            {/* ── Recent Activity strip + pill ───────────────────────── */}
            <RecentActivity />

            {/* ── Deadline pill ──────────────────────────────────────── */}
            <View
              style={{
                position: 'absolute',
                top: 402,
                left: 136,
                transform: [{ rotate: '10.59deg' }],
              }}
            >
              <DeadlinePill style={{ transform: [{ rotate: '0deg' }] }} />
            </View>

            {/* ── Magnets ─────────────────────────────────────────────── */}
            <View
              style={[
                styles.magnetWrap,
                { top: 318, left: 357, transform: [{ rotate: '5.17deg' }] },
              ]}
            >
              <Magnet outer="#FFC7C3" inner="#F3B5B0" />
            </View>
            <View
              style={[
                styles.magnetWrap,
                { top: 574, left: 226, transform: [{ rotate: '15deg' }] },
              ]}
            >
              <Magnet outer="#FFD1B2" inner="#FBCA9C" />
            </View>
            <View
              style={[
                styles.magnetWrap,
                { top: 613, left: 216, transform: [{ rotate: '-18.33deg' }] },
              ]}
            >
              <Magnet outer="#AED389" inner="#A2C381" />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.cream },
  // Authoritative Figma frame is 402×874 (home node 2694:26963); RecentActivity
  // strip bottom = y≈846, so the canvas needs minHeight ≥ 874 to contain it.
  scroll: { alignItems: 'center', minHeight: 1000, paddingBottom: 40 },
  canvas: { width: CANVAS, minHeight: 1000, overflow: 'visible' },

  // ── Header band (gradient + text + icons) ───────────────────────────────
  headerBand: { width: CANVAS, height: HEADER_H, overflow: 'hidden' },
  headerInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 56, // status-bar reservation
    paddingBottom: 8,
    paddingHorizontal: 24,
  },
  houseName: { fontFamily: FONTS.display, fontSize: 16, color: INK, lineHeight: 19 },
  firstName: { fontFamily: FONTS.display, fontSize: 32, color: INK, lineHeight: 38 },
  headerIcons: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  headerIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Canvas region below the header ──────────────────────────────────────
  // Authoritative: RecentActivity strip ends at canvas y≈846 → belowHeader needs
  // ≥ 846 − 132 = 714 to contain it. Use 870 for buffer + overflow: 'visible'
  // so the purple star can sit above its top edge if needed.
  belowHeader: { width: CANVAS, minHeight: 870, position: 'relative', backgroundColor: PALETTE.cream, overflow: 'visible' },

  // ── Grid background ─────────────────────────────────────────────────────
  grid: { ...StyleSheet.absoluteFillObject, opacity: 0.4, overflow: 'hidden' },
  gridLineH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: PALETTE.gridGreen },
  gridLineV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: PALETTE.gridGreen },

  // ── Widget shared styles ────────────────────────────────────────────────
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

  // ── My Chores widget internals ──────────────────────────────────────────
  choreBody: { paddingLeft: 30 },
  marginLine: {
    position: 'absolute',
    left: 30,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#FAB9B9',
  },
  choreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.tealTint,
  },
  choreBox: {
    width: 14,
    height: 14,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: INK,
    backgroundColor: PALETTE.white,
  },
  choreText: { fontFamily: FONTS.bodyRegular, fontSize: 12, color: INK, flex: 1 },

  // ── Next Event widget internals ─────────────────────────────────────────
  eventHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PALETTE.pillBlue,
    padding: 10,
  },
  eventBody: { padding: 12, gap: 4 },
  eventTitle: { fontFamily: FONTS.bodyMedium, fontSize: 14, color: INK },
  eventMeta: { fontFamily: FONTS.bodyRegular, fontSize: 12, color: PALETTE.inkMuted },
  eventDesc: { fontFamily: FONTS.bodyRegular, fontSize: 12, color: PALETTE.inkMuted },

  // ── Shopping list widget internals ──────────────────────────────────────
  shopWidget: { padding: 12, gap: 8 },
  shopRow: { flexDirection: 'row', alignItems: 'flex-end' },
  shopText: { fontFamily: FONTS.bodyRegular, fontSize: 12, color: INK },
  leader: {
    flex: 1,
    height: 1,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderColor: PALETTE.inkHairline,
    marginLeft: 6,
    marginBottom: 3,
  },
  shopMeta: { fontFamily: FONTS.bodyRegular, fontSize: 12, color: INK },

  // Authoritative positions from Figma metadata 2694:26963:
  //   star 1 (purple) 2694:26976 — canvas (346.28, 183.90), 58.77×58.77 → belowHeader (346.28, 51.90)
  //   star 2 (yellow) 2694:26977 — canvas (374.23, 189.98), 35.98×35.98 → belowHeader (374.23, 57.98)
  starPurple: {
    position: 'absolute',
    top: 52,
    left: 346,
    width: 59,
    height: 59,
    transform: [{ rotate: '-165deg' }],
  },
  starYellow: {
    position: 'absolute',
    top: 58,
    left: 374,
    width: 36,
    height: 36,
    transform: [{ rotate: '-178.78deg' }],
  },

  // ── Magnets ─────────────────────────────────────────────────────────────
  magnetWrap: { position: 'absolute' },
  magnet: { width: 36, height: 36, borderRadius: 18, padding: 4 },
  magnetInner: { flex: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  magnetDots: { width: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  magnetDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: PALETTE.white },
  magnetInsetRim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: 'rgba(64, 48, 33, 0.33)',
  },
});
