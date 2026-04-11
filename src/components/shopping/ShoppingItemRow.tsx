import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORY_COLORS } from '@/src/utils/colors';
import type { ShoppingItem } from '@/src/types';

interface MemberInfo {
  displayName: string;
  color: string;
  avatarUrl: string | null;
}

interface Props {
  item: ShoppingItem;
  memberMap: Record<string, MemberInfo>;
  onToggle: (itemId: string, currentValue: boolean) => void;
}

export function ShoppingItemRow({ item, memberMap, onToggle }: Props) {
  const categoryColor = CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.other;
  const addedByName = memberMap[item.addedBy]?.displayName ?? 'someone';

  return (
    <TouchableOpacity
      style={[styles.card, item.isChecked && styles.cardChecked]}
      onPress={() => onToggle(item.id, item.isChecked)}
      activeOpacity={0.7}
    >
      <View style={styles.checkbox}>
        {item.isChecked ? (
          <Ionicons name="checkmark-circle" size={22} color="#00B894" />
        ) : (
          <Ionicons name="square-outline" size={22} color="#DFE6E9" />
        )}
      </View>
      <View style={styles.body}>
        <Text style={[styles.name, item.isChecked && styles.nameChecked]}>
          {item.name}
        </Text>
        <Text style={styles.meta}>
          {item.quantity} {item.unit} · added by {addedByName}
        </Text>
      </View>
      <View style={[styles.badge, { backgroundColor: categoryColor }]}>
        <Text style={styles.badgeText}>{item.category}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardChecked: { opacity: 0.4 },
  checkbox: { width: 22, height: 22, justifyContent: 'center', alignItems: 'center' },
  body: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#2D3436' },
  nameChecked: { textDecorationLine: 'line-through', color: '#636e72' },
  meta: { fontSize: 12, color: '#636e72', marginTop: 2 },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2D3436',
    textTransform: 'capitalize',
  },
});
