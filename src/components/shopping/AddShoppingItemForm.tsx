import { forwardRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SHOPPING_CATEGORIES } from '@/src/utils/categories';
import { CATEGORY_COLORS } from '@/src/utils/colors';
import type { AddItemInput } from '@/src/hooks/useShoppingList';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().min(1, 'Category is required'),
  quantity: z.number().min(0.01, 'Must be greater than 0'),
  unit: z.string().min(1, 'Unit is required'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onSubmit: (data: AddItemInput) => Promise<void>;
}

const AddShoppingItemForm = forwardRef<BottomSheet, Props>(({ onSubmit }, ref) => {
  const snapPoints = useMemo(() => ['62%'], []);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      category: 'produce',
      quantity: 1,
      unit: '',
    },
  });

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
    []
  );

  const handleFormSubmit = async (values: FormValues) => {
    await onSubmit(values);
    reset();
  };

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={styles.handle}
      backgroundStyle={styles.sheetBg}
    >
      <BottomSheetView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.kav}
        >
          <Text style={styles.title}>Add Item</Text>

          {/* Name */}
          <Text style={styles.label}>Name</Text>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                placeholder="e.g. Almond milk"
                placeholderTextColor="#B2BEC3"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="words"
                returnKeyType="next"
              />
            )}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name.message}</Text>}

          {/* Category */}
          <Text style={styles.label}>Category</Text>
          <Controller
            control={control}
            name="category"
            render={({ field: { onChange, value } }) => (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
                contentContainerStyle={styles.categoryContent}
              >
                {SHOPPING_CATEGORIES.map((cat) => {
                  const isSelected = value === cat;
                  const color = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.other;
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => onChange(cat)}
                      style={[
                        styles.categoryPill,
                        isSelected && { backgroundColor: color, borderColor: color },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.categoryPillText,
                          isSelected && styles.categoryPillTextSelected,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          />

          {/* Quantity + Unit row */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.label}>Qty</Text>
              <Controller
                control={control}
                name="quantity"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.quantity && styles.inputError]}
                    placeholder="1"
                    placeholderTextColor="#B2BEC3"
                    value={String(value)}
                    onChangeText={(text) => {
                      const n = parseFloat(text);
                      onChange(isNaN(n) ? 0 : n);
                    }}
                    onBlur={onBlur}
                    keyboardType="decimal-pad"
                    returnKeyType="next"
                  />
                )}
              />
              {errors.quantity && <Text style={styles.errorText}>{errors.quantity.message}</Text>}
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.label}>Unit</Text>
              <Controller
                control={control}
                name="unit"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.unit && styles.inputError]}
                    placeholder="e.g. carton"
                    placeholderTextColor="#B2BEC3"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit(handleFormSubmit)}
                  />
                )}
              />
              {errors.unit && <Text style={styles.errorText}>{errors.unit.message}</Text>}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleSubmit(handleFormSubmit)}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <Text style={styles.submitBtnText}>
              {isSubmitting ? 'Adding…' : 'Add to list'}
            </Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </BottomSheetView>
    </BottomSheet>
  );
});

AddShoppingItemForm.displayName = 'AddShoppingItemForm';
export { AddShoppingItemForm };

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: '#FFFBF5' },
  handle: { backgroundColor: '#DFE6E9', width: 40 },
  container: { flex: 1, paddingHorizontal: 20 },
  kav: { flex: 1 },
  title: { fontSize: 20, fontWeight: '800', color: '#2D3436', marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '700', color: '#636e72', marginBottom: 6, letterSpacing: 0.5 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#DFE6E9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#2D3436',
    marginBottom: 4,
  },
  inputError: { borderColor: '#FF6B6B' },
  errorText: { fontSize: 11, color: '#FF6B6B', marginBottom: 8 },
  categoryScroll: { marginBottom: 16 },
  categoryContent: { gap: 8, paddingRight: 4 },
  categoryPill: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: '#DFE6E9',
    backgroundColor: '#fff',
  },
  categoryPillText: { fontSize: 13, fontWeight: '600', color: '#636e72', textTransform: 'capitalize' },
  categoryPillTextSelected: { color: '#2D3436' },
  row: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  rowLeft: { flex: 1 },
  rowRight: { flex: 2 },
  submitBtn: {
    backgroundColor: '#2D3436',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
