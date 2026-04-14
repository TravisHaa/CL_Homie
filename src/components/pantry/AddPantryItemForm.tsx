import {
  forwardRef,
  useMemo,
  useState,
} from 'react';
import {
  Alert,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { parseISO, isValid } from 'date-fns';
import { PANTRY_CATEGORIES } from '@/src/utils/categories';
import type { AddPantryItemInput } from '@/src/hooks/usePantry';

interface Props {
  onAdd: (input: AddPantryItemInput) => Promise<void>;
}

const INITIAL_STATE = {
  name: '',
  quantity: '',
  unit: '',
  category: 'other' as string,
  isShared: false,
  expirationDate: '',
};

export const AddPantryItemForm = forwardRef<BottomSheetModal, Props>(
  ({ onAdd }, ref) => {
    const snapPoints = useMemo(() => ['70%', '92%'], []);
    // BottomSheetTextInput relies on a native focus API that is missing on react-native-web.
    const SheetInput = Platform.OS === 'web' ? TextInput : BottomSheetTextInput;
    const [form, setForm] = useState(INITIAL_STATE);
    const [submitting, setSubmitting] = useState(false);

    function reset() {
      setForm(INITIAL_STATE);
    }

    function setField<K extends keyof typeof INITIAL_STATE>(
      key: K,
      value: (typeof INITIAL_STATE)[K],
    ) {
      setForm((prev) => ({ ...prev, [key]: value }));
    }

    async function handleSubmit() {
      if (!form.name.trim()) {
        Alert.alert('Name required', 'Please enter a name for the item.');
        return;
      }

      const qty = parseFloat(form.quantity);
      if (isNaN(qty) || qty <= 0) {
        Alert.alert('Invalid quantity', 'Please enter a positive number.');
        return;
      }

      let expDate: Date | null = null;
      if (form.expirationDate.trim()) {
        expDate = parseISO(form.expirationDate.trim());
        if (!isValid(expDate)) {
          Alert.alert('Invalid date', 'Use YYYY-MM-DD format (e.g. 2026-05-20).');
          return;
        }
      }

      Keyboard.dismiss();
      setSubmitting(true);
      try {
        await onAdd({
          name: form.name.trim(),
          quantity: qty,
          unit: form.unit.trim() || 'unit',
          category: form.category,
          isShared: form.isShared,
          expirationDate: expDate,
        });
        reset();
        (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
      } catch (e: any) {
        Alert.alert('Error', e?.message ?? 'Could not add item. Please try again.');
      } finally {
        setSubmitting(false);
      }
    }

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.indicator}
      >
        <BottomSheetView style={styles.container}>
          <Text style={styles.title}>Add Pantry Item</Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Name */}
            <Text style={styles.label}>Name *</Text>
            <SheetInput
              style={styles.input}
              placeholder="e.g. Almond Milk"
              placeholderTextColor="#b2bec3"
              value={form.name}
              onChangeText={(v) => setField('name', v)}
              returnKeyType="next"
            />

            {/* Quantity + Unit */}
            <View style={styles.row}>
              <View style={styles.halfLeft}>
                <Text style={styles.label}>Quantity *</Text>
                <SheetInput
                  style={styles.input}
                  placeholder="1"
                  placeholderTextColor="#b2bec3"
                  keyboardType="decimal-pad"
                  value={form.quantity}
                  onChangeText={(v) => setField('quantity', v)}
                />
              </View>
              <View style={styles.halfRight}>
                <Text style={styles.label}>Unit</Text>
                <SheetInput
                  style={styles.input}
                  placeholder="e.g. carton, oz"
                  placeholderTextColor="#b2bec3"
                  value={form.unit}
                  onChangeText={(v) => setField('unit', v)}
                />
              </View>
            </View>

            {/* Category */}
            <Text style={styles.label}>Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
            >
              {PANTRY_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    form.category === cat && styles.categoryChipActive,
                  ]}
                  onPress={() => setField('category', cat)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      form.category === cat && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Expiration Date */}
            <Text style={styles.label}>Expiration Date</Text>
            <SheetInput
              style={styles.input}
              placeholder="YYYY-MM-DD (optional)"
              placeholderTextColor="#b2bec3"
              value={form.expirationDate}
              onChangeText={(v) => setField('expirationDate', v)}
              keyboardType="numbers-and-punctuation"
            />

            {/* Shared toggle */}
            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.label}>Shared with household</Text>
                <Text style={styles.toggleHint}>
                  Allow all members to see this item
                </Text>
              </View>
              <Switch
                value={form.isShared}
                onValueChange={(v) => setField('isShared', v)}
                trackColor={{ false: '#DFE6E9', true: '#00B894' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              <Text style={styles.submitText}>
                {submitting ? 'Adding…' : 'Add to Pantry'}
              </Text>
            </TouchableOpacity>

            <View style={styles.bottomPad} />
          </ScrollView>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

AddPantryItemForm.displayName = 'AddPantryItemForm';

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: '#FFFBF5',
  },
  indicator: {
    backgroundColor: '#DFE6E9',
    width: 40,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2D3436',
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DFE6E9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#2D3436',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  halfLeft: {
    flex: 1,
  },
  halfRight: {
    flex: 1,
  },
  categoryRow: {
    paddingVertical: 4,
    gap: 8,
    flexDirection: 'row',
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    backgroundColor: '#FFFFFF',
  },
  categoryChipActive: {
    backgroundColor: '#2D3436',
    borderColor: '#2D3436',
  },
  categoryChipText: {
    fontSize: 13,
    color: '#636e72',
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingVertical: 4,
  },
  toggleHint: {
    fontSize: 12,
    color: '#b2bec3',
    marginTop: 2,
  },
  submitBtn: {
    backgroundColor: '#2D3436',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  bottomPad: {
    height: 20,
  },
});
