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
import BottomSheet from '@gorhom/bottom-sheet';
import { useShoppingList } from '@/src/hooks/useShoppingList';
import { useHouseStore } from '@/src/store/houseStore';
import { ShoppingItemRow } from '@/src/components/shopping/ShoppingItemRow';
import { AddShoppingItemForm } from '@/src/components/shopping/AddShoppingItemForm';
import { SHOPPING_CATEGORIES } from '@/src/utils/categories';
import type { AddItemInput } from '@/src/hooks/useShoppingList';

export default function ShoppingScreen() {
  const { items, isLoading, addShoppingItem, toggleShoppingItem, clearChecked } =
    useShoppingList();
  const { memberMap } = useHouseStore();
  const formRef = useRef<BottomSheet>(null);
  const [cartExpanded, setCartExpanded] = useState(true);

  const unchecked = items.filter((i) => !i.isChecked);
  const checked = items.filter((i) => i.isChecked);

  // Group unchecked items by category, preserving SHOPPING_CATEGORIES order
  const sections = SHOPPING_CATEGORIES
    .map((cat) => ({ category: cat, data: unchecked.filter((i) => i.category === cat) }))
    .filter((s) => s.data.length > 0);

  const handleAddItem = async (data: AddItemInput) => {
    await addShoppingItem(data);
    formRef.current?.close();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Shopping</Text>
            <Text style={styles.subtitle}>
              {isLoading
                ? 'Loading…'
                : `${unchecked.length} item${unchecked.length !== 1 ? 's' : ''} left`}
            </Text>
          </View>
          {checked.length > 0 && (
            <TouchableOpacity onPress={clearChecked} style={styles.clearBtn} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={14} color="#636e72" />
              <Text style={styles.clearBtnText}>Clear cart</Text>
            </TouchableOpacity>
          )}
        </View>

        {isLoading ? (
          <ActivityIndicator style={styles.loader} color="#B2BEC3" />
        ) : (
          <>
            {/* Unchecked items grouped by category */}
            {sections.map(({ category, data }) => (
              <View key={category}>
                <Text style={styles.sectionLabel}>{category.toUpperCase()}</Text>
                {data.map((item) => (
                  <ShoppingItemRow
                    key={item.id}
                    item={item}
                    memberMap={memberMap}
                    onToggle={toggleShoppingItem}
                  />
                ))}
              </View>
            ))}

            {/* Empty state */}
            {unchecked.length === 0 && checked.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="cart-outline" size={48} color="#DFE6E9" />
                <Text style={styles.emptyTitle}>List is empty</Text>
                <Text style={styles.emptySubtitle}>Tap + to add your first item</Text>
              </View>
            )}

            {/* In cart section */}
            {checked.length > 0 && (
              <View style={styles.cartSection}>
                <TouchableOpacity
                  style={styles.cartHeader}
                  onPress={() => setCartExpanded((v) => !v)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sectionLabel}>IN CART ({checked.length})</Text>
                  <Ionicons
                    name={cartExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#B2BEC3"
                  />
                </TouchableOpacity>
                {cartExpanded &&
                  checked.map((item) => (
                    <ShoppingItemRow
                      key={item.id}
                      item={item}
                      memberMap={memberMap}
                      onToggle={toggleShoppingItem}
                    />
                  ))}
              </View>
            )}

            {/* Bottom padding for FAB */}
            <View style={{ height: 100 }} />
          </>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => formRef.current?.expand()}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add item bottom sheet */}
      <AddShoppingItemForm ref={formRef} onSubmit={handleAddItem} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFBF5' },
  container: { flex: 1, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 8,
    marginBottom: 24,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#2D3436' },
  subtitle: { color: '#636e72', marginTop: 4 },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    backgroundColor: '#fff',
  },
  clearBtnText: { fontSize: 13, color: '#636e72', fontWeight: '600' },
  loader: { marginTop: 60 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B2BEC3',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#B2BEC3', marginTop: 8 },
  emptySubtitle: { fontSize: 14, color: '#B2BEC3' },
  cartSection: { marginTop: 16 },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2D3436',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
