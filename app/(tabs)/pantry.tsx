import { AddPantryItemForm } from '@/src/components/pantry/AddPantryItemForm';
import { daysUntilExpiry, usePantry } from '@/src/hooks/usePantry';
import { FONTS, PALETTE, RADIUS, SHADOWS, SPACING, TYPE } from '@/src/theme/palette';
import type { PantryItem } from '@/src/types';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { format } from 'date-fns';
import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Figma reference: file vHSQVWWJUkFGm0cJtzjhT7, node 2694:24480 ("pantry")

function expiryLabel(item: PantryItem): string {
  const d = daysUntilExpiry(item);
  if (!isFinite(d)) return '';
  if (d < 0) {
    const n = Math.abs(d);
    // node 2694:24505 — red "expired two days ago" style label
    return `expired ${n} day${n === 1 ? '' : 's'} ago`;
  }
  if (d === 0) return 'expires today';
  // node 2694:24516 — "expires in 2 days"
  return `expires in ${d} day${d === 1 ? '' : 's'}`;
}

// Faint background grid behind the cards (Figma "background grid" — gridGreen @ 40%)
// node 2694:24481 (BackgroundGrid component instance on the pantry frame)
function GridBackground() {
  const lines = Array.from({ length: 60 });
  return (
    <View style={styles.grid} pointerEvents="none">
      {lines.map((_, i) => (
        <View key={`h${i}`} style={[styles.gridLineH, { top: i * 16 }]} />
      ))}
      {lines.map((_, i) => (
        <View key={`v${i}`} style={[styles.gridLineV, { left: i * 16 }]} />
      ))}
    </View>
  );
}

export default function PantryScreen() {
  const { items, expiringItems, addPantryItem, deletePantryItem } = usePantry();
  const addRef = useRef<BottomSheetModal>(null);

  const expiringIds = new Set(expiringItems.map((i) => i.id));
  const rest = items.filter((i) => !expiringIds.has(i.id));

  // node 2694:24498 / 2694:24509 — expiring item card (white, rounded-24, px-12 py-10)
  const expiringCard = (item: PantryItem) => {
    const d = daysUntilExpiry(item);
    const isOverdue = isFinite(d) && d < 0;
    // Disabled "throw" pill (node 2694:24528) when expiry is further out (still within
    // expiring window of 3 days but not yet expired/today).
    const throwDisabled = isFinite(d) && d > 0;
    return (
      <View key={item.id} style={styles.itemCard}>
        <View style={styles.itemRow}>
          <View style={styles.icon}>
            <MaterialCommunityIcons name="food-variant" size={20} color={PALETTE.ink} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.itemMeta, isOverdue && styles.itemMetaOverdue]} numberOfLines={1}>
              {expiryLabel(item)}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => deletePantryItem(item.id)}
          style={[styles.throwPill, throwDisabled && styles.throwPillDisabled]}
          hitSlop={6}
        >
          {/* node 2694:24507 / 2694:24529 — "throw" label */}
          <Text style={[styles.throwText, throwDisabled && styles.throwTextDisabled]}>throw</Text>
        </Pressable>
      </View>
    );
  };

  // node 2694:24534 — all-shared item card (white, rounded-24, px-12 py-10, no throw pill)
  const sharedCard = (item: PantryItem) => {
    const dateLabel = item.expirationDate
      ? `expires ${format(item.expirationDate.toDate(), 'MMM d, yyyy')}`
      : '';
    return (
      <View key={item.id} style={styles.itemCard}>
        <View style={styles.itemRow}>
          <View style={styles.icon}>
            <MaterialCommunityIcons name="food-variant" size={20} color={PALETTE.ink} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            {/* node 2694:24541 — expiry + vertical divider + quantity */}
            <View style={styles.metaRow}>
              {dateLabel ? <Text style={styles.itemMeta}>{dateLabel}</Text> : null}
              {dateLabel ? <View style={styles.metaDivider} /> : null}
              <Text style={styles.itemMeta}>{`Quantity : ${item.quantity}`}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* node 2694:24485 — header row, gap 24 */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            {/* node 2694:24489 — Gowun Batang Bold 22 */}
            <Text style={styles.title}>Pantry</Text>
            {/* node 2694:24490 — Albert Sans Regular 14, ink @ 65% */}
            <Text style={styles.subtitle}>See what shared goods you have</Text>
          </View>
          {/* node 2694:24491 — white rounded-pill barcode button (h:33, px:8 py:2) */}
          <Pressable
            accessibilityLabel="Scan barcode"
            hitSlop={8}
            onPress={() => addRef.current?.present()}
            style={styles.barcodeBtn}
          >
            <MaterialCommunityIcons name="barcode-scan" size={20} color={PALETTE.ink} />
          </Pressable>
        </View>

        {/* node 2694:24494 — single rounded-20 card hosting both sections with grid bg */}
        <View style={styles.surface}>
          <GridBackground />
          <View style={styles.surfaceTint} pointerEvents="none" />

          <View style={styles.surfaceInner}>
            {/* node 2694:24496 — "Expiring soon" Albert Sans Medium 16 */}
            <Text style={styles.sectionLabel}>Expiring soon</Text>
            {expiringItems.length === 0 ? (
              <Text style={styles.empty}>Nothing expiring in the next few days</Text>
            ) : (
              expiringItems.map(expiringCard)
            )}

            {/* node 2694:24530 — hairline divider between sections */}
            <View style={styles.sectionDivider} />

            {/* node 2694:24532 — "All shared items" */}
            <Text style={styles.sectionLabel}>All shared items</Text>
            {items.length === 0 ? (
              <Text style={styles.empty}>Your pantry is empty — tap + to add an item</Text>
            ) : rest.length === 0 ? (
              <Text style={styles.empty}>Everything shared is in the expiring list above</Text>
            ) : (
              rest.map(sharedCard)
            )}
          </View>
        </View>
      </ScrollView>

      {/* node 2694:24595 — circular FAB, p:12, with subtle bg image; bottom:124 right:24 */}
      <Pressable accessibilityLabel="Add pantry item" style={styles.fab} onPress={() => addRef.current?.present()}>
        <Ionicons name="add" size={24} color={PALETTE.ink} />
      </Pressable>

      <AddPantryItemForm ref={addRef} onAdd={addPantryItem} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PALETTE.cream },
  content: {
    paddingHorizontal: SPACING.xl, // node 2694:24482 left:24
    paddingTop: SPACING.md,
    paddingBottom: 140, // leave room for FAB + nav bar (node 2694:24595 bottom:124)
    gap: SPACING.xl, // node 2694:24484 gap:24
  },

  // ── Header ─────────────────────────────────────────────────────────────
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xl, // node 2694:24485 gap:24
  },
  // node 2694:24489 — Gowun Batang Bold 22, ink, line-height 1.3
  title: {
    fontFamily: FONTS.display,
    fontSize: 22,
    lineHeight: 22 * 1.3,
    color: PALETTE.ink,
  },
  // node 2694:24490 — Albert Sans Regular 14, rgba(46,8,0,0.65)
  subtitle: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 14,
    color: 'rgba(46, 8, 0, 0.65)',
    marginTop: 4,
  },
  // node 2694:24491 — white rounded-pill, h:33 px:8 py:2
  barcodeBtn: {
    height: 33,
    minWidth: 33,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
    backgroundColor: PALETTE.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.magnet,
  },

  // ── Surface (single rounded card hosting both sections) ────────────────
  // node 2694:24494 — rounded 20, w:354, holds expiring + shared sections,
  //                   grid frame bg + white 20% overlay.
  surface: {
    borderRadius: 20,
    backgroundColor: PALETTE.white,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  // grid (gridGreen) sits behind the white tint inside the surface
  grid: { ...StyleSheet.absoluteFillObject, opacity: 0.4 },
  gridLineH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: PALETTE.gridGreen },
  gridLineV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: PALETTE.gridGreen },
  // node 2694:24494 inner — bg-[rgba(255,255,255,0.2)] overlay softens the grid
  surfaceTint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.6)' },
  // node 2694:24495 / 2694:24531 — px:15 py:16, gap:12
  surfaceInner: {
    paddingHorizontal: 15,
    paddingVertical: 16,
    gap: 12,
  },

  // ── Section header ─────────────────────────────────────────────────────
  // node 2694:24496 / 2694:24532 — Albert Sans Medium 16, ink
  sectionLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 16,
    color: PALETTE.ink,
  },
  // node 2694:24530 — hairline rule between Expiring and All sections
  sectionDivider: {
    height: 1,
    backgroundColor: PALETTE.inkHairline,
    marginVertical: 4,
  },

  // ── Item card ─────────────────────────────────────────────────────────
  // node 2694:24498 / 2694:24509 / 2694:24534 — bg white, rounded 24, px:12 py:10
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: PALETTE.white,
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  // node 2694:24499 — inner content row, gap 14, food icon + text column
  itemRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  // node 2694:24500 — pajamas:food, 36×36; we wrap the icon in a soft cream chip
  icon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    backgroundColor: PALETTE.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // node 2694:24503 — Albert Sans Medium 14, ink
  itemName: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: PALETTE.ink,
  },
  // node 2694:24516 / 2694:24542 — Albert Sans Regular 12, ink @ 65%
  itemMeta: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: 'rgba(46, 8, 0, 0.65)',
  },
  // node 2694:24505 — red text for already-expired items
  itemMetaOverdue: { color: PALETTE.expiry },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // node 2694:24543 — 1px vertical separator between expiry date + quantity
  metaDivider: { width: 1, height: 12, backgroundColor: PALETTE.inkHairline },

  // node 2694:24506 — ink-filled rounded pill, px:8 py:4, white "throw"
  throwPill: {
    backgroundColor: PALETTE.ink,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  // node 2694:24528 — disabled state, #efefef bg, ink text
  throwPillDisabled: { backgroundColor: '#EFEFEF' },
  throwText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: PALETTE.onAction,
  },
  throwTextDisabled: { color: PALETTE.ink },

  empty: { ...TYPE.small, color: PALETTE.inkMuted, paddingVertical: 6 },

  // node 2694:24595 — FAB: rounded 999, p:12, bottom:124 right:24 (above nav bar)
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 48,
    height: 48,
    borderRadius: RADIUS.pill,
    backgroundColor: PALETTE.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
  },
});
