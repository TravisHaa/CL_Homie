import { GridBackground } from '@/src/components/GridBackground';
import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AddButtonSvg from '@/assets/images/Add-Button.svg';
import { useRouter } from 'expo-router';
import { useShoppingList } from '@/src/hooks/useShoppingList';
import { useHouseStore } from '@/src/store/houseStore';
import { useAuthStore } from '@/src/store/authStore';
import { ShoppingItemRow } from '@/src/components/shopping/ShoppingItemRow';
import { SHOPPING_CATEGORIES } from '@/src/utils/categories';
import type { ShoppingCategory } from '@/src/utils/categories';

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

// Dashed horizontal rule
function DashedRule({ style }: { style?: object }) {
  return <View style={[styles.dashedRule, style]} />;
}

export default function ShoppingScreen() {
  const { items, isLoading, addShoppingItem, toggleShoppingItem, clearChecked, deleteShoppingItem, updateShoppingItem } =
    useShoppingList();
  const { memberMap } = useHouseStore();
  const currentUserId = useAuthStore((s) => s.userProfile?.id);
  const [cartExpanded, setCartExpanded] = useState(true);
  const [activeCategory, setActiveCategory] = useState<ShoppingCategory | null>(null);
  const [foodGroupActive, setFoodGroupActive] = useState(false);
  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  const [recurringModalOpen, setRecurringModalOpen] = useState(false);
  const [selectedRecurring, setSelectedRecurring] = useState<string[]>([]);
  const [recurringStep2Open, setRecurringStep2Open] = useState(false);
  const [recurringDeadline, setRecurringDeadline] = useState<'asap' | '2' | '4' | '6' | null>('2');
  const [recurringAssignee, setRecurringAssignee] = useState<string>('anyone');
  const [keepPriceAndName, setKeepPriceAndName] = useState(true);
  const [recurringOverrides, setRecurringOverrides] = useState<Record<string, { name: string; price: string }>>({});
  const [recurringStep, setRecurringStep] = useState<1 | 2>(1);
  const [recurringPickDayOpen, setRecurringPickDayOpen] = useState(false);
  const [recurringCalMonth, setRecurringCalMonth] = useState(() => new Date());
  const [recurringSelectedDate, setRecurringSelectedDate] = useState<Date | null>(null);
  const [newItemModalOpen, setNewItemModalOpen] = useState(false);
  const [newItemStep, setNewItemStep] = useState(1);
  const [newItemCategory, setNewItemCategory] = useState<'food' | 'amenities' | 'furnishing'>('food');
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemDeadline, setNewItemDeadline] = useState<'2' | '4' | '6' | null>('2');
  const [newItemAssignee, setNewItemAssignee] = useState<string>('anyone');

  // Bought modal
  const [boughtItem, setBoughtItem] = useState<import('@/src/types').ShoppingItem | null>(null);
  const [boughtCost, setBoughtCost] = useState('');
  const [boughtBy, setBoughtBy] = useState('you');
  const [boughtBuyerOpen, setBoughtBuyerOpen] = useState(false);
  const [boughtExpiry, setBoughtExpiry] = useState<Date | null>(null);
  const [boughtExpiryPickerOpen, setBoughtExpiryPickerOpen] = useState(false);
  const [boughtExpiryCalMonth, setBoughtExpiryCalMonth] = useState(() => new Date());

  const openBoughtModal = (item: import('@/src/types').ShoppingItem) => {
    setBoughtItem(item);
    setBoughtCost(item.price ?? '');
    setBoughtBy('you');
    setBoughtBuyerOpen(false);
    setBoughtExpiry(null);
    setBoughtExpiryPickerOpen(false);
    setBoughtExpiryCalMonth(new Date());
  };

  // Edit item modal
  const [editingItem, setEditingItem] = useState<import('@/src/types').ShoppingItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDeadline, setEditDeadline] = useState<'asap' | '2' | '4' | '6' | null>('2');
  const [editAssignee, setEditAssignee] = useState<string>('anyone');
  const [editPickDayOpen, setEditPickDayOpen] = useState(false);
  const [editCalMonth, setEditCalMonth] = useState(() => new Date());
  const [editSelectedDate, setEditSelectedDate] = useState<Date | null>(null);

  const openEditModal = (item: import('@/src/types').ShoppingItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditPrice(item.price ?? '');
    setEditDeadline('2');
    setEditAssignee('anyone');
    setEditPickDayOpen(false);
    setEditSelectedDate(null);
  };

  const router = useRouter();

  const RECURRING_ITEMS = (() => {
    const seen = new Set<string>();
    return [...items]
      .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
      .filter((item) => {
        const key = item.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 5)
      .map((item) => {
        const addedBy = memberMap[item.addedBy]?.displayName ?? 'someone';
        return { id: item.id, name: item.name, meta: `added by ${addedBy}`, price: item.price ?? '' };
      });
  })();

  const toggleRecurring = (id: string) => {
    setSelectedRecurring((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const FOOD_CATEGORIES: ShoppingCategory[] = ['produce', 'dairy', 'meat', 'snacks', 'beverages', 'condiments', 'grains'];

  const CATEGORY_LABELS: Partial<Record<ShoppingCategory, string>> = {
    cleaning: 'Amenities',
    frozen: 'Furniture',
  };

  const SECTION_LABELS: Partial<Record<ShoppingCategory, string>> = {
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

  const buildCalendarDays = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const cells: { day: number; kind: 'prev' | 'cur' | 'next' }[] = [];
    for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: daysInPrevMonth - i, kind: 'prev' });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, kind: 'cur' });
    while (cells.length % 7 !== 0) cells.push({ day: cells.length - daysInMonth - firstDay + 1, kind: 'next' });
    return cells;
  };

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const renderCalendar = (
    calMonth: Date,
    setCalMonth: (d: Date) => void,
    selectedDate: Date | null,
    onSelectDate: (d: Date) => void,
  ) => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const today = new Date();
    const cells = buildCalendarDays(year, month);
    return (
      <View style={styles.calCard}>
        {/* Header */}
        <View style={styles.calHeader}>
          <TouchableOpacity onPress={() => setCalMonth(new Date(year, month - 1, 1))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={18} color="#2D3436" />
          </TouchableOpacity>
          <Text style={styles.calHeaderText}>{MONTH_NAMES[month]} {selectedDate ? selectedDate.getDate() + ', ' : ''}{year}</Text>
          <TouchableOpacity onPress={() => setCalMonth(new Date(year, month + 1, 1))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-forward" size={18} color="#2D3436" />
          </TouchableOpacity>
        </View>
        {/* Day headers */}
        <View style={styles.calRow}>
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <Text key={i} style={styles.calDayHeader}>{d}</Text>
          ))}
        </View>
        {/* Date grid */}
        {Array.from({ length: cells.length / 7 }).map((_, rowIdx) => (
          <View key={rowIdx} style={styles.calRow}>
            {cells.slice(rowIdx * 7, rowIdx * 7 + 7).map((cell, colIdx) => {
              const cellDate = new Date(year, cell.kind === 'prev' ? month - 1 : cell.kind === 'next' ? month + 1 : month, cell.day);
              const isToday = cellDate.toDateString() === today.toDateString();
              const isSelected = selectedDate ? cellDate.toDateString() === selectedDate.toDateString() : false;
              const isOtherMonth = cell.kind !== 'cur';
              return (
                <TouchableOpacity
                  key={colIdx}
                  style={[styles.calCell, (isToday || isSelected) && styles.calCellActive]}
                  onPress={() => { onSelectDate(cellDate); }}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.calCellText,
                    isOtherMonth && styles.calCellTextMuted,
                    (isToday || isSelected) && styles.calCellTextActive,
                  ]}>{cell.day}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <GridBackground />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
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
              {/* ── Line items by category ──────────────────────────────── */}
              {filteredUnchecked.length === 0 && checked.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>- LIST IS EMPTY -</Text>
                  <Text style={styles.emptyHint}>tap + to add items</Text>
                </View>
              ) : (
                (() => {
                  const myItems = currentUserId
                    ? filteredUnchecked.filter((i) => i.assignedTo === currentUserId)
                    : [];
                  const othersItems = currentUserId
                    ? filteredUnchecked.filter((i) => i.assignedTo !== currentUserId)
                    : filteredUnchecked;
                  return (
                    <>
                      <Text style={styles.categoryLabelFeatured}>For you to purchase</Text>
                      {myItems.length > 0 && (
                        <View style={styles.itemsBackdrop}>
                          {myItems.map((item) => (
                            <ShoppingItemRow key={item.id} item={item} memberMap={memberMap} currentUserId={currentUserId} onToggle={toggleShoppingItem} onDelete={deleteShoppingItem} onEdit={openEditModal} onBought={openBoughtModal} onUndo={toggleShoppingItem.bind(null, item.id, true)} />
                          ))}
                        </View>
                      )}
                      {othersItems.length > 0 && (
                        <>
                          <DashedRule style={{ marginVertical: 4 }} />
                          <View style={styles.itemsBackdrop}>
                            {othersItems.map((item) => (
                              <ShoppingItemRow key={item.id} item={item} memberMap={memberMap} currentUserId={currentUserId} onToggle={toggleShoppingItem} onDelete={deleteShoppingItem} onEdit={openEditModal} onBought={openBoughtModal} onUndo={toggleShoppingItem.bind(null, item.id, true)} />
                            ))}
                          </View>
                        </>
                      )}
                    </>
                  );
                })()
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
                      onDelete={deleteShoppingItem}
                      onEdit={openEditModal}
                      onBought={openBoughtModal}
                      onUndo={(id) => toggleShoppingItem(id, true)}
                    />
                  ))}
                </>
              )}
            </>
          )}

        <View style={{ height: 180 }} />
      </ScrollView>

      {/* ── FAB menu ────────────────────────────────────────────────────── */}
      {fabMenuOpen && (
        <>
          <TouchableOpacity
            style={styles.fabOverlay}
            activeOpacity={1}
            onPress={() => setFabMenuOpen(false)}
          />
          <View style={styles.fabMenu}>
            <TouchableOpacity
              style={styles.fabMenuItem}
              activeOpacity={0.8}
              onPress={() => { setFabMenuOpen(false); setSelectedRecurring([]); setRecurringModalOpen(true); }}
            >
              <Text style={styles.fabMenuText}>Add recurring item</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fabMenuItem}
              activeOpacity={0.8}
              onPress={() => { setFabMenuOpen(false); setNewItemName(''); setNewItemPrice(''); setNewItemQty(1); setNewItemStep(1); setNewItemDeadline('2'); setNewItemAssignee('anyone'); setNewItemModalOpen(true); }}
            >
              <Text style={styles.fabMenuText}>Add new item</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ── FAB ─────────────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setFabMenuOpen((v) => !v)}
        activeOpacity={0.85}
      >
        <AddButtonSvg width={64} height={64} />
      </TouchableOpacity>

      {/* ── Add new item modal ───────────────────────────────────────────── */}
      <Modal
        visible={newItemModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setNewItemModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setNewItemModalOpen(false)} />
          <View style={styles.newItemCard}>
            {/* Close */}
            {newItemStep < 3 && (
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setNewItemModalOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color="#2D3436" />
              </TouchableOpacity>
            )}

            {newItemStep < 3 && <Text style={styles.newItemTitle}>Add new item</Text>}

            {newItemStep === 1 && (
              <>
                {/* Category */}
                <Text style={styles.newItemLabel}>Pick a category</Text>
                <View style={styles.newItemPills}>
                  {(['food', 'amenities', 'furnishing'] as const).map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.newItemPill, newItemCategory === cat && styles.newItemPillActive]}
                      onPress={() => setNewItemCategory(cat)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.newItemPillText, newItemCategory === cat && styles.newItemPillTextActive]}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Item name */}
                <Text style={styles.newItemLabel}>Item name</Text>
                <TextInput
                  style={styles.newItemInput}
                  value={newItemName}
                  onChangeText={setNewItemName}
                  placeholder="e.g. Broccoli"
                  placeholderTextColor="#aaa"
                />

                {/* Price */}
                <Text style={styles.newItemLabel}>
                  Price estimate{' '}
                  <Text style={styles.newItemLabelMeta}>(ex. $4-5)</Text>
                </Text>
                <View style={styles.newItemPriceRow}>
                  <Text style={styles.newItemDollar}>$</Text>
                  <TextInput
                    style={[styles.newItemInput, { flex: 1, marginBottom: 0 }]}
                    value={newItemPrice}
                    onChangeText={setNewItemPrice}
                    placeholder="4.00–5.00"
                    placeholderTextColor="#aaa"
                    keyboardType="decimal-pad"
                  />
                </View>

                {/* Quantity */}
                <Text style={[styles.newItemLabel, { marginTop: 16 }]}>Quantity</Text>
                <View style={styles.newItemQtyRow}>
                  <Text style={styles.newItemQtyText}>{newItemQty}</Text>
                  <View style={styles.newItemQtyControls}>
                    <TouchableOpacity onPress={() => setNewItemQty((q) => q + 1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="chevron-up" size={16} color="#636e72" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setNewItemQty((q) => Math.max(1, q - 1))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="chevron-down" size={16} color="#636e72" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.modalDivider} />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalSecondaryBtn}
                    onPress={() => setNewItemModalOpen(false)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.modalSecondaryBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalPrimaryBtn}
                    onPress={() => setNewItemStep(2)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.modalPrimaryBtnText}>Next</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {newItemStep === 2 && (
              <>
                {/* Deadline */}
                <View style={styles.step2Row}>
                  <Text style={styles.newItemLabel}>Set a deadline</Text>
                  <Text style={styles.step2Link}>Pick a day</Text>
                </View>
                <View style={[styles.newItemPills, { marginBottom: 20 }]}>
                  {(['2', '4', '6'] as const).map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.newItemPill, newItemDeadline === d && styles.newItemPillActive]}
                      onPress={() => setNewItemDeadline(d)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.newItemPillText, newItemDeadline === d && styles.newItemPillTextActive]}>
                        in {d} days
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Assignee */}
                <Text style={styles.newItemLabel}>Assign to a housemate</Text>
                <View style={styles.assigneeGrid}>
                  {[
                    { id: 'you', label: 'You' },
                    ...Object.entries(memberMap).map(([id, m]) => ({ id, label: m.displayName })),
                    { id: 'anyone', label: 'Anyone' },
                  ].map((person) => {
                    const active = newItemAssignee === person.id;
                    const color = person.id === 'you' || person.id === 'anyone'
                      ? '#3D6B5E'
                      : (memberMap[person.id]?.color ?? '#888');
                    return (
                      <TouchableOpacity
                        key={person.id}
                        style={[styles.assigneePill, active && styles.newItemPillActive]}
                        onPress={() => setNewItemAssignee(person.id)}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.assigneeAvatar, { backgroundColor: color }]}>
                          <Text style={styles.assigneeInitial}>
                            {person.label.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <Text style={[styles.newItemPillText, active && styles.newItemPillTextActive]}>
                          {person.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.modalDivider} />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalSecondaryBtn}
                    onPress={() => setNewItemStep(1)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.modalSecondaryBtnText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalPrimaryBtn}
                    onPress={async () => {
                      const categoryMap: Record<string, string> = {
                        food: 'produce',
                        amenities: 'cleaning',
                        furnishing: 'frozen',
                      };
                      const neededByDate = newItemDeadline
                        ? (() => { const d = new Date(); d.setDate(d.getDate() + parseInt(newItemDeadline)); return d; })()
                        : null;
                      await addShoppingItem({
                        name: newItemName || 'New item',
                        category: categoryMap[newItemCategory] ?? 'other',
                        quantity: newItemQty,
                        unit: 'unit',
                        price: newItemPrice,
                        assignedTo: newItemAssignee === 'you' ? currentUserId : newItemAssignee,
                        neededBy: neededByDate,
                      });
                      setNewItemStep(3);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.modalPrimaryBtnText}>Create item</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {newItemStep === 3 && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 4 }}>
                <Text style={styles.confirmTitle}>
                  {newItemName || 'Item'} was added to your home's shopping list!
                </Text>

                <View style={styles.confirmCard}>
                  <View style={styles.confirmCardLeft}>
                    <View style={styles.confirmIcon}>
                      <Ionicons name="bag-handle-outline" size={18} color="#636e72" />
                    </View>
                    <View>
                      <Text style={styles.confirmItemName}>{newItemName || 'Item'}</Text>
                      <View style={styles.confirmMeta}>
                        {newItemDeadline && (
                          <View style={styles.confirmDeadlinePill}>
                            <Text style={styles.confirmDeadlinePillText}>{newItemDeadline} days</Text>
                          </View>
                        )}
                        {newItemPrice ? (
                          <>
                            <Text style={styles.confirmMetaDivider}>|</Text>
                            <Text style={styles.confirmMetaText}>${newItemPrice} est.</Text>
                          </>
                        ) : null}
                      </View>
                    </View>
                  </View>
                  <View style={styles.confirmCardRight}>
                    <Text style={styles.confirmPickUp}>pick up by</Text>
                    <View style={styles.confirmAvatar}>
                      <Ionicons name="person" size={16} color="#aaa" />
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.modalPrimaryBtn, { flex: 0, marginTop: 20 }]}
                  onPress={() => setNewItemModalOpen(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalPrimaryBtnText}>Return to list</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Recurring step 2: deadline & assignment ─────────────────────── */}
      <Modal
        visible={recurringStep2Open}
        transparent
        animationType="fade"
        onRequestClose={() => setRecurringStep2Open(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setRecurringStep2Open(false)} />
          <View style={[styles.modalCard, { backgroundColor: '#FDF6EE' }]}>
            <TouchableOpacity style={styles.modalClose} onPress={() => { setRecurringStep2Open(false); setRecurringStep(1); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={20} color="#2D3436" />
            </TouchableOpacity>

            {recurringStep === 1 && <>
            <Text style={styles.recurringS2Title}>Set your deadline and assignment</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {/* Selected item cards */}
            <Text style={styles.newItemLabel}>Your item{selectedRecurring.length > 1 ? 's' : ''}</Text>
            <View style={{ gap: 10, marginBottom: 8 }}>
              {RECURRING_ITEMS.filter((i) => selectedRecurring.includes(i.id)).map((item) => (
                <View key={item.id} style={styles.recurringS2Card}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recurringItemName}>{item.name}</Text>
                    <Text style={styles.recurringItemMeta}>{item.meta}</Text>
                    {item.price ? <Text style={styles.recurringItemMeta}>${item.price}</Text> : null}
                  </View>
                  <TouchableOpacity onPress={() => setRecurringStep2Open(false)}>
                    <Text style={styles.recurringS2Change}>Change item</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Keep price checkbox */}
            <TouchableOpacity
              style={styles.recurringS2CheckRow}
              onPress={() => {
                const next = !keepPriceAndName;
                setKeepPriceAndName(next);
                if (!next) {
                  const init: Record<string, { name: string; price: string }> = {};
                  RECURRING_ITEMS.filter((i) => selectedRecurring.includes(i.id)).forEach((i) => {
                    init[i.id] = { name: i.name, price: i.price };
                  });
                  setRecurringOverrides(init);
                }
              }}
              activeOpacity={0.75}
            >
              <View style={[styles.recurringS2Checkbox, keepPriceAndName && styles.recurringS2CheckboxOn]}>
                {keepPriceAndName && <Ionicons name="checkmark" size={12} color="#fff" />}
              </View>
              <Text style={styles.recurringS2CheckLabel}>keep price and name the same</Text>
            </TouchableOpacity>

            {/* Editable name/price overrides when checkbox is unchecked */}
            {!keepPriceAndName && RECURRING_ITEMS.filter((i) => selectedRecurring.includes(i.id)).map((item) => (
              <View key={item.id} style={{ marginBottom: 12 }}>
                <Text style={styles.newItemLabel}>Item name</Text>
                <TextInput
                  style={styles.newItemInput}
                  value={recurringOverrides[item.id]?.name ?? item.name}
                  onChangeText={(t) => setRecurringOverrides((prev) => ({ ...prev, [item.id]: { ...prev[item.id], name: t } }))}
                  placeholderTextColor="#aaa"
                />
                <Text style={styles.newItemLabel}>
                  Price estimate <Text style={styles.newItemLabelMeta}>(ex. $4-5)</Text>
                </Text>
                <View style={styles.newItemPriceRow}>
                  <Text style={styles.newItemDollar}>$</Text>
                  <TextInput
                    style={[styles.newItemInput, { flex: 1, marginBottom: 0 }]}
                    value={recurringOverrides[item.id]?.price ?? item.price}
                    onChangeText={(t) => setRecurringOverrides((prev) => ({ ...prev, [item.id]: { ...prev[item.id], price: t } }))}
                    placeholder="4.00–5.00"
                    placeholderTextColor="#aaa"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            ))}

            {/* Deadline */}
            <View style={styles.step2Row}>
              <Text style={styles.newItemLabel}>Set a deadline</Text>
              <TouchableOpacity onPress={() => setRecurringPickDayOpen((v) => !v)} activeOpacity={0.75}>
                <Text style={[styles.step2Link, recurringPickDayOpen && { color: '#3D6B5E' }]}>Pick a day</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.newItemPills, { flexWrap: 'wrap', marginBottom: recurringPickDayOpen ? 12 : 16 }]}>
              {([['asap', 'ASAP'], ['2', 'in 2 days'], ['4', 'in 4 days'], ['6', 'in 6 days']] as const).map(([val, label]) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.newItemPill, recurringDeadline === val && styles.newItemPillActive]}
                  onPress={() => { setRecurringDeadline(val); setRecurringSelectedDate(null); setRecurringPickDayOpen(false); }}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.newItemPillText, recurringDeadline === val && styles.newItemPillTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
              {recurringSelectedDate && (
                <TouchableOpacity style={[styles.newItemPill, styles.newItemPillActive]} activeOpacity={0.75} onPress={() => { setRecurringSelectedDate(null); setRecurringDeadline('2'); }}>
                  <Text style={[styles.newItemPillText, styles.newItemPillTextActive]}>
                    {recurringSelectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {recurringPickDayOpen && renderCalendar(
              recurringCalMonth,
              setRecurringCalMonth,
              recurringSelectedDate,
              (d) => { setRecurringSelectedDate(d); setRecurringDeadline(null); setRecurringPickDayOpen(false); },
            )}

            {/* Assignee */}
            <Text style={styles.newItemLabel}>Assign to a housemate</Text>
            <View style={styles.assigneeGrid}>
              {[
                { id: 'you', label: 'You' },
                ...Object.entries(memberMap).map(([id, m]) => ({ id, label: m.displayName })),
                { id: 'anyone', label: 'Anyone' },
              ].map((person) => {
                const active = recurringAssignee === person.id;
                const color = memberMap[person.id]?.color ?? '#3D6B5E';
                return (
                  <TouchableOpacity
                    key={person.id}
                    style={[styles.assigneePill, active && styles.newItemPillActive]}
                    onPress={() => setRecurringAssignee(person.id)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.assigneeAvatar, { backgroundColor: color }]}>
                      <Text style={styles.assigneeInitial}>{person.label.charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={[styles.newItemPillText, active && styles.newItemPillTextActive]}>{person.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            </ScrollView>

            <View style={styles.modalDivider} />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalSecondaryBtn}
                onPress={() => { setRecurringStep2Open(false); setNewItemName(''); setNewItemPrice(''); setNewItemQty(1); setNewItemStep(1); setNewItemModalOpen(true); }}
                activeOpacity={0.75}
              >
                <Text style={styles.modalSecondaryBtnText}>New item</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={async () => {
                  const categoryMap: Record<string, string> = { food: 'produce', amenities: 'cleaning', furnishing: 'frozen' };
                  const selectedItems = RECURRING_ITEMS.filter((i) => selectedRecurring.includes(i.id));
                  for (const item of selectedItems) {
                    const name = keepPriceAndName ? item.name : (recurringOverrides[item.id]?.name ?? item.name);
                    const price = keepPriceAndName ? item.price : (recurringOverrides[item.id]?.price ?? item.price);
                    await addShoppingItem({ name, category: 'other', quantity: 1, unit: 'unit', price, assignedTo: recurringAssignee === 'you' ? currentUserId : recurringAssignee });
                  }
                  setRecurringStep(2);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalPrimaryBtnText}>Add {selectedRecurring.length} selection{selectedRecurring.length !== 1 ? 's' : ''}</Text>
              </TouchableOpacity>
            </View>
            </>}

            {recurringStep === 2 && (() => {
              const firstItem = RECURRING_ITEMS.find((i) => selectedRecurring.includes(i.id));
              const displayName = firstItem
                ? (keepPriceAndName ? firstItem.name : (recurringOverrides[firstItem.id]?.name ?? firstItem.name))
                : 'Item';
              const displayPrice = firstItem
                ? (keepPriceAndName ? firstItem.price : (recurringOverrides[firstItem.id]?.price ?? firstItem.price))
                : '';
              const deadlineLabel = recurringSelectedDate
                ? recurringSelectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : recurringDeadline === 'asap' ? 'ASAP'
                : recurringDeadline ? `${recurringDeadline} days`
                : null;
              return (
                <>
                  <View style={styles.confirmCheck}>
                    <Ionicons name="checkmark" size={24} color="#fff" />
                  </View>
                  <Text style={styles.confirmTitle}>
                    {displayName} was added to your home's shopping list!
                  </Text>
                  <View style={styles.confirmCard}>
                    <View style={styles.confirmCardLeft}>
                      <View style={styles.confirmIcon}>
                        <Ionicons name="bag-handle-outline" size={18} color="#636e72" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.confirmItemName}>{displayName}</Text>
                          {selectedRecurring.length > 1 && (
                            <Text style={[styles.recurringItemMeta, { color: '#3D6B5E' }]}>x{selectedRecurring.length}</Text>
                          )}
                        </View>
                        <View style={styles.confirmMeta}>
                          {deadlineLabel && (
                            <View style={styles.confirmDeadlinePill}>
                              <Text style={styles.confirmDeadlinePillText}>by {deadlineLabel}</Text>
                            </View>
                          )}
                          {displayPrice ? (
                            <>
                              <Text style={styles.confirmMetaDivider}>|</Text>
                              <Text style={styles.confirmMetaText}>${displayPrice}</Text>
                            </>
                          ) : null}
                        </View>
                      </View>
                    </View>
                    <View style={styles.confirmCardRight}>
                      <Text style={styles.confirmPickUp}>pick up by</Text>
                      <View style={styles.confirmAvatar}>
                        <Ionicons name="person" size={16} color="#aaa" />
                      </View>
                    </View>
                  </View>
                  <View style={styles.modalDivider} />
                  <TouchableOpacity
                    style={[styles.modalPrimaryBtn, { flex: 0, backgroundColor: '#3D6B5E' }]}
                    onPress={() => { setRecurringStep2Open(false); setRecurringStep(1); }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.modalPrimaryBtnText}>Return to list</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ── Bought modal ────────────────────────────────────────────────── */}
      <Modal
        visible={!!boughtItem}
        transparent
        animationType="fade"
        onRequestClose={() => setBoughtItem(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setBoughtItem(null)} />
          <View style={[styles.modalCard, { backgroundColor: '#FDF6EE' }]}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setBoughtItem(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={20} color="#2D3436" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Purchased the item?</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {/* Item card */}
              <Text style={styles.newItemLabel}>Item:</Text>
              <View style={styles.recurringS2Card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recurringItemName}>{boughtItem?.name}</Text>
                  <Text style={styles.recurringItemMeta}>{boughtItem?.quantity} {boughtItem?.unit}</Text>
                </View>
                <TouchableOpacity onPress={() => setBoughtItem(null)}>
                  <Text style={styles.recurringS2Change}>Change item</Text>
                </TouchableOpacity>
              </View>

              {/* Cost */}
              <Text style={[styles.newItemLabel, { marginTop: 16 }]}>Cost of purchase:</Text>
              <View style={styles.boughtInputRow}>
                <Text style={styles.newItemDollar}>$</Text>
                <TextInput
                  style={[styles.newItemInput, { flex: 1, marginBottom: 0 }]}
                  value={boughtCost}
                  onChangeText={setBoughtCost}
                  placeholder="0.00"
                  placeholderTextColor="#aaa"
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Who bought */}
              <Text style={[styles.newItemLabel, { marginTop: 16 }]}>Who bought this?</Text>
              <TouchableOpacity
                style={styles.boughtDropdown}
                onPress={() => setBoughtBuyerOpen((v) => !v)}
                activeOpacity={0.75}
              >
                <Text style={styles.boughtDropdownText}>
                  {boughtBy === 'you' ? 'You' : (memberMap[boughtBy]?.displayName ?? boughtBy)}
                </Text>
                <Ionicons name={boughtBuyerOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#2D3436" />
              </TouchableOpacity>
              {boughtBuyerOpen && (
                <View style={styles.boughtDropdownList}>
                  {[{ id: 'you', label: 'You' }, ...Object.entries(memberMap).map(([id, m]) => ({ id, label: m.displayName }))].map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={styles.boughtDropdownItem}
                      onPress={() => { setBoughtBy(p.id); setBoughtBuyerOpen(false); }}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.boughtDropdownText, boughtBy === p.id && { color: '#3D6B5E', fontFamily: 'AlbertSans_600SemiBold' }]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Expiry */}
              <Text style={[styles.newItemLabel, { marginTop: 16 }]}>What's the expiration date?</Text>
              <TouchableOpacity
                style={styles.boughtDropdown}
                onPress={() => setBoughtExpiryPickerOpen((v) => !v)}
                activeOpacity={0.75}
              >
                <Text style={styles.boughtDropdownText}>
                  {boughtExpiry
                    ? boughtExpiry.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
                    : 'Select a date'}
                </Text>
                <Ionicons name="calendar-outline" size={18} color="#2D3436" />
              </TouchableOpacity>
              {boughtExpiryPickerOpen && renderCalendar(
                boughtExpiryCalMonth,
                setBoughtExpiryCalMonth,
                boughtExpiry,
                (d) => { setBoughtExpiry(d); setBoughtExpiryPickerOpen(false); },
              )}
            </ScrollView>

            <View style={styles.modalDivider} />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalSecondaryBtn} onPress={() => setBoughtItem(null)} activeOpacity={0.75}>
                <Text style={styles.modalSecondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalPrimaryBtn, { backgroundColor: '#3D6B5E' }]}
                onPress={async () => {
                  if (!boughtItem) return;
                  await toggleShoppingItem(boughtItem.id, boughtItem.isChecked, boughtExpiry ?? undefined);
                  if (boughtCost) await updateShoppingItem(boughtItem.id, { price: boughtCost });
                  setBoughtItem(null);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalPrimaryBtnText}>Confirm purchase</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Edit item modal ─────────────────────────────────────────────── */}
      <Modal
        visible={!!editingItem}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingItem(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setEditingItem(null)} />
          <View style={[styles.modalCard, { backgroundColor: '#FDF6EE' }]}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setEditingItem(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={20} color="#2D3436" />
            </TouchableOpacity>

            <Text style={styles.recurringS2Title}>Set your deadline and assignment</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {/* Item card */}
              <Text style={styles.newItemLabel}>Your item</Text>
              <View style={[styles.recurringS2Card, { marginBottom: 8 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recurringItemName}>{editName}</Text>
                  {editPrice ? <Text style={styles.recurringItemMeta}>${editPrice}</Text> : null}
                </View>
              </View>

              {/* Name */}
              <Text style={styles.newItemLabel}>Item name</Text>
              <TextInput
                style={styles.newItemInput}
                value={editName}
                onChangeText={setEditName}
                placeholderTextColor="#aaa"
              />

              {/* Price */}
              <Text style={styles.newItemLabel}>
                Price estimate <Text style={styles.newItemLabelMeta}>(ex. $4-5)</Text>
              </Text>
              <View style={styles.newItemPriceRow}>
                <Text style={styles.newItemDollar}>$</Text>
                <TextInput
                  style={[styles.newItemInput, { flex: 1, marginBottom: 0 }]}
                  value={editPrice}
                  onChangeText={setEditPrice}
                  placeholder="4.00–5.00"
                  placeholderTextColor="#aaa"
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Deadline */}
              <View style={[styles.step2Row, { marginTop: 16 }]}>
                <Text style={styles.newItemLabel}>Set a deadline</Text>
                <TouchableOpacity onPress={() => setEditPickDayOpen((v) => !v)} activeOpacity={0.75}>
                  <Text style={[styles.step2Link, editPickDayOpen && { color: '#3D6B5E' }]}>Pick a day</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.newItemPills, { flexWrap: 'wrap', marginBottom: editPickDayOpen ? 12 : 16 }]}>
                {([['asap', 'ASAP'], ['2', 'in 2 days'], ['4', 'in 4 days'], ['6', 'in 6 days']] as const).map(([val, label]) => (
                  <TouchableOpacity
                    key={val}
                    style={[styles.newItemPill, editDeadline === val && styles.newItemPillActive]}
                    onPress={() => { setEditDeadline(val); setEditSelectedDate(null); setEditPickDayOpen(false); }}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.newItemPillText, editDeadline === val && styles.newItemPillTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
                {editSelectedDate && (
                  <TouchableOpacity style={[styles.newItemPill, styles.newItemPillActive]} activeOpacity={0.75} onPress={() => { setEditSelectedDate(null); setEditDeadline('2'); }}>
                    <Text style={[styles.newItemPillText, styles.newItemPillTextActive]}>
                      {editSelectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              {editPickDayOpen && renderCalendar(
                editCalMonth,
                setEditCalMonth,
                editSelectedDate,
                (d) => { setEditSelectedDate(d); setEditDeadline(null); setEditPickDayOpen(false); },
              )}

              {/* Assignee */}
              <Text style={styles.newItemLabel}>Assign to a housemate</Text>
              <View style={styles.assigneeGrid}>
                {[
                  { id: 'you', label: 'You' },
                  ...Object.entries(memberMap).map(([id, m]) => ({ id, label: m.displayName })),
                  { id: 'anyone', label: 'Anyone' },
                ].map((person) => {
                  const active = editAssignee === person.id;
                  const color = memberMap[person.id]?.color ?? '#3D6B5E';
                  return (
                    <TouchableOpacity
                      key={person.id}
                      style={[styles.assigneePill, active && styles.newItemPillActive]}
                      onPress={() => setEditAssignee(person.id)}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.assigneeAvatar, { backgroundColor: color }]}>
                        <Text style={styles.assigneeInitial}>{person.label.charAt(0).toUpperCase()}</Text>
                      </View>
                      <Text style={[styles.newItemPillText, active && styles.newItemPillTextActive]}>{person.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.modalDivider} />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalSecondaryBtn} onPress={() => setEditingItem(null)} activeOpacity={0.75}>
                <Text style={styles.modalSecondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={async () => {
                  if (!editingItem) return;
                  await updateShoppingItem(editingItem.id, { name: editName, price: editPrice });
                  setEditingItem(null);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalPrimaryBtnText}>Save changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Recurring items modal ────────────────────────────────────────── */}
      <Modal
        visible={recurringModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRecurringModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setRecurringModalOpen(false)} />
          <View style={styles.modalCard}>
            {/* Close */}
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setRecurringModalOpen(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={20} color="#2D3436" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Your recurring food items</Text>
            <Text style={styles.modalSubtitle}>Select items you've purchased before</Text>

            <ScrollView
              style={styles.modalList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 10 }}
            >
              {RECURRING_ITEMS.map((item) => {
                const selected = selectedRecurring.includes(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.recurringItem}
                    onPress={() => toggleRecurring(item.id)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.recurringItemText}>
                      <Text style={styles.recurringItemName}>{item.name}</Text>
                      <Text style={styles.recurringItemMeta}>{item.meta}</Text>
                    </View>
                    <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                      {selected && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.modalDivider} />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalSecondaryBtn}
                onPress={() => { setRecurringModalOpen(false); setNewItemName(''); setNewItemPrice(''); setNewItemQty(1); setNewItemStep(1); setNewItemDeadline('2'); setNewItemAssignee('anyone'); setNewItemModalOpen(true); }}
                activeOpacity={0.75}
              >
                <Text style={styles.modalSecondaryBtnText}>New item</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalPrimaryBtn, selectedRecurring.length === 0 && { opacity: 0.5 }]}
                disabled={selectedRecurring.length === 0}
                onPress={() => { setRecurringModalOpen(false); setRecurringStep(1); setRecurringStep2Open(true); }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalPrimaryBtnText}>
                  Add {selectedRecurring.length > 0 ? selectedRecurring.length : ''} selection{selectedRecurring.length !== 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'GowunBatang_700Bold',
    color: '#2D3436',
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
    color: '#2D3436',
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
    color: '#2D3436',
  },
  pillTextActive: {
    color: '#fff',
  },

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
  categoryLabelFeatured: {
    fontFamily: 'GowunBatang_700Bold',
    fontSize: 13,
    color: '#000',
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
  itemsBackdrop: {
    backgroundColor: 'rgba(210, 210, 210, 0.2)',
    borderRadius: 20,
    padding: 8,
    marginBottom: 4,
  },
  purchasedLabel: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 13,
    color: '#000',
  },
  clearAllBtn: {
    fontFamily: 'AlbertSans_500Medium',
    fontSize: 13,
    color: '#C0392B',
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
    bottom: 110,
    right: 20,
  },
  fabOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  fabMenu: {
    position: 'absolute',
    bottom: 184,
    right: 20,
    gap: 10,
    alignItems: 'flex-end',
  },
  fabMenuItem: {
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  fabMenuText: {
    fontFamily: 'AlbertSans_500Medium',
    fontSize: 16,
    color: '#2D3436',
  },

  // ── Recurring modal ───────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FDF6EE',
    borderRadius: 24,
    padding: 24,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalClose: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  modalTitle: {
    fontFamily: 'GowunBatang_700Bold',
    fontSize: 22,
    color: '#2D3436',
    textAlign: 'center',
    marginBottom: 6,
    paddingRight: 24,
    paddingLeft: 24,
  },
  modalSubtitle: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 14,
    color: '#636e72',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalList: {
    maxHeight: 320,
  },
  recurringItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  recurringItemText: { flex: 1 },
  recurringItemName: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 16,
    color: '#2D3436',
  },
  recurringItemMeta: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 13,
    color: '#636e72',
    marginTop: 2,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  radioOuterSelected: {
    borderColor: '#3D6B5E',
    backgroundColor: '#3D6B5E',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  modalDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#DFE6E9',
    borderStyle: 'dashed',
    marginVertical: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalSecondaryBtn: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#2D3436',
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalSecondaryBtnText: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 15,
    color: '#2D3436',
  },
  modalPrimaryBtn: {
    flex: 2,
    borderRadius: 999,
    backgroundColor: '#2D1A0E',
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalPrimaryBtnText: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 15,
    color: '#fff',
  },

  // ── Add new item modal ────────────────────────────────────────────────────
  newItemCard: {
    width: '100%',
    backgroundColor: '#FDF6EE',
    borderRadius: 24,
    padding: 24,
    paddingBottom: 28,
    maxHeight: '88%',
  },
  newItemTitle: {
    fontFamily: 'GowunBatang_700Bold',
    fontSize: 22,
    color: '#2D3436',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  newItemLabel: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 14,
    color: '#2D3436',
    marginBottom: 8,
  },
  newItemLabelMeta: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 13,
    color: '#636e72',
  },
  newItemPills: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  newItemPill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#DFE6E9',
  },
  newItemPillActive: {
    backgroundColor: '#3D6B5E',
    borderColor: '#3D6B5E',
  },
  newItemPillText: {
    fontFamily: 'AlbertSans_500Medium',
    fontSize: 14,
    color: '#2D3436',
  },
  newItemPillTextActive: {
    color: '#fff',
  },
  newItemInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 15,
    color: '#2D3436',
    marginBottom: 16,
  },
  newItemPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 0,
  },
  newItemDollar: {
    fontFamily: 'AlbertSans_500Medium',
    fontSize: 15,
    color: '#2D3436',
  },
  newItemQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  newItemQtyText: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 15,
    color: '#2D3436',
  },
  newItemQtyControls: {
    gap: 2,
    alignItems: 'center',
  },
  step2Row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  step2Link: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 13,
    color: '#636e72',
  },
  assigneeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 4,
  },
  assigneePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#DFE6E9',
  },
  assigneeAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assigneeInitial: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 12,
    color: '#fff',
  },

  // ── Recurring step 2 ─────────────────────────────────────────────────────
  recurringS2Title: {
    fontFamily: 'GowunBatang_700Bold',
    fontSize: 20,
    color: '#2D3436',
    marginBottom: 16,
    marginTop: 4,
    paddingRight: 24,
  },
  recurringS2Card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  recurringS2Change: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 13,
    color: '#3D6B5E',
  },
  recurringS2CheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    marginBottom: 16,
  },
  recurringS2Checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#DFE6E9',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recurringS2CheckboxOn: {
    backgroundColor: '#3D6B5E',
    borderColor: '#3D6B5E',
  },
  recurringS2CheckLabel: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 13,
    color: '#636e72',
  },

  // ── Bought modal inputs ───────────────────────────────────────────────────
  boughtInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  boughtDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  boughtDropdownText: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 15,
    color: '#2D3436',
  },
  boughtDropdownList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    marginTop: 4,
    overflow: 'hidden',
  },
  boughtDropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },

  // ── Inline calendar picker ────────────────────────────────────────────────
  calCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  calHeaderText: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 14,
    color: '#2D3436',
  },
  calRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 2,
  },
  calDayHeader: {
    width: 32,
    textAlign: 'center',
    fontFamily: 'AlbertSans_500Medium',
    fontSize: 11,
    color: '#636e72',
    paddingVertical: 4,
  },
  calCell: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calCellActive: {
    backgroundColor: '#3D6B5E',
  },
  calCellText: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 13,
    color: '#2D3436',
  },
  calCellTextMuted: {
    color: '#C4C4C4',
  },
  calCellTextActive: {
    color: '#fff',
    fontFamily: 'AlbertSans_600SemiBold',
  },

  // ── Confirmation (step 3) ─────────────────────────────────────────────────
  confirmCheck: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#3D6B5E',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  confirmTitle: {
    fontFamily: 'GowunBatang_700Bold',
    fontSize: 20,
    color: '#2D3436',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 28,
  },
  confirmCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  confirmCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  confirmIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmItemName: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 15,
    color: '#2D3436',
    marginBottom: 4,
  },
  confirmMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  confirmDeadlinePill: {
    backgroundColor: '#2D1A0E',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  confirmDeadlinePillText: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 12,
    color: '#fff',
  },
  confirmMetaDivider: {
    color: '#DFE6E9',
    fontSize: 14,
  },
  confirmMetaText: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 13,
    color: '#636e72',
  },
  confirmCardRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  confirmPickUp: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 12,
    color: '#636e72',
  },
  confirmAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
