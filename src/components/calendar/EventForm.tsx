import { forwardRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { format } from 'date-fns';
import type { NewEventInput } from '@/src/hooks/useCalendarEvents';
import { useHouseStore } from '@/src/store/houseStore';

interface Props {
  onSubmit: (input: NewEventInput) => Promise<void>;
}

export const EventForm = forwardRef<BottomSheetModal, Props>(({ onSubmit }, ref) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const memberMap = useHouseStore((s) => s.memberMap);

  const reset = () => {
    setTitle('');
    setDescription('');
    setStartTime(null);
    setEndTime(null);
    setShowStartPicker(false);
    setShowEndPicker(false);
    setAssignedTo([]);
    setError('');
  };

  const toggleAssignee = (uid: string) => {
    setAssignedTo((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleSubmit = async () => {
    setError('');

    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!startTime) {
      setError('Start time is required');
      return;
    }
    if (!endTime) {
      setError('End time is required');
      return;
    }
    if (endTime <= startTime) {
      setError('End time must be after start time');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        startTime,
        endTime,
        assignedTo,
      });
      reset();
      (ref as React.RefObject<BottomSheetModal>).current?.dismiss();
    } catch (err: any) {
      Alert.alert('Could not add event', err?.message ?? 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    []
  );

  const memberIds = Object.keys(memberMap);

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={['85%']}
      backdropComponent={renderBackdrop}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      onDismiss={reset}
    >
      <BottomSheetView style={styles.container}>
        <Text style={styles.heading}>Add Event</Text>

        <TextInput
          style={styles.input}
          placeholder="Title"
          placeholderTextColor="#B2BEC3"
          value={title}
          onChangeText={setTitle}
        />

        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Description (optional)"
          placeholderTextColor="#B2BEC3"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={2}
        />

        {memberIds.length > 0 && (
          <View style={styles.assigneeSection}>
            <Text style={styles.label}>Assign To</Text>
            <View style={styles.chipRow}>
              {memberIds.map((uid) => {
                const member = memberMap[uid];
                const selected = assignedTo.includes(uid);
                return (
                  <TouchableOpacity
                    key={uid}
                    style={[
                      styles.chip,
                      selected && { backgroundColor: member.color, borderColor: member.color },
                    ]}
                    onPress={() => toggleAssignee(uid)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {member.displayName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.dateRow}
          onPress={() => { setShowEndPicker(false); setShowStartPicker((v) => !v); }}
          activeOpacity={0.7}
        >
          <Text style={startTime ? styles.dateText : styles.datePlaceholder}>
            {startTime ? format(startTime, 'MMM d, yyyy  h:mm a') : 'Start time'}
          </Text>
        </TouchableOpacity>
        {showStartPicker && (
          <DateTimePicker
            value={startTime ?? new Date()}
            mode="datetime"
            display="spinner"
            onChange={(_, date) => {
              if (date) setStartTime(date);
            }}
            style={styles.picker}
          />
        )}

        <TouchableOpacity
          style={styles.dateRow}
          onPress={() => { setShowStartPicker(false); setShowEndPicker((v) => !v); }}
          activeOpacity={0.7}
        >
          <Text style={endTime ? styles.dateText : styles.datePlaceholder}>
            {endTime ? format(endTime, 'MMM d, yyyy  h:mm a') : 'End time'}
          </Text>
        </TouchableOpacity>
        {showEndPicker && (
          <DateTimePicker
            value={endTime ?? startTime ?? new Date()}
            mode="datetime"
            display="spinner"
            onChange={(_, date) => {
              if (date) setEndTime(date);
            }}
            style={styles.picker}
          />
        )}

        {!!error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>{submitting ? 'Saving…' : 'Add Event'}</Text>
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

EventForm.displayName = 'EventForm';

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  heading: { fontSize: 20, fontWeight: '700', color: '#2D3436', marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#DFE6E9',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#2D3436',
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  multiline: { height: 64, textAlignVertical: 'top' },
  assigneeSection: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#636e72', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#DFE6E9',
    backgroundColor: '#fff',
  },
  chipText: { fontSize: 13, fontWeight: '500', color: '#636e72' },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  dateRow: {
    borderWidth: 1,
    borderColor: '#DFE6E9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  dateText: { fontSize: 15, color: '#2D3436' },
  datePlaceholder: { fontSize: 15, color: '#B2BEC3' },
  picker: { marginBottom: 8 },
  error: { color: '#E17055', fontSize: 13, marginBottom: 10 },
  button: {
    backgroundColor: '#2D3436',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
