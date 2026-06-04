import { useHouseStore } from '@/src/store/houseStore';
import { CHORE_THEME } from '@/src/theme/chores';
import type { Chore } from '@/src/types';
import { notify } from '@/src/utils/confirm';
import { Ionicons } from '@expo/vector-icons';
import { useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ReanimatedSwipeable, {
    type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';

interface ChoreCardProps {
  chore: Chore;
  /** Compact status label rendered as a pill on the right of the card. */
  statusLabel: string;
  onToggle: (choreId: string, currentValue: boolean) => void;
  onPress?: (chore: Chore) => void;
  /**
   * When provided, the row becomes swipeable: dragging left far enough opens
   * the red trash action and auto-triggers a destructive `confirm()` prompt
   * before invoking this handler. If the user cancels the prompt the row
   * snaps back closed.
   */
  onDelete?: (choreId: string) => Promise<void> | void;
}

/**
 * Card for a single chore in the Home Chore Tracker list. Layout matches the
 * Figma mockup: leading completion checkbox, two-line body (title +
 * "Assigned to X" with the assignee's color-dot initial), trailing status pill
 * (teal for to-do, espresso for completed).
 *
 * Interaction split:
 *   - tapping the checkbox toggles completion (the keyword-derived icon was
 *     replaced because users want a clear "mark done" affordance, not a
 *     decorative chore-type emoji);
 *   - tapping the body opens the detail sheet via `onPress`.
 */
export function ChoreCard({
  chore,
  statusLabel,
  onToggle,
  onPress,
  onDelete,
}: ChoreCardProps) {
  const memberMap = useHouseStore((s) => s.memberMap);
  const assignee = memberMap[chore.assignedTo];
  const done = chore.isCompleted;
  const initial = assignee?.displayName?.trim()?.[0]?.toUpperCase() ?? '?';

  const swipeableRef = useRef<SwipeableMethods>(null);

  // Triggered by ReanimatedSwipeable when the user drags past `rightThreshold`
  // and releases, or when the user taps the revealed trash button. Deletes
  // immediately — no confirmation prompt — and surfaces failures via notify.
  const handleSwipeDelete = async () => {
    if (!onDelete) return;
    try {
      await onDelete(chore.id);
      // On success the parent list re-renders without this chore and the row
      // unmounts; no need to close the swipeable manually.
    } catch (err: any) {
      notify('Could not delete chore', err?.message ?? 'Unknown error');
      swipeableRef.current?.close();
    }
  };

  const renderRightActions = () => (
    <View style={styles.deleteAction}>
      <TouchableOpacity
        style={styles.deleteIconTile}
        onPress={handleSwipeDelete}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${chore.title}`}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Ionicons name="trash" size={22} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  const cardContent = (
    <View style={[styles.card, done && styles.cardDone]}>
      <TouchableOpacity
        style={[styles.checkbox, done ? styles.checkboxDone : styles.checkboxIdle]}
        onPress={() => onToggle(chore.id, chore.isCompleted)}
        activeOpacity={0.6}
        hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={done ? `Mark ${chore.title} as not done` : `Mark ${chore.title} as done`}
      >
        {done && <Ionicons name="checkmark" size={16} color={CHORE_THEME.onAccent} />}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.body}
        onPress={onPress ? () => onPress(chore) : undefined}
        disabled={!onPress}
        activeOpacity={0.7}
      >
        <Text style={[styles.title, done && styles.titleDone]} numberOfLines={1}>
          {chore.title}
        </Text>
        {assignee && (
          <View style={styles.assigneeRow}>
            <View style={[styles.assigneeAvatar, { backgroundColor: assignee.color }]}>
              <Text style={styles.assigneeInitial}>{initial}</Text>
            </View>
            <Text style={styles.assigneeText} numberOfLines={1}>
              Assigned to {assignee.displayName}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={[styles.statusPill, done ? styles.statusPillDone : styles.statusPillActive]}>
        <Text
          style={[styles.statusText, done ? styles.statusTextDone : styles.statusTextActive]}
          numberOfLines={1}
        >
          {statusLabel}
        </Text>
      </View>
    </View>
  );

  if (!onDelete) {
    return cardContent;
  }

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      friction={2}
      rightThreshold={64}
      overshootRight={false}
      renderRightActions={renderRightActions}
      containerStyle={styles.swipeableContainer}
      onSwipeableOpen={(direction) => {
        if (direction === 'right') handleSwipeDelete();
      }}
    >
      {cardContent}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  // Swipeable wrapper: keeps the same rounded clipping as the card so the red
  // action panel beneath it shares the card's corner radius while sliding. The
  // 10px row gap stays on `card.marginBottom`; the action panel matches with
  // its own `marginBottom` so the red tile aligns with the card's visible
  // height instead of bleeding into the gap.
  swipeableContainer: {
    borderRadius: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    gap: 10,
    shadowColor: '#2E0800',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  // Done cards sit on a slightly warmer cream so the white "to do" rows
  // stay visually grouped above without needing a section divider.
  cardDone: {
    backgroundColor: CHORE_THEME.cardBg,
    shadowOpacity: 0,
    elevation: 0,
  },
  // Completion checkbox: empty circle with hairline border when to-do, teal
  // fill with a white check when done. Replaces the original decorative icon
  // tile so the primary affordance is unmistakably "mark this done".
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  checkboxIdle: {
    borderWidth: 1.5,
    borderColor: CHORE_THEME.hairline,
    backgroundColor: 'transparent',
  },
  checkboxDone: {
    backgroundColor: CHORE_THEME.accent,
    borderWidth: 1.5,
    borderColor: CHORE_THEME.accent,
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontFamily: 'AlbertSans_600SemiBold',
    color: '#2D1A0E',
    marginBottom: 4,
  },
  titleDone: {
    color: '#7A6652',
  },
  assigneeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  assigneeAvatar: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assigneeInitial: {
    fontSize: 8,
    fontFamily: 'AlbertSans_800ExtraBold',
    color: '#FFFFFF',
  },
  assigneeText: {
    fontSize: 11,
    fontFamily: 'AlbertSans_400Regular',
    color: '#7A6652',
    flexShrink: 1,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'center',
  },
  statusPillActive: {
    backgroundColor: CHORE_THEME.accent,
  },
  statusPillDone: {
    backgroundColor: CHORE_THEME.text,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'AlbertSans_700Bold',
  },
  statusTextActive: {
    color: CHORE_THEME.onAccent,
  },
  statusTextDone: {
    color: '#FFFFFF',
  },
  // Right-swipe action panel. The panel itself is transparent; the red tile
  // inside is sized to roughly match the card's visual height (excluding the
  // 10px row gap that lives on `swipeableContainer`) so the rounded trash
  // chip lines up with the card edge as it slides away.
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingLeft: 8,
    paddingRight: 4,
    marginBottom: 10,
  },
  deleteIconTile: {
    width: 56,
    height: '100%',
    minHeight: 56,
    borderRadius: 12,
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
