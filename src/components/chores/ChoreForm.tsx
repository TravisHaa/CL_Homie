import { forwardRef, useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useHouseStore } from '@/src/store/houseStore';
import type { Chore } from '@/src/types';

interface ChoreFormProps {
  onSubmit: (input: Pick<Chore, 'title' | 'assignedTo' | 'recurrence' | 'dayOfWeek'>) => Promise<void>;
}

const RECURRENCES: { label: string; value: Chore['recurrence'] }[] = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Biweekly', value: 'biweekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Once', value: 'once' },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const ChoreForm = forwardRef<BottomSheetModal, ChoreFormProps>(
  ({ onSubmit }, ref) => {
    const memberMap = useHouseStore((s) => s.memberMap);
    const memberIds = Object.keys(memberMap);

    const [title, setTitle] = useState('');
    const [assignedTo, setAssignedTo] = useState(memberIds[0] ?? '');
    const [recurrence, setRecurrence] = useState<Chore['recurrence']>('weekly');
    const [dayOfWeek, setDayOfWeek] = useState(1);
    const [submitting, setSubmitting] = useState(false);

    const snapPoints = useMemo(() => ['60%', '85%'], []);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
      ),
      []
    );

    const showDayPicker = recurrence === 'weekly' || recurrence === 'biweekly';

    const handleSubmit = async () => {
      if (!title.trim() || !assignedTo) return;
      setSubmitting(true);
      try {
        await onSubmit({
          title: title.trim(),
          assignedTo,
          recurrence,
          dayOfWeek: showDayPicker ? dayOfWeek : null,
        });
        setTitle('');
        setRecurrence('weekly');
        setDayOfWeek(1);
        (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handle}
      >
        <BottomSheetView style={styles.content}>
          <Text style={styles.heading}>Add Chore</Text>

          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Vacuum living room"
            placeholderTextColor="#B2BEC3"
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Assigned To</Text>
          <View style={styles.row}>
            {memberIds.map((uid) => (
              <TouchableOpacity
                key={uid}
                style={[styles.chip, assignedTo === uid && styles.chipActive]}
                onPress={() => setAssignedTo(uid)}
              >
                <Text style={[styles.chipText, assignedTo === uid && styles.chipTextActive]}>
                  {memberMap[uid].displayName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Recurrence</Text>
          <View style={styles.row}>
            {RECURRENCES.map(({ label, value }) => (
              <TouchableOpacity
                key={value}
                style={[styles.chip, recurrence === value && styles.chipActive]}
                onPress={() => setRecurrence(value)}
              >
                <Text style={[styles.chipText, recurrence === value && styles.chipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {showDayPicker && (
            <>
              <Text style={styles.label}>Day of Week</Text>
              <View style={styles.row}>
                {DAYS.map((day, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.chip, dayOfWeek === idx && styles.chipActive]}
                    onPress={() => setDayOfWeek(idx)}
                  >
                    <Text style={[styles.chipText, dayOfWeek === idx && styles.chipTextActive]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.buttonText}>{submitting ? 'Adding…' : 'Add Chore'}</Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

ChoreForm.displayName = 'ChoreForm';

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: '#FFFBF5',
  },
  handle: {
    backgroundColor: '#DFE6E9',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2D3436',
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#636e72',
    marginBottom: 8,
    marginTop: 18,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#DFE6E9',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#2D3436',
    backgroundColor: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#DFE6E9',
    backgroundColor: '#FFFFFF',
  },
  chipActive: {
    backgroundColor: '#2D3436',
    borderColor: '#2D3436',
  },
  chipText: {
    fontSize: 14,
    color: '#2D3436',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  button: {
    backgroundColor: '#2D3436',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
