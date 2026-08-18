import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Keyboard,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addDays, format } from 'date-fns';
import { Calendar } from 'react-native-calendars';
import type { AddPantryItemInput } from '@/src/hooks/usePantry';
import type { PantryItem } from '@/src/types';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd: (input: AddPantryItemInput) => Promise<void>;
  onUpdate?: (itemId: string, input: AddPantryItemInput) => Promise<void>;
  editItem?: PantryItem | null;
}

const EXPIRY_PRESETS = [
  { label: 'Eat now', days: 0 },
  { label: 'in 2 days', days: 2 },
  { label: 'in 4 days', days: 4 },
  { label: 'in 6 days', days: 6 },
];

interface SuccessInfo {
  name: string;
  quantity: number;
  expiryDate: Date | null;
}

export function ManualAddModal({ visible, onClose, onAdd, onUpdate, editItem }: Props) {
  const isEdit = !!editItem;
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [customDate, setCustomDate] = useState<Date | null>(null);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successInfo, setSuccessInfo] = useState<SuccessInfo | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  useEffect(() => {
    if (editItem && visible) {
      setName(editItem.name);
      setQuantity(String(editItem.quantity));
      setCustomDate(editItem.expirationDate ? editItem.expirationDate.toDate() : null);
      setSelectedPreset(null);
      setSuccessInfo(null);
    }
  }, [editItem, visible]);

  function reset() {
    setName('');
    setQuantity('1');
    setSelectedPreset(null);
    setCustomDate(null);
    setShowCustomInput(false);
    setSuccessInfo(null);
  }

  function getExpirationDate(): Date | null {
    if (customDate) return customDate;
    if (selectedPreset === null) return null;
    return addDays(new Date(), selectedPreset);
  }

  function handlePickDay() {
    setShowCustomInput((v) => !v);
    setSelectedPreset(null);
    setCustomDate(null);
  }

  function handleCalendarDay(day: { dateString: string }) {
    const d = new Date(day.dateString);
    setCustomDate(d);
    setShowCustomInput(false);
  }

  async function handleSubmit() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter an item name.');
      return;
    }
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Invalid quantity', 'Please enter a positive number.');
      return;
    }
    Keyboard.dismiss();
    setSubmitting(true);
    const expDate = getExpirationDate();
    const input: AddPantryItemInput = {
      name: name.trim(),
      quantity: qty,
      unit: editItem?.unit ?? 'unit',
      category: editItem?.category ?? 'other',
      isShared: editItem?.isShared ?? true,
      expirationDate: expDate,
      barcode: editItem?.barcode ?? null,
    };
    try {
      if (isEdit && editItem && onUpdate) {
        await onUpdate(editItem.id, input);
        reset();
        onClose();
      } else {
        await onAdd(input);
        setSuccessInfo({ name: name.trim(), quantity: qty, expiryDate: expDate });
        timerRef.current = setTimeout(() => { reset(); onClose(); }, 2500);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not add item.');
    } finally {
      setSubmitting(false);
    }
  }

  const customLabel = customDate ? format(customDate, 'MMM d') + ' (custom)' : 'custom';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={() => { if (successInfo) { if (timerRef.current) clearTimeout(timerRef.current); reset(); onClose(); } }}
      >
        <TouchableOpacity style={styles.card} activeOpacity={1}>
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#F5EDE3', borderRadius: 24 }]} />
          <Image
            source={require('@/assets/images/Bg-texture-asset.jpg')}
            style={[StyleSheet.absoluteFillObject, { borderRadius: 24 }]}
            resizeMode="cover"
          />

          {successInfo ? (
            /* ── Success screen ── */
            <View style={styles.successWrap}>
              <View style={styles.successCheck}>
                <Ionicons name="checkmark" size={26} color="#fff" />
              </View>
              <Text style={styles.successMsg}>
                {successInfo.name} was added to Your Pantry
              </Text>
              <View style={styles.successCard}>
                <View style={styles.successIconWrap}>
                  <Ionicons name="fast-food-outline" size={20} color="#3D6B5E" />
                </View>
                <View style={styles.successBody}>
                  <Text style={styles.successItemName}>{successInfo.name}</Text>
                  <Text style={styles.successItemMeta}>
                    {successInfo.expiryDate
                      ? `expires ${format(successInfo.expiryDate, 'MMM d, yyyy')}`
                      : 'No expiry set'}
                    {'  |  '}Quantity : {successInfo.quantity}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
          <>
          {/* Close */}
          <TouchableOpacity style={styles.closeBtn} onPress={() => { reset(); onClose(); }} hitSlop={10}>
            <Ionicons name="close" size={22} color="#2D1A0E" />
          </TouchableOpacity>

          <Text style={styles.title}>{isEdit ? 'Edit item' : 'Add item manually'}</Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Item name */}
            <Text style={styles.label}>Item name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Heavy cream"
              placeholderTextColor="#C4A98A"
              value={name}
              onChangeText={setName}
            />

            {/* Quantity */}
            <Text style={styles.label}>Quantity</Text>
            <View style={styles.quantityRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                keyboardType="decimal-pad"
                value={quantity}
                onChangeText={setQuantity}
              />
              <Ionicons name="chevron-down" size={18} color="#7A6652" style={styles.qtyChevron} />
            </View>

            {/* Expiry presets */}
            <View style={styles.expiryHeader}>
              <Text style={styles.label}>Set an expiration date</Text>
              <TouchableOpacity onPress={handlePickDay}>
                <Text style={styles.pickDay}>Pick a day</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pills}>
              {EXPIRY_PRESETS.map((p) => (
                <TouchableOpacity
                  key={p.days}
                  style={[styles.pill, selectedPreset === p.days && styles.pillActive]}
                  onPress={() => { setSelectedPreset(p.days); setCustomDate(null); setShowCustomInput(false); }}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.pillText, selectedPreset === p.days && styles.pillTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.pill, customDate !== null && styles.pillCustomActive]}
                onPress={handlePickDay}
                activeOpacity={0.75}
              >
                <Text style={[styles.pillText, customDate !== null && styles.pillTextActive]}>
                  {customLabel}
                </Text>
              </TouchableOpacity>
            </View>

            {showCustomInput && (
              <Calendar
                onDayPress={handleCalendarDay}
                minDate={format(new Date(), 'yyyy-MM-dd')}
                markedDates={customDate ? {
                  [format(customDate, 'yyyy-MM-dd')]: { selected: true, selectedColor: '#3D6B5E' },
                } : {}}
                theme={{
                  backgroundColor: 'transparent',
                  calendarBackground: 'transparent',
                  todayTextColor: '#3D6B5E',
                  selectedDayBackgroundColor: '#3D6B5E',
                  selectedDayTextColor: '#fff',
                  arrowColor: '#2D1A0E',
                  dayTextColor: '#2E0800',
                  textDisabledColor: '#C4A98A',
                  monthTextColor: '#2E0800',
                  textDayFontFamily: 'AlbertSans_400Regular',
                  textMonthFontFamily: 'AlbertSans_700Bold',
                  textDayHeaderFontFamily: 'AlbertSans_600SemiBold',
                }}
                style={{ marginBottom: 8 }}
              />
            )}

            <View style={styles.divider} />

            {/* Footer buttons */}
            <View style={styles.footer}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { reset(); onClose(); }} activeOpacity={0.75}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addBtn, submitting && { opacity: 0.5 }]}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.85}
              >
                <Text style={styles.addText}>{submitting ? (isEdit ? 'Saving…' : 'Adding…') : (isEdit ? 'Save changes' : 'Add item')}</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 8 }} />
          </ScrollView>
          </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    padding: 24,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  title: {
    fontFamily: 'GowunBatang_700Bold',
    fontSize: 22,
    color: '#2E0800',
    textAlign: 'center',
    marginBottom: 20,
  },
  label: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 14,
    color: '#2E0800',
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 15,
    color: '#2E0800',
    marginBottom: 12,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyChevron: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  expiryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  pickDay: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 14,
    color: '#7A6652',
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
    marginBottom: 4,
  },
  pill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  pillActive: {
    backgroundColor: '#3D6B5E',
  },
  pillCustomActive: {
    backgroundColor: '#3D6B5E',
  },
  pillText: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 14,
    color: '#2E0800',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontFamily: 'AlbertSans_600SemiBold',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#D4C4B0',
    borderStyle: 'dashed',
    marginVertical: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#2D1A0E',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 15,
    color: '#2E0800',
  },
  addBtn: {
    flex: 1,
    backgroundColor: '#2D1A0E',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addText: {
    fontFamily: 'AlbertSans_700Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },

  // ── Success screen ──────────────────────────────────────────────────────────
  successWrap: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 16,
  },
  successCheck: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#3D6B5E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successMsg: {
    fontFamily: 'GowunBatang_700Bold',
    fontSize: 17,
    color: '#2E0800',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  successCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  successIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F0EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBody: { flex: 1 },
  successItemName: {
    fontFamily: 'AlbertSans_700Bold',
    fontSize: 15,
    color: '#2E0800',
    marginBottom: 3,
  },
  successItemMeta: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 12,
    color: '#7A6652',
  },
});
