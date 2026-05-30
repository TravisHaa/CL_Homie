/**
 * RecentActivity — dark espresso "polaroid filmstrip" of the latest house
 * activity, with the "Recent Activity" blue pill header floating above it.
 *
 * Figma: file vHSQVWWJUkFGm0cJtzjhT7
 *   - pill   2694:26978  (top: 410, left: calc(50% + 1px),  rotate: -7.33deg)
 *   - strip  2694:26975  (top: 439, left: calc(50% + 34px), w: 127.7, h: 404.2,
 *                         rotate: -1.68deg)
 *
 * The activity feed is derived entirely from existing hooks — there is no
 * dedicated `/activity` collection. We merge three streams, sort by timestamp
 * desc, and render the top 4:
 *   - completed chores  →  "<title>" marked as done       (avatar = completedBy)
 *   - shopping adds     →  "<name>" added to Shopping List (avatar = addedBy)
 *   - event creations   →  "<title>" event created         (avatar = createdBy)
 *
 * The strip is sized for 4 polaroid frames. If we have fewer than 4 entries,
 * an empty white "spacer" frame fills the bottom (matches Figma).
 *
 * This is a self-contained widget — no props. It positions itself absolutely
 * over the home canvas (CANVAS_W = 402 in app/(tabs)/index.tsx), so it must be
 * rendered inside a positioned parent of that width.
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import { formatDistanceToNow } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/src/components/ui';
import { useCalendarEvents } from '@/src/hooks/useCalendarEvents';
import { useChores } from '@/src/hooks/useChores';
import { useShoppingList } from '@/src/hooks/useShoppingList';
import { useHouseStore } from '@/src/store/houseStore';
import { FONTS, PALETTE, SPACING } from '@/src/theme/palette';

// ── Layout constants pulled from the Figma frame ─────────────────────────────
// Figma anchors at calc(50% + X) on a 402-wide home canvas → left = 201 + X.
const CANVAS_HALF = 201;

const PILL_TOP = 410;
const PILL_LEFT = CANVAS_HALF + 1;
const PILL_ROTATE = '-7.33deg';

const STRIP_TOP = 439;
const STRIP_LEFT = CANVAS_HALF + 34;
const STRIP_WIDTH = 127.7;
const STRIP_HEIGHT = 404.2;
const STRIP_ROTATE = '-1.68deg';

const MAX_ENTRIES = 4;
const SPACER_HEIGHT = 64; // Figma's empty trailing white frame

// ── Activity model ───────────────────────────────────────────────────────────
type ActivityKind = 'chore' | 'shopping' | 'event';

interface ActivityEntry {
  id: string;
  kind: ActivityKind;
  /** Bold subject (chore title / item name / event title). */
  subject: string;
  /** Plain-text body that follows the subject. */
  body: string;
  /** Whether to bold a final phrase in `body` (e.g. "Shopping List"). */
  boldSuffix?: string;
  /** Firestore Timestamp for sorting + relative display. */
  ts: Timestamp;
  /** User id whose avatar represents this action. */
  userId: string | null;
}

/** Drop the "about " prefix from `formatDistanceToNow` for receipt-tight copy. */
function relativeTime(ts: Timestamp): string {
  return formatDistanceToNow(ts.toDate(), { addSuffix: true }).replace(/^about /, '');
}

// ── Component ────────────────────────────────────────────────────────────────
export default function RecentActivity() {
  const { chores } = useChores();
  const { items: shoppingItems } = useShoppingList();
  const { events } = useCalendarEvents();
  const memberMap = useHouseStore((s) => s.memberMap);

  const entries: ActivityEntry[] = [];

  for (const c of chores) {
    if (c.isCompleted && c.completedAt) {
      entries.push({
        id: `chore-${c.id}`,
        kind: 'chore',
        subject: c.title,
        body: ' marked as done',
        ts: c.completedAt,
        userId: c.completedBy,
      });
    }
  }

  for (const s of shoppingItems) {
    if (s.createdAt) {
      entries.push({
        id: `shop-${s.id}`,
        kind: 'shopping',
        subject: s.name,
        body: ' added to Shopping List',
        boldSuffix: 'Shopping List',
        ts: s.createdAt,
        userId: s.addedBy ?? null,
      });
    }
  }

  for (const e of events) {
    if (e.createdAt) {
      entries.push({
        id: `event-${e.id}`,
        kind: 'event',
        subject: e.title,
        body: ' event created',
        ts: e.createdAt,
        userId: e.createdBy ?? null,
      });
    }
  }

  entries.sort((a, b) => b.ts.toMillis() - a.ts.toMillis());
  const top = entries.slice(0, MAX_ENTRIES);

  return (
    <>
      {/* Filmstrip — espresso outer card with white polaroid frames inside */}
      <View style={styles.strip} pointerEvents="box-none">
        {top.map((entry) => {
          const info = entry.userId ? memberMap[entry.userId] : undefined;
          return (
            <View key={entry.id} style={styles.frame}>
              <Text
                style={styles.text}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                <Text style={styles.textBold}>{entry.subject}</Text>
                {renderBody(entry.body, entry.boldSuffix)}
              </Text>
              <View style={styles.metaRow}>
                <Avatar
                  size={20}
                  name={info?.displayName}
                  uri={info?.avatarUrl ?? null}
                  color={info?.color}
                />
                <Text style={styles.meta} numberOfLines={1}>
                  {relativeTime(entry.ts)}
                </Text>
              </View>
            </View>
          );
        })}
        {top.length < MAX_ENTRIES && <View style={styles.spacerFrame} />}
      </View>

      {/* Pill header — drawn after the strip so it sits on top */}
      <View style={styles.pill}>
        <Ionicons name="time-outline" size={16} color={PALETTE.ink} />
        <Text style={styles.pillText}>Recent Activity</Text>
      </View>
    </>
  );
}

/**
 * Splits the body so a trailing phrase (e.g. "Shopping List") can be bolded
 * inline. If no suffix is provided the whole body renders as a single span.
 */
function renderBody(body: string, boldSuffix?: string) {
  if (!boldSuffix) return <Text>{body}</Text>;
  const idx = body.lastIndexOf(boldSuffix);
  if (idx === -1) return <Text>{body}</Text>;
  return (
    <>
      <Text>{body.slice(0, idx)}</Text>
      <Text style={styles.textBold}>{boldSuffix}</Text>
      <Text>{body.slice(idx + boldSuffix.length)}</Text>
    </>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Filmstrip outer container — espresso card, drop shadow, tilted slightly.
  strip: {
    position: 'absolute',
    top: STRIP_TOP,
    left: STRIP_LEFT,
    width: STRIP_WIDTH,
    height: STRIP_HEIGHT,
    backgroundColor: PALETTE.ink,
    padding: SPACING.sm,
    gap: SPACING.sm,
    flexDirection: 'column',
    alignItems: 'stretch',
    transform: [{ rotate: STRIP_ROTATE }],
    // Figma "card v1" drop shadow — soft warm brown.
    shadowColor: '#403021',
    shadowOpacity: 0.17,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 1 },
    elevation: 4,
  },
  // Individual polaroid frame.
  frame: {
    flex: 1,
    minHeight: 0,
    backgroundColor: PALETTE.white,
    padding: SPACING.sm,
    gap: SPACING.sm,
    flexDirection: 'column',
    alignItems: 'flex-start',
    overflow: 'hidden',
    // Figma "inner shadow v1" — RN can't do real inset shadows, so use a hairline
    // border in the same warm-brown family to approximate the rim.
    borderWidth: 0.5,
    borderColor: 'rgba(64, 48, 33, 0.33)',
  },
  // Empty trailing white frame (when fewer than MAX_ENTRIES activities).
  spacerFrame: {
    height: SPACER_HEIGHT,
    backgroundColor: PALETTE.white,
    borderWidth: 0.5,
    borderColor: 'rgba(64, 48, 33, 0.33)',
  },
  // Body text — Albert Sans Regular 12, espresso, up to 2 lines.
  text: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    color: PALETTE.ink,
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    lineHeight: 14,
  },
  textBold: {
    fontFamily: FONTS.bodyBold,
    fontWeight: '700',
  },
  // Avatar + relative time row.
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    width: '100%',
  },
  meta: {
    flex: 1,
    color: PALETTE.ink,
    opacity: 0.8,
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
  },

  // Pill header — light blue rounded pill with clock icon + label.
  pill: {
    position: 'absolute',
    top: PILL_TOP,
    left: PILL_LEFT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: PALETTE.pillBlue,
    borderRadius: 999,
    transform: [{ rotate: PILL_ROTATE }],
    // Figma "magnet v1" drop shadow.
    shadowColor: '#403021',
    shadowOpacity: 0.5,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  pillText: {
    color: PALETTE.ink,
    fontFamily: FONTS.display,
    fontSize: 16,
    lineHeight: 19,
  },
});
