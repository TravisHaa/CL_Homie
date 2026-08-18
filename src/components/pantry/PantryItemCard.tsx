import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { daysUntilExpiry } from '@/src/hooks/usePantry';
import type { PantryItem } from '@/src/types';

interface Props {
  item: PantryItem;
  onDelete: (itemId: string) => void;
}

function expiryLabel(days: number): { text: string; color: string } {
  if (days === Infinity) return { text: '', color: '#aaa' };
  if (days < 0) return { text: `expired ${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'} ago`, color: '#E17055' };
  if (days === 0) return { text: 'expires today', color: '#E17055' };
  if (days === 1) return { text: 'expires tomorrow', color: '#FDCB6E' };
  return { text: `expires in ${days} days`, color: '#7A6652' };
}

export function PantryItemCard({ item, onDelete }: Props) {
  const days = daysUntilExpiry(item);
  const expiry = expiryLabel(days);
  const isExpired = days !== Infinity && days <= 0;

  return (
    <View style={styles.card}>
      {/* Icon */}
      <View style={styles.iconWrap}>
        <Ionicons name="fast-food-outline" size={22} color="#3D6B5E" />
      </View>

      {/* Text */}
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        {expiry.text ? (
          <Text style={[styles.expiry, { color: expiry.color }]}>{expiry.text}</Text>
        ) : (
          <Text style={styles.noExpiry}>No expiry set</Text>
        )}
      </View>

      {/* Action */}
      <TouchableOpacity onPress={() => onDelete(item.id)}
        style={[styles.throwBtn, !isExpired && styles.throwBtnMuted]}
        activeOpacity={0.75}
      >
        <Text style={[styles.throwText, !isExpired && styles.throwTextMuted]}>
          {isExpired ? 'throw' : 'remove'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginBottom: 10,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F0EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  name: {
    fontFamily: 'AlbertSans_700Bold',
    fontSize: 15,
    color: '#2E0800',
    marginBottom: 3,
  },
  expiry: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 13,
  },
  noExpiry: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 13,
    color: '#C4A98A',
  },
  throwBtn: {
    backgroundColor: '#2D1A0E',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  throwBtnMuted: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#D4C4B0',
  },
  throwText: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  throwTextMuted: {
    color: '#7A6652',
  },
});
