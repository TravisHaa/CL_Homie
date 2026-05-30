import { AddShoppingItemForm } from '@/src/components/shopping/AddShoppingItemForm';
import { Avatar } from '@/src/components/ui';
import type { AddItemInput } from '@/src/hooks/useShoppingList';
import { useShoppingList } from '@/src/hooks/useShoppingList';
import { useHouseStore } from '@/src/store/houseStore';
import { PALETTE, RADIUS, SHADOWS, SPACING, TYPE } from '@/src/theme/palette';
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
        {/* Figma 2694:24596 — material-symbols:add-rounded at size-[24]. */}
        <Ionicons name="add" size={24} color={PALETTE.ink} />
      </Pressable>

      <AddShoppingItemForm ref={formRef} onSubmit={onAdd} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PALETTE.cream },
  content: { padding: SPACING.base, gap: SPACING.sm, paddingBottom: 96 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
  // Figma 2694:24489 — Gowun Batang Bold 22 for Pantry; v3-shopping.png shows the larger 32px Header 1 (TYPE.header) used for screen titles.
  title: { ...TYPE.header, color: PALETTE.ink },
  // Figma 2694:24490 — Albert Sans Regular 14, espresso 65/67%.
  subtitle: { ...TYPE.body, color: PALETTE.inkMuted, marginTop: SPACING.xs },
  // Figma 2694:24491 — bg white, h-[33px], px-[8px] py-[2px], rounded-[999px].
  pantryLink: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    backgroundColor: PALETTE.white,
    height: 33, paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.pill,
    marginTop: SPACING.xs,
  },
  pantryLinkText: { ...TYPE.label, color: PALETTE.ink },
  pills: { gap: SPACING.sm, paddingVertical: SPACING.sm },
  // Pill h~22.88 rounded ~16 per V3 spec; px keeps the Figma-style padding.
  pill: {
    backgroundColor: PALETTE.white,
    borderRadius: RADIUS.pill,
    paddingVertical: 6, paddingHorizontal: 14,
  },
  pillActive: { backgroundColor: PALETTE.teal },
  pillText: { ...TYPE.label, color: PALETTE.ink, textTransform: 'capitalize' },
  pillTextActive: { color: PALETTE.onAction },
  empty: { ...TYPE.small, color: PALETTE.inkMuted, marginTop: SPACING.base },
  // Figma 2694:24498 — bg white, rounded-[24px], gap-[14px], px-[12px] py-[10px]; SHADOWS.card from palette tokens.
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: PALETTE.white, borderRadius: 22,
    paddingHorizontal: SPACING.md, paddingVertical: 10,
    ...SHADOWS.card,
  },
  cardDone: { backgroundColor: PALETTE.sand },
  // Figma 2694:24500 size-[36px] food icon, wrapped in cream chip per v3-shopping.png.
  foodIcon: { width: 36, height: 36, borderRadius: RADIUS.pill, backgroundColor: PALETTE.cream, alignItems: 'center', justifyContent: 'center' },
  checkDone: { width: 24, height: 24, borderRadius: 12, backgroundColor: PALETTE.teal, alignItems: 'center', justifyContent: 'center' },
  // Figma 2694:24503 — Albert Sans Medium 14 #2e0800.
  itemName: { ...TYPE.bodyMedium, color: PALETTE.ink, flex: 1 },
  // Figma 2694:24516 — Albert Sans Regular 12 rgba(46,8,0,0.65/67).
  itemMeta: { ...TYPE.small, color: PALETTE.inkMuted, marginTop: 2, textTransform: 'capitalize' },
  itemDone: { color: PALETTE.inkFaint, textDecorationLine: 'line-through' },
  purchasedHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.lg, marginBottom: SPACING.xs },
  // Figma 2694:24532 — sub-section header, Albert Sans Medium 16 #2e0800.
  section: { ...TYPE.header2, color: PALETTE.ink },
  // PALETTE.danger #E00000 per v3-shopping.png "Clear all" link tone.
  clearAll: { ...TYPE.label, color: PALETTE.danger },
  // Figma 2694:24595 — bottom-[124px] right-[24px], rounded-[999px], p-[12px] with 24px add icon; sand surface per v3-shopping.png.
  fab: {
    position: 'absolute', right: SPACING.xl, bottom: SPACING.xl,
    width: 56, height: 56, borderRadius: RADIUS.pill,
    backgroundColor: PALETTE.sand,
    alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.card,
  },
});
