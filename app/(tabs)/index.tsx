import { useCalendarEvents } from '@/src/hooks/useCalendarEvents';
import { useChores } from '@/src/hooks/useChores';
import { usePantry } from '@/src/hooks/usePantry';
import { useShoppingList } from '@/src/hooks/useShoppingList';
import { useHouseStore } from '@/src/store/houseStore';
import { getWeekKey } from '@/src/utils/weekKey';
import { differenceInCalendarDays, format, isToday, isTomorrow } from 'date-fns';
import { useRouter } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── tokens ──────────────────────────────────────────────────────────────────
const C = {
  fridgeBg:     '#CECCCA',
  noteCream:    '#FFFEF2',
  noteAlt:      '#FFF8E6',
  noteText:     '#2A2A27',
  noteMeta:     '#7A7670',
  noteLabel:    '#B0ACA8',
  noteLines:    '#EDE8DE',
  noteMargin:   '#F5C0B8',
  magnetPurple: '#6C5CE7',
  magnetYellow: '#F9A825',
  magnetCoral:  '#E17055',
  magnetMint:   '#00B894',
  progressBg:   '#E8E4DC',
};

// ─── helpers ──────────────────────────────────────────────────────────────────
function formatEventTime(ts: Timestamp): string {
  const d = ts.toDate();
  if (isToday(d))    return `Today · ${format(d, 'h:mm a')}`;
  if (isTomorrow(d)) return `Tomorrow · ${format(d, 'h:mm a')}`;
  return format(d, 'MMM d');
}

// ─── Magnet ───────────────────────────────────────────────────────────────────
// Looks like a physical circular magnet with a shine highlight
function Magnet({ color }: { color: string }) {
  return (
    <View style={[styles.magnetBody, { backgroundColor: color }]}>
      {/* shine arc */}
      <View style={styles.magnetShine} />
      {/* center dimple */}
      <View style={[styles.magnetDimple, { backgroundColor: color + 'AA' }]} />
    </View>
  );
}

// ─── Note card ────────────────────────────────────────────────────────────────
// Each card has a colored top strip that spans full width,
// with the magnet centered and overlapping the strip.
function Note({
  children,
  tilt,
  color,
  bg = C.noteCream,
  showMarginLine = false,
  foldCorner = false,
  style,
}: {
  children: React.ReactNode;
  tilt: 'left' | 'right' | 'mild' | 'steep';
  color: string;
  bg?: string;
  showMarginLine?: boolean;
  foldCorner?: boolean;
  style?: object;
}) {
  const rotations = { left: '-1.8deg', right: '2.4deg', mild: '0.8deg', steep: '-3deg' };
  return (
    <View style={[styles.noteOuter, { transform: [{ rotate: rotations[tilt] }] }, style]}>
      {/* colored top strip */}
      <View style={[styles.noteStrip, { backgroundColor: color }]} />
      {/* magnet overlapping strip */}
      <View style={styles.magnetAnchor}>
        <Magnet color={color} />
      </View>
      {/* paper body */}
      <View style={[styles.notePaper, { backgroundColor: bg }]}>
        {/* red margin line on some cards */}
        {showMarginLine && <View style={styles.marginLine} />}
        {/* subtle ruled lines */}
        <View style={styles.ruleLine} />
        <View style={[styles.ruleLine, { top: 56 }]} />
        <View style={[styles.ruleLine, { top: 72 }]} />
        <View style={[styles.ruleLine, { top: 88 }]} />
        {children}
      </View>
      {/* folded corner triangle */}
      {foldCorner && <View style={styles.foldCorner} />}
    </View>
  );
}

// ─── Letter magnet tile ───────────────────────────────────────────────────────
// These are purely decorative — small plastic fridge letter tiles.
function LetterTile({
  char,
  color,
  rotate = '0deg',
  nudgeTop = 0,
}: {
  char: string;
  color: string;
  rotate?: string;
  nudgeTop?: number;
}) {
  return (
    <View style={{ marginTop: nudgeTop }}>
      <View style={[styles.letterTile, { backgroundColor: color, transform: [{ rotate }] }]}>
        <View style={styles.letterTileShine} />
        <Text style={styles.letterChar}>{char}</Text>
      </View>
    </View>
  );
}

// ─── Emoji magnet (round) ─────────────────────────────────────────────────────
function EmojiMagnet({
  emoji,
  color,
  rotate = '0deg',
  size = 36,
}: {
  emoji: string;
  color: string;
  rotate?: string;
  size?: number;
}) {
  return (
    <View
      style={[
        styles.emojiMagnet,
        { backgroundColor: color, width: size, height: size, borderRadius: size / 2, transform: [{ rotate }] },
      ]}
    >
      <Text style={{ fontSize: size * 0.45 }}>{emoji}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router    = useRouter();
  const house     = useHouseStore((s) => s.house);
  const memberMap = useHouseStore((s) => s.memberMap);

  const { chores: allChores = [],   isLoading: choresLoading   } = useChores();
  const { events: allEvents = [],   isLoading: eventsLoading   } = useCalendarEvents();
  const { items:  allPantry = [],   isLoading: pantryLoading   } = usePantry();
  const { items:  allShopping = [], isLoading: shoppingLoading } = useShoppingList();

  const weekKey  = getWeekKey();
  const todayDow = new Date().getDay();
  const now      = new Date();

  const chores = allChores.filter(
    (c) => c.weekKey === weekKey && c.dayOfWeek === todayDow,
  );
  const doneCount = chores.filter((c) => c.isCompleted).length;

  const events = allEvents
    .filter((e) => e.startTime.toDate() > now)
    .sort((a, b) => a.startTime.toDate().getTime() - b.startTime.toDate().getTime())
    .slice(0, 3);

  const expiring = allPantry.filter((item) => {
    if (!item.expirationDate) return false;
    const d = differenceInCalendarDays(item.expirationDate.toDate(), now);
    return d >= 0 && d <= 4;
  });

  const uncheckedCount = allShopping.filter((i) => !i.isChecked).length;
  const members = Object.entries(memberMap).map(([id, info]) => ({ id, ...info }));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.fridge}
        contentContainerStyle={styles.fridgeContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={styles.fridgeHeader}>
          <View>
            <Text style={styles.houseName}>{house?.name ?? 'Home'}</Text>
            <Text style={styles.houseDate}>{format(now, 'EEEE, MMMM d')}</Text>
          </View>
          <View style={styles.avatarRow}>
            {members.map((m) => (
              <View key={m.id} style={[styles.avatar, { backgroundColor: m.color }]}>
                <Text style={styles.avatarInitial}>{m.displayName[0].toUpperCase()}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Filler: HOMIE letter tiles ───────────────────────────────────
            These look like the plastic letter magnets everyone has on their fridge.
            They are purely decorative — not interactive. */}
        <View style={styles.fillerRow}>
          <LetterTile char="H" color="#E17055" rotate="-3deg" nudgeTop={4} />
          <LetterTile char="O" color="#74B9FF" rotate="2deg"  nudgeTop={0} />
          <LetterTile char="M" color="#00B894" rotate="-1deg" nudgeTop={6} />
          <LetterTile char="I" color="#F9A825" rotate="3deg"  nudgeTop={2} />
          <LetterTile char="E" color="#6C5CE7" rotate="-2deg" nudgeTop={5} />
          <View style={{ flex: 1 }} />
          <LetterTile char="!" color="#FD79A8" rotate="4deg"  nudgeTop={3} />
          <LetterTile char="★" color="#FDCB6E" rotate="-2deg" nudgeTop={0} />
        </View>

        {/* ── Row 1: Chores + Events ───────────────────────────────────────── */}
        <View style={styles.row}>
          <Pressable onPress={() => router.push('/(tabs)/chores')} style={{ flex: 1.1 }}>
            {/* Chores — purple strip, red margin line, ruled paper */}
            <Note tilt="left" color={C.magnetPurple} showMarginLine style={{ flex: 1 }}>
              <Text style={styles.noteLabel}>THIS WEEK</Text>
              <Text style={styles.noteTitle}>Chores</Text>

              {choresLoading ? (
                <Text style={styles.noteMeta}>Loading…</Text>
              ) : chores.length === 0 ? (
                <Text style={styles.noteMeta}>Nothing today ✓</Text>
              ) : (
                <>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${(doneCount / chores.length) * 100}%` as any },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressLabel}>{doneCount}/{chores.length} done</Text>
                  {chores.slice(0, 5).map((c) => {
                    const dotColor = memberMap[c.assignedTo]?.color ?? C.noteMeta;
                    return (
                      <View key={c.id} style={styles.choreRow}>
                        <View style={[styles.choreDot, { backgroundColor: c.isCompleted ? C.progressBg : dotColor }]} />
                        <Text numberOfLines={1} style={[styles.choreText, c.isCompleted && styles.choreTextDone]}>
                          {c.title}
                        </Text>
                      </View>
                    );
                  })}
                </>
              )}
              {!choresLoading && chores.length > 0 && (
                <Text style={styles.tapHint}>tap to open →</Text>
              )}
            </Note>
          </Pressable>

          {/* Events — yellow strip, slightly warmer paper */}
          <Note tilt="right" color={C.magnetYellow} bg={C.noteAlt} style={{ flex: 0.9 }}>
            <Text style={styles.noteLabel}>COMING UP</Text>
            <Text style={styles.noteTitle}>Calendar</Text>

            {eventsLoading ? (
              <Text style={styles.noteMeta}>Loading…</Text>
            ) : events.length === 0 ? (
              <Text style={styles.noteMeta}>All clear!</Text>
            ) : (
              events.map((e) => (
                <View key={e.id} style={styles.eventRow}>
                  <View style={[styles.eventDot, { backgroundColor: e.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eventTitle} numberOfLines={1}>{e.title}</Text>
                    <Text style={styles.eventTime}>{formatEventTime(e.startTime)}</Text>
                  </View>
                </View>
              ))
            )}
          </Note>
        </View>

        {/* ── Filler: scattered emoji magnets ─────────────────────────────
            Small round decorative magnets drifting at the edge. */}
        <View style={[styles.fillerRow, { justifyContent: 'flex-end', marginBottom: 4 }]}>
          <EmojiMagnet emoji="🏠" color="#B2BEC3" rotate="-6deg" size={32} />
          <EmojiMagnet emoji="⭐" color="#FDCB6E" rotate="5deg"  size={28} />
          <EmojiMagnet emoji="📝" color="#A29BFE" rotate="-3deg" size={30} />
        </View>

        {/* ── Row 2: Expiring soon — coral strip, full width ───────────────── */}
        <Note tilt="mild" color={C.magnetCoral} style={styles.noteWide}>
          <Text style={styles.noteLabel}>PANTRY ALERT</Text>
          <Text style={styles.noteTitle}>Expiring Soon</Text>

          {pantryLoading ? (
            <Text style={styles.noteMeta}>Loading…</Text>
          ) : expiring.length === 0 ? (
            <Text style={styles.noteMeta}>Everything's fresh  ✓</Text>
          ) : (
            <View style={styles.chipRow}>
              {expiring.map((item) => {
                const days   = differenceInCalendarDays(item.expirationDate!.toDate(), now);
                const urgent = days <= 1;
                return (
                  <View key={item.id} style={[styles.expiryChip, urgent && styles.expiryChipUrgent]}>
                    <Text style={[styles.expiryName, urgent && styles.expiryNameUrgent]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.expiryDays, { color: urgent ? C.magnetCoral : C.magnetYellow }]}>
                      {days === 0 ? 'today' : days === 1 ? 'tmrw' : `${days}d`}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </Note>

        {/* ── Row 3: Shopping + filler tiles ──────────────────────────────── */}
        <View style={styles.row}>
          <Pressable onPress={() => router.push('/(tabs)/shopping')} style={{ flex: 1 }}>
            <Note tilt="steep" color={C.magnetMint} foldCorner style={{ flex: 1 }}>
              <Text style={styles.noteLabel}>SHOPPING LIST</Text>
              <Text style={styles.noteTitle}>
                {shoppingLoading
                  ? '…'
                  : uncheckedCount === 0
                  ? 'All stocked up!'
                  : `${uncheckedCount} to grab`}
              </Text>
              {!shoppingLoading && uncheckedCount > 0 && (
                <Text style={styles.tapHint}>tap to open →</Text>
              )}
            </Note>
          </Pressable>

          {/* Filler side: a small column of letter tiles */}
          <View style={styles.sideFillerCol}>
            <LetterTile char="2" color="#E17055" rotate="5deg"  nudgeTop={0} />
            <LetterTile char="B" color="#74B9FF" rotate="-4deg" nudgeTop={8} />
            <LetterTile char="?" color="#A29BFE" rotate="2deg"  nudgeTop={6} />
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: C.fridgeBg },
  fridge:       { flex: 1 },
  fridgeContent:{ paddingHorizontal: 14, paddingBottom: 32 },

  // header
  fridgeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 2,
  },
  houseName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#3A3835',
    letterSpacing: -0.5,
  },
  houseDate: {
    fontSize: 12,
    color: C.noteMeta,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  avatarRow: { flexDirection: 'row', gap: 6 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  avatarInitial: { color: '#fff', fontWeight: '800', fontSize: 13 },

  // layout
  row:      { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 14 },
  noteWide: { marginBottom: 14 },

  // ── Note card ──────────────────────────────────────────────────────────────
  noteOuter: {
    borderRadius: 3,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 9,
    shadowOffset: { width: 2, height: 6 },
    elevation: 6,
  },
  noteStrip: {
    height: 30,
    // borderRadius handled by overflow:hidden on noteOuter
  },
  // absolute magnet that overlaps the strip
  magnetAnchor: {
    position: 'absolute',
    top: 5,           // (30px strip - 20px magnet) / 2 = 5
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  notePaper: {
    padding: 14,
    paddingTop: 16,
    position: 'relative',
  },
  // subtle horizontal ruled lines — purely decorative background detail
  ruleLine: {
    position: 'absolute',
    left: 14,
    right: 14,
    top: 40,
    height: 1,
    backgroundColor: C.noteLines,
  },
  // red left margin line (like composition paper)
  marginLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 28,
    width: 1,
    backgroundColor: C.noteMargin,
  },
  // folded corner illusion
  foldCorner: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderTopWidth: 18,
    borderRightWidth: 18,
    borderTopColor: 'transparent',
    borderRightColor: C.fridgeBg + 'CC',
  },

  // ── Magnet ──────────────────────────────────────────────────────────────────
  magnetBody: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: 3,
    paddingRight: 3,
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 7,
  },
  magnetShine: {
    width: 6,
    height: 4,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  magnetDimple: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    top: 6,
    left: 6,
  },

  // ── Note typography ─────────────────────────────────────────────────────────
  noteLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: C.noteLabel,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: C.noteText,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  noteMeta: { fontSize: 12, color: C.noteMeta, marginTop: 2 },
  tapHint:  { fontSize: 10, color: C.magnetMint, marginTop: 6, fontWeight: '600' },

  // ── Chores ──────────────────────────────────────────────────────────────────
  progressTrack: {
    height: 4,
    backgroundColor: C.progressBg,
    borderRadius: 2,
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressFill: { height: 4, backgroundColor: C.magnetPurple, borderRadius: 2 },
  progressLabel: { fontSize: 10, color: C.noteMeta, marginBottom: 8 },
  choreRow: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 3 },
  choreDot: { width: 7, height: 7, borderRadius: 3.5 },
  choreText: { fontSize: 12, color: C.noteText, flex: 1 },
  choreTextDone: { textDecorationLine: 'line-through', color: C.noteLabel },

  // ── Events ──────────────────────────────────────────────────────────────────
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#EDE8DC',
  },
  eventDot:  { width: 7, height: 7, borderRadius: 3.5, marginTop: 4 },
  eventTitle:{ fontSize: 12, fontWeight: '700', color: C.noteText },
  eventTime: { fontSize: 10, color: C.noteMeta, marginTop: 1 },

  // ── Expiry chips ─────────────────────────────────────────────────────────────
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  expiryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  expiryChipUrgent: { backgroundColor: '#FFF0ED' },
  expiryName:       { fontSize: 11, fontWeight: '600', color: C.noteText },
  expiryNameUrgent: { color: C.magnetCoral },
  expiryDays:       { fontSize: 10, fontWeight: '800' },

  // ── Letter tiles (decorative) ────────────────────────────────────────────────
  letterTile: {
    width: 26,
    height: 30,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 3,
    shadowOffset: { width: 1, height: 3 },
    elevation: 5,
    overflow: 'hidden',
  },
  letterTileShine: {
    position: 'absolute',
    top: 2,
    left: 3,
    width: 10,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  letterChar: {
    fontSize: 14,
    fontWeight: '900',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // ── Emoji magnets (decorative) ───────────────────────────────────────────────
  emojiMagnet: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 1, height: 3 },
    elevation: 4,
  },

  // ── Filler layout ────────────────────────────────────────────────────────────
  fillerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 7,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  sideFillerCol: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 40,
    width: 44,
  },
});
