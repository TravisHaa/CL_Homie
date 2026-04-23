import { useHouseStore } from '@/src/store/houseStore';
import type { Chore } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import { format, isPast, isToday } from 'date-fns';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ChoreCardProps {
  chore: Chore;
  onToggle: (choreId: string, currentValue: boolean) => void;
}

export function ChoreCard({ chore, onToggle }: ChoreCardProps) {
  const memberMap = useHouseStore((s) => s.memberMap);
  const assignee = memberMap[chore.assignedTo];

  const dueDate = chore.dueAt ? chore.dueAt.toDate() : null;
  const isOverdue = dueDate && !chore.isCompleted && isPast(dueDate) && !isToday(dueDate);
  const isDueToday = dueDate && !chore.isCompleted && isToday(dueDate);

  const formatDueDate = () => {
    if (!dueDate) return null;
    if (isToday(dueDate)) return 'Due: Today';
    return `Due: ${format(dueDate, 'MMM d')}`;
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.checkbox}
        onPress={() => onToggle(chore.id, chore.isCompleted)}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name={chore.isCompleted ? 'checkbox' : 'square-outline'}
          size={24}
          color={chore.isCompleted ? '#2D3436' : '#DFE6E9'}
        />
      </TouchableOpacity>
      <View style={styles.info}>
        <Text style={[styles.title, chore.isCompleted && styles.titleCompleted]}>
          {chore.title}
        </Text>
        <View style={styles.metaRow}>
          {assignee && (
            <Text style={styles.assignee}>{assignee.displayName}</Text>
          )}
          {dueDate && !chore.isCompleted && (
            <Text style={[
              styles.dueDate,
              isOverdue && styles.dueDateOverdue,
              isDueToday && styles.dueDateToday,
            ]}>
              {formatDueDate()}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#DFE6E9',
  },
  checkbox: {
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: '#B2BEC3',
  },
  assignee: {
    fontSize: 13,
    color: '#636e72',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  dueDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#636e72',
  },
  dueDateOverdue: {
    color: '#E17055',
  },
  dueDateToday: {
    color: '#F9A825',
  },
});
