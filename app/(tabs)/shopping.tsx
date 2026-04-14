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
import { format } from 'date-fns';
import BottomSheet from '@gorhom/bottom-sheet';
import { useShoppingList } from '@/src/hooks/useShoppingList';
import { useHouseStore } from '@/src/store/houseStore';
import { ShoppingItemRow } from '@/src/components/shopping/ShoppingItemRow';
import { AddShoppingItemForm } from '@/src/components/shopping/AddShoppingItemForm';
import { SHOPPING_CATEGORIES } from '@/src/utils/categories';
import type { AddItemInput } from '@/src/hooks/useShoppingList';

// ─── design tokens ────────────────────────────────────────────────────────────
const R = {
  paper:       '#FFF3E5',
  paperDark:   '#FCE8D2',
  border:      '#E9CBAA',
  dashed:      '#CCAD8C',
  textHdr:     '#5A2D18',
  textBody:    '#70412A',
  textMute:    '#9B6A4C',
  textDone:    '#C9A58A',
  doneBg:      '#FDE7D3',
  receiptEdge: '#F0D3B5',
  fab:         '#C15B2A',
};

// Decorative barcode strip
function Barcode() {
  const bars = [3,1,2,1,3,1,1,2,3,1,2,1,1,3,2,1,3,1,2,1,1,2,3,1];
  return (
    <View style={styles.barcodeWrap}>
      <View style={styles.barcodeStrips}>
        {bars.map((w, i) => (
          <View
            key={i}
            style={[
              styles.barcodeBar,
              {
                width: w * 2,
                backgroundColor: i % 2 === 0 ? R.textHdr : R.paper,
              },
            ]}
          />
        ))}
      </View>
      <Text style={styles.barcodeNum}>
        {format(new Date(), 'yyyyMMdd')}-HOMIE
      </Text>
    </View>
  );
}

// Dashed horizontal rule
function DashedRule({ style }: { style?: object }) {
  return <View style={[styles.dashedRule, style]} />;
}

export default function ShoppingScreen() {
  const { items, isLoading, addShoppingItem, toggleShoppingItem, clearChecked } =
    useShoppingList();
  const { memberMap } = useHouseStore();
  const formRef = useRef<BottomSheet>(null);
  const [cartExpanded, setCartExpanded] = useState(true);

  const unchecked = items.filter((i) => !i.isChecked);
  const checked   = items.filter((i) => i.isChecked);

  const sections = SHOPPING_CATEGORIES
    .map((cat) => ({ category: cat, data: unchecked.filter((i) => i.category === cat) }))
    .filter((s) => s.data.length > 0);

  const handleAddItem = async (data: AddItemInput) => {
    await addShoppingItem(data);
    formRef.current?.close();
  };

  const now = new Date();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Receipt paper ─────────────────────────────────────────────── */}
        <View style={styles.receipt}>

          {/* ── Receipt header ──────────────────────────────────────────── */}
          <View style={styles.receiptHeader}>
            <Text style={styles.storeName}>HOMIE MARKET</Text>
            <Text style={styles.storeTagline}>shared household · all locations</Text>
            <DashedRule style={{ marginTop: 10 }} />
            <View style={styles.receiptMeta}>
              <Text style={styles.receiptMetaText}>
                {format(now, 'MM/dd/yyyy  HH:mm')}
              </Text>
              <Text style={styles.receiptMetaText}>
                TXN #{format(now, 'MMdd')}-LIST
              </Text>
            </View>
            <DashedRule />
          </View>

          {isLoading ? (
            <ActivityIndicator color={R.textMute} style={{ marginVertical: 40 }} />
          ) : (
            <>
              {/* ── Line items by category ──────────────────────────────── */}
              {sections.length === 0 && checked.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>- LIST IS EMPTY -</Text>
                  <Text style={styles.emptyHint}>tap + to add items</Text>
                </View>
              ) : (
                sections.map(({ category, data }, idx) => (
                  <View key={category}>
                    {/* Category header */}
                    <Text style={styles.categoryLabel}>{category}</Text>

                    {/* Items */}
                    {data.map((item) => (
                      <ShoppingItemRow
                        key={item.id}
                        item={item}
                        memberMap={memberMap}
                        onToggle={toggleShoppingItem}
                      />
                    ))}

                    {/* Category subtotal */}
                    <View style={styles.subtotalRow}>
                      <Text style={styles.subtotalLabel}>
                        {category.toUpperCase()} SUBTOTAL
                      </Text>
                      <Text style={styles.subtotalValue}>{data.length} QTY</Text>
                    </View>

                    {idx < sections.length - 1 && <DashedRule />}
                  </View>
                ))
              )}

              {/* ── In cart section ─────────────────────────────────────── */}
              {checked.length > 0 && (
                <>
                  <DashedRule />
                  <TouchableOpacity
                    style={styles.cartToggleRow}
                    onPress={() => setCartExpanded((v) => !v)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.categoryLabel}>IN CART</Text>
                    <View style={styles.cartToggleRight}>
                      <Text style={styles.subtotalValue}>{checked.length} QTY</Text>
                      <Ionicons
                        name={cartExpanded ? 'chevron-up' : 'chevron-down'}
                        size={13}
                        color={R.textMute}
                        style={{ marginLeft: 6 }}
                      />
                    </View>
                  </TouchableOpacity>

                  {cartExpanded && checked.map((item) => (
                    <ShoppingItemRow
                      key={item.id}
                      item={item}
                      memberMap={memberMap}
                      onToggle={toggleShoppingItem}
                    />
                  ))}
                </>
              )}

              {/* ── Receipt total ────────────────────────────────────────── */}
              <DashedRule style={{ marginTop: 8 }} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>ITEMS REMAINING</Text>
                <Text style={styles.totalValue}>{unchecked.length}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>IN CART</Text>
                <Text style={styles.totalValue}>{checked.length}</Text>
              </View>

              {checked.length > 0 && (
                <>
                  <DashedRule style={{ marginVertical: 8 }} />
                  <TouchableOpacity
                    onPress={clearChecked}
                    style={styles.clearBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.clearBtnText}>CLEAR CART  ×</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}

          {/* ── Bottom decoratives ──────────────────────────────────────── */}
          <DashedRule style={{ marginTop: 20 }} />
          <Text style={styles.thankYou}>THANK YOU FOR SHOPPING</Text>
          <Text style={styles.tagline}>* HOMIE — HOUSEHOLD MADE EASY *</Text>
          <Barcode />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── FAB ─────────────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => formRef.current?.expand()}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color={R.paper} />
      </TouchableOpacity>

      <AddShoppingItemForm ref={formRef} onSubmit={handleAddItem} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: R.paperDark },
  scroll: { flex: 1 },
  scrollContent: { padding: 12, paddingTop: 8 },

  // ── Receipt paper ──────────────────────────────────────────────────────────
  receipt: {
    backgroundColor: R.paper,
    borderRadius: 2,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: R.border,
    shadowColor: '#9D552F',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  // ── Receipt header ─────────────────────────────────────────────────────────
  receiptHeader: { alignItems: 'center', marginBottom: 4 },
  storeName: {
    fontFamily: 'SpaceMono',
    fontSize: 20,
    fontWeight: '900',
    color: R.textHdr,
    letterSpacing: 4,
    textAlign: 'center',
  },
  storeTagline: {
    fontFamily: 'SpaceMono',
    fontSize: 9,
    color: R.textMute,
    letterSpacing: 1.5,
    marginTop: 2,
    textAlign: 'center',
  },
  receiptMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 4,
  },
  receiptMetaText: {
    fontFamily: 'SpaceMono',
    fontSize: 9,
    color: R.textMute,
    letterSpacing: 0.5,
  },

  // ── Dashed rule ────────────────────────────────────────────────────────────
  dashedRule: {
    borderBottomWidth: 1,
    borderBottomColor: R.dashed,
    borderStyle: 'dashed',
    marginVertical: 10,
  },

  // ── Category label ─────────────────────────────────────────────────────────
  categoryLabel: {
    fontFamily: 'SpaceMono',
    fontSize: 9,
    fontWeight: '700',
    color: R.textMute,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    paddingVertical: 6,
  },

  // ── Subtotal row ───────────────────────────────────────────────────────────
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    marginTop: 2,
  },
  subtotalLabel: {
    fontFamily: 'SpaceMono',
    fontSize: 8,
    color: R.textMute,
    letterSpacing: 1.5,
  },
  subtotalValue: {
    fontFamily: 'SpaceMono',
    fontSize: 8,
    color: R.textMute,
    letterSpacing: 1,
  },

  // ── Cart toggle ────────────────────────────────────────────────────────────
  cartToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartToggleRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // ── Total section ──────────────────────────────────────────────────────────
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  totalLabel: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    fontWeight: '700',
    color: R.textBody,
    letterSpacing: 1,
  },
  totalValue: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    fontWeight: '700',
    color: R.textBody,
  },

  // ── Clear cart ─────────────────────────────────────────────────────────────
  clearBtn: { alignItems: 'center', paddingVertical: 6 },
  clearBtnText: {
    fontFamily: 'SpaceMono',
    fontSize: 10,
    color: R.textMute,
    letterSpacing: 2,
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

  // ── Receipt footer ─────────────────────────────────────────────────────────
  thankYou: {
    fontFamily: 'SpaceMono',
    fontSize: 10,
    color: R.textMute,
    letterSpacing: 2.5,
    textAlign: 'center',
    marginTop: 8,
  },
  tagline: {
    fontFamily: 'SpaceMono',
    fontSize: 8,
    color: R.dashed,
    letterSpacing: 1.5,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },

  // ── Barcode ────────────────────────────────────────────────────────────────
  barcodeWrap: { alignItems: 'center', marginTop: 8 },
  barcodeStrips: {
    flexDirection: 'row',
    height: 36,
    alignItems: 'stretch',
  },
  barcodeBar: { height: '100%' },
  barcodeNum: {
    fontFamily: 'SpaceMono',
    fontSize: 7,
    color: R.textMute,
    letterSpacing: 1,
    marginTop: 4,
  },

  // ── FAB ────────────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 52,
    height: 52,
    borderRadius: 2,
    backgroundColor: R.fab,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
