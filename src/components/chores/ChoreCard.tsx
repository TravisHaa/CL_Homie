import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHouseStore } from '@/src/store/houseStore';
import type { Chore } from '@/src/types';

interface ChoreCardProps {
  chore: Chore;
  onToggle: (choreId: string, currentValue: boolean) => void;
}

export function ChoreCard({ chore, onToggle }: ChoreCardProps) {
  const memberMap = useHouseStore((s) => s.memberMap);
  const assignee = memberMap[chore.assignedTo];

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
        {assignee && (
          <Text style={styles.assignee}>{assignee.displayName}</Text>
        )}
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
});
