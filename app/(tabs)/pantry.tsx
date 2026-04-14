import { useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomSheetModal, BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { usePantry } from '@/src/hooks/usePantry';
import { PantryItemCard } from '@/src/components/pantry/PantryItemCard';
import { AddPantryItemForm } from '@/src/components/pantry/AddPantryItemForm';
import type { PantryItem } from '@/src/types';

const P = {
  mintBg: '#EAF7F0',
  plateBg: '#DDF4E7',
  plateBorder: '#A8D9BF',
  textStrong: '#1D4736',
  textSoft: '#5D7B6F',
  alertBg: '#FFF1D5',
  alertBorder: '#F1B748',
  fab: '#1B8F63',
};

export default function PantryScreen() {
  return (
    <BottomSheetModalProvider>
      <PantryContent />
    </BottomSheetModalProvider>
  );
}

function PantryContent() {
  const { items, expiringItems, isLoading, addPantryItem, deletePantryItem } =
    usePantry();
  const addFormRef = useRef<BottomSheetModal>(null);

  function renderItem({ item }: { item: PantryItem }) {
    return <PantryItemCard item={item} onDelete={deletePantryItem} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Pantry</Text>
          <Text style={styles.subtitle}>
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </Text>
        </View>
      </View>

      {/* Expiry alert banner */}
      {expiringItems.length > 0 && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertIcon}>⚠️</Text>
          <Text style={styles.alertText}>
            {expiringItems.length}{' '}
            {expiringItems.length === 1 ? 'item expires' : 'items expire'} in 3
            days or less
          </Text>
        </View>
      )}

      {/* Content */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2D3436" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>Your pantry is empty</Text>
          <Text style={styles.emptyHint}>
            Tap + to add your first item
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => addFormRef.current?.present()}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Add form bottom sheet */}
      <AddPantryItemForm ref={addFormRef} onAdd={addPantryItem} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: P.mintBg,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 10,
    borderRadius: 14,
    backgroundColor: P.plateBg,
    borderWidth: 1,
    borderColor: P.plateBorder,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: P.textStrong,
  },
  subtitle: {
    color: P.textSoft,
    marginTop: 2,
    fontSize: 14,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.alertBg,
    borderLeftWidth: 4,
    borderLeftColor: P.alertBorder,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  alertIcon: {
    fontSize: 16,
  },
  alertText: {
    fontSize: 14,
    color: P.textStrong,
    fontWeight: '600',
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: P.textStrong,
    marginBottom: 6,
  },
  emptyHint: {
    fontSize: 14,
    color: P.textSoft,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: P.fab,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabIcon: {
    fontSize: 28,
    color: '#FFFFFF',
    lineHeight: 32,
  },
});
