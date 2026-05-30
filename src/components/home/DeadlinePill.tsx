/**
 * DeadlinePill — small rotated pink pill ("deadline: M/D") shown on the home
 * dashboard. Surfaces the next upcoming one-time chore with a hard `dueAt`.
 *
 * Sourced from Figma node 2694:26985 (file vHSQVWWJUkFGm0cJtzjhT7) on the V3
 * home board. The pill renders at its intrinsic dimensions; the consumer is
 * expected to wrap it in a positioning View. A default rotation of ~10.59deg
 * is applied so the component looks correct when used standalone.
 *
 * Behavior: returns `null` when no qualifying chore exists, so callers can
 * render it unconditionally without guarding.
 */
import { format } from 'date-fns';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { useChores } from '@/src/hooks/useChores';
import { FONTS, PALETTE } from '@/src/theme/palette';

type DeadlinePillProps = {
  /** Merged with the default rotation transform; lets the parent position the pill. */
  style?: StyleProp<ViewStyle>;
};

export default function DeadlinePill({ style }: DeadlinePillProps) {
  const { chores } = useChores();

  const now = Date.now();
  const nextDeadline = chores
    .filter(
      (c) =>
        c.recurrence === 'once' &&
        c.dueAt != null &&
        !c.isCompleted &&
        c.dueAt.toMillis() > now,
    )
    .sort((a, b) => a.dueAt!.toMillis() - b.dueAt!.toMillis())[0];

  if (!nextDeadline || !nextDeadline.dueAt) return null;

  const label = format(nextDeadline.dueAt.toDate(), 'M/d');

  return (
    <View style={[styles.pill, style]}>
      <Text style={styles.label}>deadline:</Text>
      <Text style={styles.date}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFC7C3',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    // "magnet v1" drop shadow from Figma effect variables.
    shadowColor: '#403021',
    shadowOpacity: 0.5,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
    // Default rotation so the pill reads correctly when used without a parent
    // transform; consumers can override by passing `style={{ transform: [...] }}`.
    transform: [{ rotate: '10.59deg' }],
  },
  label: {
    width: 50,
    textAlign: 'center',
    color: PALETTE.ink,
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    lineHeight: 12,
  },
  date: {
    width: 50,
    textAlign: 'center',
    color: PALETTE.ink,
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    lineHeight: 12,
  },
});
