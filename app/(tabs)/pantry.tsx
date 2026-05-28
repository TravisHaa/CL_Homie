import { AddPantryItemForm } from '@/src/components/pantry/AddPantryItemForm';
import { daysUntilExpiry, usePantry } from '@/src/hooks/usePantry';
import { FONTS, PALETTE, RADIUS, SPACING, TYPE } from '@/src/theme/palette';
import type { PantryItem } from '@/src/types';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { format } from 'date-fns';
import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function expiryLabel(item: PantryItem): string {
  const d = daysUntilExpiry(item);
  if (d == null) return '';
  if (d < 0) return `expired ${Math.abs(d)} day${Math.abs(d) === 1 ? '' : 's'} ago`;
  if (d === 0) return 'expires today';
  return `expires in ${d} day${d === 1 ? '' : 's'}`;
}

export default function PantryScreen() {
  const { items, expiringItems, addPantryItem, deletePantryItem } = usePantry();
  const addRef = useRef<BottomSheetModal>(null);

  const expiringIds = new Set(expiringItems.map((i) => i.id));
  const rest = items.filter((i) => !expiringIds.has(i.id));

  const card = (item: PantryItem, expiring: boolean) => (
    <View key={item.id} style={[styles.card, expiring && styles.cardExpiring]}>
      <View style={styles.icon}>
        <MaterialCommunityIcons name="food-variant" size={18} color={PALETTE.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={[styles.meta, expiring && styles.metaExpiring]}>
          {expiring
            ? expiryLabel(item)
            : `${item.expirationDate ? `expires ${format(item.expirationDate.toDate(), 'MMM d, yyyy')} · ` : ''}Qty: ${item.quantity}`}
        </Text>
      </View>
      {expiring ? (
        <Pressable style={styles.throwPill} onPress={() => deletePantryItem(item.id)}>
          <Text style={styles.throwText}>throw</Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Pantry</Text>
            <Text style={styles.subtitle}>See what shared goods you have</Text>
          </View>
          <Pressable accessibilityLabel="Scan barcode" hitSlop={8} onPress={() => addRef.current?.present()}>
            <MaterialCommunityIcons name="barcode-scan" size={24} color={PALETTE.ink} />
          </Pressable>
        </View>

        {expiringItems.length > 0 ? (
          <>
            <Text style={styles.section}>Expiring soon</Text>
            {expiringItems.map((i) => card(i, true))}
          </>
        ) : null}

        <Text style={styles.section}>All shared items</Text>
        {items.length === 0 ? (
          <Text style={styles.empty}>Your pantry is empty — tap + to add an item</Text>
        ) : (
          rest.map((i) => card(i, false))
        )}
      </ScrollView>

      <Pressable accessibilityLabel="Add pantry item" style={styles.fab} onPress={() => addRef.current?.present()}>
        <Ionicons name="add" size={28} color={PALETTE.ink} />
      </Pressable>

      <AddPantryItemForm ref={addRef} onAdd={addPantryItem} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PALETTE.cream },
  content: { padding: SPACING.base, gap: SPACING.sm, paddingBottom: 96 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  title: { ...TYPE.header, color: PALETTE.ink },
  subtitle: { ...TYPE.small, color: PALETTE.inkMuted },
  section: { ...TYPE.heading, color: PALETTE.ink, marginTop: SPACING.base },
  empty: { ...TYPE.small, color: PALETTE.inkMuted },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: PALETTE.white, borderRadius: RADIUS.lg, padding: SPACING.md,
    shadowColor: '#403021', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  cardExpiring: { backgroundColor: '#FBE9E7' },
  icon: { width: 36, height: 36, borderRadius: RADIUS.pill, backgroundColor: PALETTE.cream, alignItems: 'center', justifyContent: 'center' },
  name: { ...TYPE.bodyMedium, color: PALETTE.ink },
  meta: { ...TYPE.small, color: PALETTE.inkMuted, marginTop: 2 },
  metaExpiring: { color: PALETTE.expiry },
  throwPill: { backgroundColor: PALETTE.ink, borderRadius: RADIUS.pill, paddingVertical: 6, paddingHorizontal: 14 },
  throwText: { ...TYPE.label, color: PALETTE.onAction },
  fab: {
    position: 'absolute', right: SPACING.lg, bottom: SPACING.lg,
    width: 56, height: 56, borderRadius: RADIUS.pill, backgroundColor: PALETTE.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#403021', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
});
