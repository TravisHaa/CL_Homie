import { GridBackground } from '@/src/components/GridBackground';
import { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AddButtonIcon } from '@/src/components/AddButtonIcon';
import BottomSheet from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { useShoppingList } from '@/src/hooks/useShoppingList';
import { useHouseStore } from '@/src/store/houseStore';
import { useAuthStore } from '@/src/store/authStore';
import { ShoppingItemRow } from '@/src/components/shopping/ShoppingItemRow';
import { AddShoppingItemForm } from '@/src/components/shopping/AddShoppingItemForm';
import { SHOPPING_CATEGORIES } from '@/src/utils/categories';
import type { AddItemInput } from '@/src/hooks/useShoppingList';
import type { ShoppingCategory } from '@/src/utils/categories';

// ─── design tokens ────────────────────────────────────────────────────────────
const R = {
  textMute: '#9B6A4C',
  dashed: '#CCAD8C',
};

// Dashed horizontal rule
function DashedRule({ style }: { style?: object }) {
  return <View style={[styles.dashedRule, style]} />;
}

export default function ShoppingScreen() {
  const { items, isLoading, addShoppingItem, toggleShoppingItem, clearChecked } =
    useShoppingList();
  const { memberMap } = useHouseStore();
  const currentUserId = useAuthStore((s) => s.userProfile?.id);
  const formRef = useRef<BottomSheet>(null);
  const [activeCategory, setActiveCategory] = useState<ShoppingCategory | null>(null);
  const [foodGroupActive, setFoodGroupActive] = useState(false);

  const router = useRouter();

  const FOOD_CATEGORIES: ShoppingCategory[] = ['produce', 'dairy', 'meat', 'snacks', 'beverages', 'condiments', 'grains'];

  const CATEGORY_LABELS: Partial<Record<ShoppingCategory, string>> = {
    cleaning: 'Amenities',
    frozen: 'Furniture',
  };

  const unchecked = items.filter((i) => !i.isChecked);
  const checked   = items.filter((i) => i.isChecked);

  const allSections = SHOPPING_CATEGORIES
    .map((cat) => ({ category: cat, data: unchecked.filter((i) => i.category === cat) }))
    .filter((s) => s.data.length > 0);

  const availableCategories = allSections.map((s) => s.category).filter((c) => c !== 'other' && c !== 'produce');

  const filteredUnchecked = activeCategory
    ? unchecked.filter((i) => i.category === activeCategory)
    : foodGroupActive
    ? unchecked.filter((i) => FOOD_CATEGORIES.includes(i.category as any))
    : unchecked;

  const handleFoodGroup = () => {
    setFoodGroupActive((v) => !v);
    setActiveCategory(null);
  };

  const handleCategoryPill = (cat: ShoppingCategory) => {
    setActiveCategory((prev) => (prev === cat ? null : cat));
    setFoodGroupActive(false);
  };

  const handleAddItem = async (data: AddItemInput) => {
    await addShoppingItem(data);
    formRef.current?.close();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <GridBackground />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.homeBackButton} onPress={() => router.replace('/(tabs)')} hitSlop={10} accessibilityLabel="Back to home">
          <Ionicons name="chevron-back" size={22} color="#2D3436" />
        </TouchableOpacity>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Shopping List</Text>
            <Text style={styles.headerSubtitle}>Items to purchase</Text>
          </View>
          <TouchableOpacity
            style={styles.pantryBtn}
            onPress={() => router.push('/(tabs)/pantry')}
            activeOpacity={0.75}
          >
            <Ionicons name="file-tray-stacked-outline" size={15} color="#2D3436" />
            <Text style={styles.pantryBtnText}>See pantry</Text>
          </TouchableOpacity>
        </View>

        {/* ── Category pills ──────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsRow}
        >
          <TouchableOpacity
            style={[styles.pill, foodGroupActive && styles.pillActive]}
            onPress={handleFoodGroup}
            activeOpacity={0.75}
          >
            <Ionicons
              name="bag-handle-outline"
              size={13}
              color={foodGroupActive ? '#fff' : '#2D3436'}
            />
            <Text style={[styles.pillText, foodGroupActive && styles.pillTextActive]}>
              Food
            </Text>
          </TouchableOpacity>

          {availableCategories.map((cat) => {
            const active = activeCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => handleCategoryPill(cat)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name="bag-handle-outline"
                  size={13}
                  color={active ? '#fff' : '#2D3436'}
                />
                <Text style={[styles.pillText, active && styles.pillTextActive]}>
                  {CATEGORY_LABELS[cat] ?? cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
          {isLoading ? (
            <ActivityIndicator color={R.textMute} style={{ marginVertical: 40 }} />
          ) : (
            <>
              {/* ── Line items ───────────────────────────────────────────── */}
              {filteredUnchecked.length === 0 && checked.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>- LIST IS EMPTY -</Text>
                  <Text style={styles.emptyHint}>tap + to add items</Text>
                </View>
              ) : (
                filteredUnchecked.length > 0 && (
                  <>
                    <Text style={styles.categoryLabelFeatured}>To purchase</Text>
                    <View style={styles.itemsBackdrop}>
                      {filteredUnchecked.map((item) => (
                        <ShoppingItemRow key={item.id} item={item} memberMap={memberMap} currentUserId={currentUserId} onToggle={toggleShoppingItem} />
                      ))}
                    </View>
                  </>
                )
              )}

              {/* ── Purchased section ───────────────────────────────────── */}
              {checked.length > 0 && (
                <>
                  <DashedRule />
                  <View style={styles.cartToggleRow}>
                    <Text style={styles.purchasedLabel}>{checked.length} items purchased this week</Text>
                    <TouchableOpacity onPress={clearChecked} activeOpacity={0.7}>
                      <Text style={styles.clearAllBtn}>Clear all</Text>
                    </TouchableOpacity>
                  </View>

                  {checked.map((item) => (
                    <ShoppingItemRow
                      key={item.id}
                      item={item}
                      memberMap={memberMap}
                      onToggle={toggleShoppingItem}
                      currentUserId={currentUserId}
                    />
                  ))}
                </>
              )}
            </>
          )}

        <View style={{ height: 180 }} />
      </ScrollView>

      {/* ── FAB ─────────────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => formRef.current?.expand()}
        activeOpacity={0.85}
      >
        <AddButtonIcon size={64} />
      </TouchableOpacity>

      <AddShoppingItemForm ref={formRef} onSubmit={handleAddItem} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#FCF5EE' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 8 },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 8,
    gap: 12,
  },
  homeBackButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'GowunBatang_700Bold',
    color: '#2E0800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: 'AlbertSans_400Regular',
    color: '#636e72',
    marginTop: 2,
  },
  pantryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#DFE6E9',
  },
  pantryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E0800',
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#DFE6E9',
  },
  pillActive: {
    backgroundColor: '#3D6B5E',
    borderColor: '#3D6B5E',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E0800',
  },
  pillTextActive: {
    color: '#fff',
  },

  // ── Dashed rule ────────────────────────────────────────────────────────────
  dashedRule: {
    borderBottomWidth: 1,
    borderBottomColor: R.dashed,
    borderStyle: 'dashed',
    marginVertical: 10,
  },

  // ── Category label ─────────────────────────────────────────────────────────
  categoryLabelFeatured: {
    fontFamily: 'GowunBatang_700Bold',
    fontSize: 13,
    color: '#2E0800',
    paddingVertical: 6,
  },

  // ── Cart toggle ────────────────────────────────────────────────────────────
  cartToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemsBackdrop: {
    backgroundColor: 'rgba(210, 210, 210, 0.2)',
    borderRadius: 20,
    padding: 8,
    marginBottom: 4,
  },
  purchasedLabel: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 13,
    color: '#2E0800',
  },
  clearAllBtn: {
    fontFamily: 'AlbertSans_500Medium',
    fontSize: 13,
    color: '#C0392B',
  },

  // ── Empty state ────────────────────────────────────────────────────────────
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyText: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    color: R.textMute,
    letterSpacing: 2,
  },
  emptyHint: {
    fontFamily: 'SpaceMono',
    fontSize: 9,
    color: R.dashed,
    letterSpacing: 1,
    marginTop: 6,
  },

  // ── FAB ─────────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    bottom: 110,
    right: 20,
  },
});
