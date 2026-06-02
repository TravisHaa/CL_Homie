import { useHouseStore } from '@/src/store/houseStore';
import { CHORE_THEME } from '@/src/theme/chores';
import type { Chore } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import { format, isPast, isToday } from 'date-fns';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ChoreCardProps {
  chore: Chore;
  onToggle: (choreId: string, currentValue: boolean) => void;
  onPress?: (chore: Chore) => void;
}

export function ChoreCard({ chore, onToggle, onPress }: ChoreCardProps) {
  const memberMap = useHouseStore((s) => s.memberMap);
  const assignee = memberMap[chore.assignedTo];

  const dueDate = chore.dueAt ? chore.dueAt.toDate() : null;
  const isOverdue = dueDate && !chore.isCompleted && isPast(dueDate) && !isToday(dueDate);
  const isDueToday = dueDate && !chore.isCompleted && isToday(dueDate);

  const formatDueDate = () => {
    if (!dueDate) return null;
    if (isToday(dueDate)) return 'Due Today';
    return `Due ${format(dueDate, 'MMM d')}`;
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity
        onPress={() => onToggle(chore.id, chore.isCompleted)}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={[styles.checkBase, chore.isCompleted ? styles.checkDone : styles.checkIdle]}
      >
        {chore.isCompleted && (
          <Ionicons name="checkmark" size={14} color={CHORE_THEME.onAccent} />
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.info}
        onPress={onPress ? () => onPress(chore) : undefined}
        disabled={!onPress}
        activeOpacity={0.7}
      >
        <Text style={[styles.title, chore.isCompleted && styles.titleCompleted]} numberOfLines={1}>
          {chore.title}
        </Text>

        <View style={styles.metaRow}>
          {assignee && (
            <View style={styles.assigneeRow}>
              <View style={[styles.assigneeDot, { backgroundColor: assignee.color }]} />
              <Text style={styles.assignee} numberOfLines={1}>
                {assignee.displayName}
              </Text>
            </View>
          )}
          {dueDate && !chore.isCompleted && (
            <Text
              style={[
                styles.dueDate,
                isOverdue && styles.dueDateOverdue,
                isDueToday && styles.dueDateToday,
              ]}
            >
              {formatDueDate()}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CHORE_THEME.cardBg,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: CHORE_THEME.hairline,
  },
  checkBase: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkIdle: {
    borderWidth: 1.5,
    borderColor: CHORE_THEME.hairline,
    backgroundColor: 'transparent',
  },
  checkDone: {
    backgroundColor: CHORE_THEME.accent,
    borderWidth: 1.5,
    borderColor: CHORE_THEME.accent,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: CHORE_THEME.text,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: CHORE_THEME.textFaint,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    gap: 8,
  },
  assigneeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  assigneeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  assignee: {
    fontSize: 13,
    color: CHORE_THEME.textMuted,
    flexShrink: 1,
  },
  dueDate: {
    fontSize: 12,
    fontWeight: '600',
    color: CHORE_THEME.textMuted,
  },
  dueDateOverdue: {
    color: CHORE_THEME.overdue,
  },
  dueDateToday: {
    color: CHORE_THEME.dueToday,
  },
});
