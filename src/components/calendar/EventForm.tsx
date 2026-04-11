import { forwardRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import BottomSheet, {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { parse, isValid } from 'date-fns';
import type { NewEventInput } from '@/src/hooks/useCalendarEvents';

interface Props {
  onSubmit: (input: NewEventInput) => Promise<void>;
}

export const EventForm = forwardRef<BottomSheetModal, Props>(({ onSubmit }, ref) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTimeStr, setStartTimeStr] = useState('');
  const [endTimeStr, setEndTimeStr] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setTitle('');
    setDescription('');
    setStartTimeStr('');
    setEndTimeStr('');
    setError('');
  };

  const parseDateTime = (str: string): Date | null => {
    const d = parse(str.trim(), 'yyyy-MM-dd HH:mm', new Date());
    return isValid(d) ? d : null;
  };

  const handleSubmit = async () => {
    setError('');

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    const startTime = parseDateTime(startTimeStr);
    if (!startTime) {
      setError('Start time must be in format YYYY-MM-DD HH:MM');
      return;
    }

    const endTime = parseDateTime(endTimeStr);
    if (!endTime) {
      setError('End time must be in format YYYY-MM-DD HH:MM');
      return;
    }

    if (endTime <= startTime) {
      setError('End time must be after start time');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ title: title.trim(), description: description.trim(), startTime, endTime });
      reset();
      (ref as React.RefObject<BottomSheetModal>).current?.dismiss();
    } catch {
      setError('Failed to save event. Please try again.');
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

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={['70%']}
      backdropComponent={renderBackdrop}
      keyboardBehavior="extend"
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

        <TextInput
          style={styles.input}
          placeholder="Start: YYYY-MM-DD HH:MM"
          placeholderTextColor="#B2BEC3"
          value={startTimeStr}
          onChangeText={setStartTimeStr}
          keyboardType="numbers-and-punctuation"
          autoCorrect={false}
        />

        <TextInput
          style={styles.input}
          placeholder="End: YYYY-MM-DD HH:MM"
          placeholderTextColor="#B2BEC3"
          value={endTimeStr}
          onChangeText={setEndTimeStr}
          keyboardType="numbers-and-punctuation"
          autoCorrect={false}
        />

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
