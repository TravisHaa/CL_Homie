import { AddShoppingItemForm } from '@/src/components/shopping/AddShoppingItemForm';
import { Avatar } from '@/src/components/ui';
import type { AddItemInput } from '@/src/hooks/useShoppingList';
import { useShoppingList } from '@/src/hooks/useShoppingList';
import { useHouseStore } from '@/src/store/houseStore';
import { FONTS, PALETTE, RADIUS, SPACING, TYPE } from '@/src/theme/palette';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import BottomSheet from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ShoppingScreen() {
  const { items, addShoppingItem, toggleShoppingItem, clearChecked } = useShoppingList();
  const memberMap = useHouseStore((s) => s.memberMap);
  const router = useRouter();
  const formRef = useRef<BottomSheet>(null);
  const [filter, setFilter] = useState<string>('All');

  const unchecked = items.filter((i) => !i.isChecked);
  const checked = items.filter((i) => i.isChecked);

  const categories = useMemo(() => {
    const set = new Set(unchecked.map((i) => i.category).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [unchecked]);

  const visible = filter === 'All' ? unchecked : unchecked.filter((i) => i.category === filter);

  const onAdd = async (data: AddItemInput) => {
    await addShoppingItem(data);
    formRef.current?.close();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Shopping List</Text>
            <Text style={styles.subtitle}>Items to purchase</Text>
          </View>
          <Pressable style={styles.pantryLink} onPress={() => router.push('/(tabs)/pantry')}>
            <Ionicons name="cube-outline" size={16} color={PALETTE.ink} />
            <Text style={styles.pantryLinkText}>See pantry</Text>
          </Pressable>
        </View>

        {/* Category filter pills */}
        {categories.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
            {categories.map((c) => (
              <Pressable key={c} onPress={() => setFilter(c)} style={[styles.pill, filter === c && styles.pillActive]}>
                <Text style={[styles.pillText, filter === c && styles.pillTextActive]}>{c}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {/* Items */}
        {visible.length === 0 ? (
          <Text style={styles.empty}>Nothing to buy — list is clear ✓</Text>
        ) : (
          visible.map((item) => {
            const m = memberMap[item.addedBy];
            return (
              <View key={item.id} style={styles.card}>
                <Pressable hitSlop={8} onPress={() => toggleShoppingItem(item.id, item.isChecked)} style={styles.foodIcon}>
                  <MaterialCommunityIcons name="food-apple-outline" size={18} color={PALETTE.ink} />
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemMeta}>
                    {item.quantity > 1 ? `${item.quantity} ${item.unit ?? ''} · ` : ''}{item.category}
                  </Text>
                </View>
                <Avatar name={m?.displayName} uri={m?.avatarUrl} color={m?.color} size={24} />
              </View>
            );
          })
        )}

        {/* Purchased this week */}
        {checked.length > 0 ? (
          <>
            <View style={styles.purchasedHead}>
              <Text style={styles.section}>{checked.length} items purchased this week</Text>
              <Pressable onPress={clearChecked}><Text style={styles.clearAll}>Clear all</Text></Pressable>
            </View>
            {checked.map((item) => {
              const m = memberMap[item.checkedBy ?? item.addedBy];
              return (
                <View key={item.id} style={[styles.card, styles.cardDone]}>
                  <Pressable hitSlop={8} onPress={() => toggleShoppingItem(item.id, item.isChecked)} style={styles.checkDone}>
                    <Ionicons name="checkmark" size={16} color={PALETTE.onAction} />
                  </Pressable>
                  <Text style={[styles.itemName, styles.itemDone]}>{item.name}</Text>
                  <Avatar name={m?.displayName} uri={m?.avatarUrl} color={m?.color} size={24} />
                </View>
              );
            })}
          </>
        ) : null}
      </ScrollView>

      <Pressable accessibilityLabel="Add item" style={styles.fab} onPress={() => formRef.current?.expand()}>
        <Ionicons name="add" size={28} color={PALETTE.ink} />
      </Pressable>

      <AddShoppingItemForm ref={formRef} onSubmit={onAdd} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PALETTE.cream },
  content: { padding: SPACING.base, gap: SPACING.sm, paddingBottom: 96 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  title: { ...TYPE.header, color: PALETTE.ink },
  subtitle: { ...TYPE.small, color: PALETTE.inkMuted },
  pantryLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  pantryLinkText: { ...TYPE.small, color: PALETTE.ink },
  pills: { gap: SPACING.sm, paddingVertical: SPACING.xs },
  pill: { backgroundColor: PALETTE.white, borderRadius: RADIUS.pill, paddingVertical: 8, paddingHorizontal: 18 },
  pillActive: { backgroundColor: PALETTE.teal },
  pillText: { ...TYPE.label, color: PALETTE.ink, textTransform: 'capitalize' },
  pillTextActive: { color: PALETTE.onAction },
  empty: { ...TYPE.small, color: PALETTE.inkMuted, marginTop: SPACING.base },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: PALETTE.white, borderRadius: RADIUS.lg, padding: SPACING.md,
    shadowColor: '#403021', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  cardDone: { backgroundColor: PALETTE.sand },
  foodIcon: { width: 36, height: 36, borderRadius: RADIUS.pill, backgroundColor: PALETTE.cream, alignItems: 'center', justifyContent: 'center' },
  checkDone: { width: 24, height: 24, borderRadius: 12, backgroundColor: PALETTE.teal, alignItems: 'center', justifyContent: 'center' },
  itemName: { ...TYPE.bodyMedium, color: PALETTE.ink, flex: 1 },
  itemMeta: { ...TYPE.small, color: PALETTE.inkMuted, marginTop: 2, textTransform: 'capitalize' },
  itemDone: { color: PALETTE.inkFaint, textDecorationLine: 'line-through' },
  purchasedHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.lg },
  section: { ...TYPE.heading, color: PALETTE.ink },
  clearAll: { ...TYPE.small, color: PALETTE.terracotta },
  fab: {
    position: 'absolute', right: SPACING.lg, bottom: SPACING.lg,
    width: 56, height: 56, borderRadius: RADIUS.pill, backgroundColor: PALETTE.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#403021', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
});
