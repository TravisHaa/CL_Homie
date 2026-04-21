import { useHouseStore } from '@/src/store/houseStore';
import type { Chore } from '@/src/types';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { forwardRef, useCallback, useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface ChoreFormProps {
  onSubmit: (input: Pick<Chore, 'title' | 'assignedTo' | 'recurrence' | 'dayOfWeek'> & {
    dueAt?: Timestamp | null;
  }) => Promise<void>;
}

const RECURRENCES: { label: string; value: Chore['recurrence'] }[] = [
  { label: 'Once', value: 'once' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Biweekly', value: 'biweekly' },
  { label: 'Monthly', value: 'monthly' },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const ChoreForm = forwardRef<BottomSheetModal, ChoreFormProps>(
  ({ onSubmit }, ref) => {
    const memberMap = useHouseStore((s) => s.memberMap);
    const memberIds = Object.keys(memberMap);

    const [title, setTitle] = useState('');
    const [assignedTo, setAssignedTo] = useState(memberIds[0] ?? '');
    const [recurrence, setRecurrence] = useState<Chore['recurrence']>('once');
    const [dayOfWeek, setDayOfWeek] = useState(1);
    const [dueDate, setDueDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const snapPoints = useMemo(() => ['60%', '85%'], []);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
      ),
      []
    );

    const showDayPicker = recurrence === 'weekly' || recurrence === 'biweekly';
    const showDueDatePicker = recurrence === 'once';

    const handleSubmit = async () => {
      if (!title.trim()) return;
      if (!assignedTo) {
        Alert.alert('No members', 'Join a house before adding chores.');
        return;
      }
      setSubmitting(true);
      try {
        await onSubmit({
          title: title.trim(),
          assignedTo,
          recurrence,
          dayOfWeek: showDayPicker ? dayOfWeek : null,
          dueAt: dueDate ? Timestamp.fromDate(dueDate) : null,
        });
        setTitle('');
        setRecurrence('once');
        setDayOfWeek(1);
        setDueDate(null);
        (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
      } catch (err: any) {
        Alert.alert('Could not add chore', err.message ?? 'Unknown error');
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

          {showDueDatePicker && (
            <>
              <Text style={styles.label}>Due Date (Optional)</Text>
              
              {Platform.OS === 'web' ? (
                // WEB: Direct HTML input styled to match design
                <View style={styles.datePickerContainer}>
                  <View style={styles.dateButton}>
                    <input
                      type="date"
                      value={dueDate ? format(dueDate, 'yyyy-MM-dd') : ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          const [year, month, day] = e.target.value.split('-').map(Number);
                          setDueDate(new Date(year, month - 1, day));
                        } else {
                          setDueDate(null);
                        }
                      }}
                      style={{
                        width: '100%',
                        border: 'none',
                        background: 'transparent',
                        fontSize: 16,
                        color: '#2D3436',
                        outline: 'none',
                        padding: 0,
                      }}
                    />
                  </View>
                  {dueDate && (
                    <TouchableOpacity
                      style={styles.clearButton}
                      onPress={() => setDueDate(null)}
                    >
                      <Text style={styles.clearButtonText}>Clear</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                // NATIVE: Button + Modal DateTimePicker
                <>
                  <View style={styles.datePickerContainer}>
                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text style={styles.dateButtonText}>
                        {dueDate ? dueDate.toLocaleDateString() : 'Select date'}
                      </Text>
                    </TouchableOpacity>
                    {dueDate && (
                      <TouchableOpacity
                        style={styles.clearButton}
                        onPress={() => setDueDate(null)}
                      >
                        <Text style={styles.clearButtonText}>Clear</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {showDatePicker && (
                    <DateTimePicker
                      value={dueDate || new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) {
                          setDueDate(selectedDate);
                        }
                      }}
                    />
                  )}
                </>
              )}
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
  datePickerContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dateButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#DFE6E9',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#2D3436',
  },
  clearButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E17055',
    backgroundColor: '#FFF0ED',
  },
  clearButtonText: {
    fontSize: 14,
    color: '#E17055',
    fontWeight: '600',
  },
});
