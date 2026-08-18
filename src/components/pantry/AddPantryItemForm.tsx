import {
  forwardRef,
  useEffect,
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
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { lookupBarcode } from '@/src/services/openFoodFacts';

interface Props {
  onAdd: (input: AddPantryItemInput) => Promise<void>;
  initialBarcode?: string | null;
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
  ({ onAdd, initialBarcode }, ref) => {
    const snapPoints = useMemo(() => ['70%', '92%'], []);
    // BottomSheetTextInput relies on a native focus API that is missing on react-native-web.
    const SheetInput = Platform.OS === 'web' ? TextInput : BottomSheetTextInput;
    const [form, setForm] = useState(INITIAL_STATE);
    const [submitting, setSubmitting] = useState(false);
    const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
    const [scannerVisible, setScannerVisible] = useState(false);
    const [lookupStatus, setLookupStatus] = useState<'idle' | 'loading' | 'found' | 'not_found' | 'error'>('idle');

    useEffect(() => {
      if (initialBarcode) setScannedBarcode(initialBarcode);
    }, [initialBarcode]);

    useEffect(() => {
      if (!scannedBarcode) {
        setLookupStatus('idle');
        return;
      }
      let cancelled = false;
      setLookupStatus('loading');
      lookupBarcode(scannedBarcode).then((result) => {
        if (cancelled) return;
        setLookupStatus(result.status);
        if (result.status === 'found') {
          setField('name', result.name);
          setField('category', result.category);
        }
      });
      return () => { cancelled = true; };
    }, [scannedBarcode]);

    function reset() {
      setForm(INITIAL_STATE);
      setScannedBarcode(null);
      setLookupStatus('idle');
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
          barcode: scannedBarcode,
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
      <>
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
            <View style={styles.labelRow}>
              <Text style={styles.label}>Name *</Text>
              <TouchableOpacity
                style={styles.scanBtn}
                onPress={() => setScannerVisible(true)}
                activeOpacity={0.75}
              >
                <Text style={styles.scanBtnText}>📷 Scan</Text>
              </TouchableOpacity>
            </View>
            <SheetInput
              style={styles.input}
              placeholder="e.g. Almond Milk"
              placeholderTextColor="#b2bec3"
              value={form.name}
              onChangeText={(v) => setField('name', v)}
              returnKeyType="next"
            />
            {scannedBarcode ? (
              <View style={styles.barcodeChip}>
                <Text style={styles.barcodeChipText} numberOfLines={1}>
                  {lookupStatus === 'loading' ? 'Looking up…' : `Barcode: ${scannedBarcode}`}
                </Text>
                <TouchableOpacity
                  onPress={() => setScannedBarcode(null)}
                  hitSlop={8}
                >
                  <Text style={styles.barcodeChipClear}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {lookupStatus === 'found' ? (
              <Text style={styles.lookupNotice}>✓ Name and category auto-filled from barcode</Text>
            ) : lookupStatus === 'not_found' ? (
              <Text style={[styles.lookupNotice, styles.lookupNoticeWarn]}>
                Product not found — fill in details manually
              </Text>
            ) : lookupStatus === 'error' ? (
              <Text style={[styles.lookupNotice, styles.lookupNoticeMute]}>
                Lookup unavailable — fill in details manually
              </Text>
            ) : null}

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

      <BarcodeScannerModal
        visible={scannerVisible}
        onScan={(barcode) => {
          setScannedBarcode(barcode);
          setScannerVisible(false);
        }}
        onClose={() => setScannerVisible(false)}
      />
      </>
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
    color: '#2E0800',
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E0800',
    marginTop: 14,
    marginBottom: 6,
  },
  scanBtn: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  scanBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E0800',
  },
  barcodeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8F2',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 6,
    gap: 8,
  },
  barcodeChipText: {
    flex: 1,
    fontSize: 12,
    color: '#00B894',
    fontWeight: '600',
  },
  barcodeChipClear: {
    fontSize: 13,
    color: '#636e72',
    fontWeight: '700',
  },
  lookupNotice: {
    fontSize: 12,
    color: '#00B894',
    fontWeight: '500',
    marginTop: 4,
    marginLeft: 2,
  },
  lookupNoticeWarn: {
    color: '#E17055',
  },
  lookupNoticeMute: {
    color: '#b2bec3',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DFE6E9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#2E0800',
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
