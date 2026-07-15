import { GridBackground } from '@/src/components/GridBackground';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomSheetModal, BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { usePantry, daysUntilExpiry } from '@/src/hooks/usePantry';
import { PantryItemCard } from '@/src/components/pantry/PantryItemCard';
import { AddPantryItemForm } from '@/src/components/pantry/AddPantryItemForm';
import { ManualAddModal } from '@/src/components/pantry/ManualAddModal';
import { BarcodeScannerModal } from '@/src/components/pantry/BarcodeScannerModal';
import type { PantryItem } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AddButtonIcon } from '@/src/components/AddButtonIcon';

const P = {
  alertBg: '#FFF1D5',
  alertBorder: '#F1B748',
  textStrong: '#1D4736',
  textSoft: '#5D7B6F',
};

export default function PantryScreen() {
  return (
    <BottomSheetModalProvider>
      <PantryContent />
    </BottomSheetModalProvider>
  );
}

function PantryContent() {
  const { items, expiringItems, isLoading, addPantryItem, updatePantryItem, deletePantryItem } = usePantry();
  const addFormRef = useRef<BottomSheetModal>(null);
  const router = useRouter();

  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [pendingBarcode, setPendingBarcode] = useState<string | null>(null);
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<import('@/src/types').PantryItem | null>(null);

  function renderItem({ item }: { item: PantryItem }) {
    return (
      <PantryItemCard
        item={item}
        onDelete={deletePantryItem}
        onEdit={(i) => { setEditingItem(i); setManualModalVisible(true); }}
      />
    );
  }

  function handleScanNew() {
    setFabMenuOpen(false);
    setScannerVisible(true);
  }

  function handleAddManually() {
    setFabMenuOpen(false);
    setManualModalVisible(true);
  }

  function handleBarcodeScan(barcode: string) {
    setScannerVisible(false);
    setPendingBarcode(barcode);
    addFormRef.current?.present();
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <GridBackground />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={22} color="#2E0800" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Pantry</Text>
          <Text style={styles.subtitle}>See what shared goods you have</Text>
        </View>
        <TouchableOpacity hitSlop={12} onPress={handleScanNew}>
          <Ionicons name="scan-outline" size={24} color="#2E0800" />
        </TouchableOpacity>
      </View>


      {/* Content */}
      <View style={styles.contentArea}>
        <Image
          source={require('@/assets/images/Pantry-bg-asset.jpg')}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#2D3436" />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyTitle}>Your pantry is empty</Text>
            <Text style={styles.emptyHint}>Tap + to add your first item</Text>
          </View>
        ) : (
          <FlatList
            data={[...items].sort((a, b) => daysUntilExpiry(a) - daysUntilExpiry(b))}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Speed-dial overlay */}
      {fabMenuOpen && (
        <TouchableOpacity style={styles.menuBackdrop} activeOpacity={1} onPress={() => setFabMenuOpen(false)}>
          <View style={styles.menuButtons}>
            <TouchableOpacity style={styles.menuBtn} onPress={handleScanNew} activeOpacity={0.85}>
              <Text style={styles.menuBtnText}>Scan new item</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuBtn} onPress={handleAddManually} activeOpacity={0.85}>
              <Text style={styles.menuBtnText}>Add item manually</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setFabMenuOpen((v) => !v)} activeOpacity={0.8}>
        <AddButtonIcon size={64} />
      </TouchableOpacity>

      {/* Barcode scanner */}
      <BarcodeScannerModal
        visible={scannerVisible}
        onScan={handleBarcodeScan}
        onClose={() => setScannerVisible(false)}
      />

      {/* Scan → then fill form */}
      <AddPantryItemForm ref={addFormRef} onAdd={addPantryItem} initialBarcode={pendingBarcode} />

      {/* Manual add / edit centered modal */}
      <ManualAddModal
        visible={manualModalVisible}
        onClose={() => { setManualModalVisible(false); setEditingItem(null); }}
        onAdd={addPantryItem}
        onUpdate={updatePantryItem}
        editItem={editingItem}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCF5EE',
  },
  contentArea: {
    flex: 1,
    overflow: 'hidden',
    marginHorizontal: 28,
    marginBottom: 16,
    borderRadius: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCenter: {
    flex: 1,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 30,
    fontFamily: 'GowunBatang_700Bold',
    color: '#2E0800',
  },
  subtitle: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 13,
    color: '#7A6652',
    marginTop: 2,
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
  alertIcon: { fontSize: 16 },
  alertText: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 14,
    color: P.textStrong,
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  emptyTitle: {
    fontFamily: 'AlbertSans_700Bold',
    fontSize: 18,
    color: P.textStrong,
    marginBottom: 6,
  },
  emptyHint: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 14,
    color: P.textSoft,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 100,
  },
  fab: {
    position: 'absolute',
    bottom: 110,
    right: 20,
  },
  menuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingBottom: 184,
    paddingRight: 20,
  },
  menuButtons: {
    gap: 12,
    alignItems: 'flex-end',
  },
  menuBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  menuBtnText: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 15,
    color: '#2D3436',
  },
});
