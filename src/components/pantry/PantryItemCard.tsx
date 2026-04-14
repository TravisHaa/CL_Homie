import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { daysUntilExpiry } from '@/src/hooks/usePantry';
import { useHouseStore } from '@/src/store/houseStore';
import type { PantryItem } from '@/src/types';

interface Props {
  item: PantryItem;
  onDelete: (itemId: string) => void;
}

function expiryColor(days: number): string {
  if (days <= 2) return '#E17055';
  if (days <= 5) return '#FDCB6E';
  return '#00B894';
}

function confidenceLabel(confidence: PantryItem['expirationConfidence']): string {
  switch (confidence) {
    case 'manual':
      return 'Manual';
    case 'scanned':
      return 'Scanned';
    case 'predicted':
      return 'Predicted';
  }
}

function categoryLabel(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function PantryItemCard({ item, onDelete }: Props) {
  const memberMap = useHouseStore((s) => s.memberMap);
  const days = daysUntilExpiry(item);
  const ownerName = memberMap[item.ownedBy]?.displayName ?? 'Unknown';

  function handleLongPress() {
    Alert.alert(item.name, 'What would you like to do?', [
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => onDelete(item.id),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onLongPress={handleLongPress}
      activeOpacity={0.85}
    >
      <View style={styles.row}>
        <View style={styles.main}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.meta}>
            {item.quantity} {item.unit} · {categoryLabel(item.category)}
          </Text>
          <View style={styles.bottomRow}>
            <Text style={styles.owner}>{ownerName}</Text>
            {item.isShared && (
              <View style={styles.sharedBadge}>
                <Text style={styles.sharedText}>Shared</Text>
              </View>
            )}
            <View style={styles.confidenceBadge}>
              <Text style={styles.confidenceText}>
                {confidenceLabel(item.expirationConfidence)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.right}>
          {days !== Infinity ? (
            <View style={[styles.expiryBadge, { backgroundColor: expiryColor(days) }]}>
              <Text style={styles.expiryDays}>{days < 0 ? 0 : days}</Text>
              <Text style={styles.expiryLabel}>days</Text>
            </View>
          ) : (
            <View style={[styles.expiryBadge, { backgroundColor: '#DFE6E9' }]}>
              <Text style={[styles.expiryLabel, { color: '#636e72', fontSize: 10 }]}>
                No{'\n'}expiry
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    padding: 14,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  main: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 2,
  },
  meta: {
    fontSize: 13,
    color: '#636e72',
    marginBottom: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  owner: {
    fontSize: 12,
    color: '#636e72',
  },
  sharedBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sharedText: {
    fontSize: 11,
    color: '#00B894',
    fontWeight: '600',
  },
  confidenceBadge: {
    backgroundColor: '#F0F3F4',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  confidenceText: {
    fontSize: 11,
    color: '#636e72',
    fontWeight: '500',
  },
  right: {
    alignItems: 'center',
  },
  expiryBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expiryDays: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  expiryLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
