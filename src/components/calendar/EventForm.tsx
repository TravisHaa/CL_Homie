import { forwardRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { format, parse, isValid } from 'date-fns';
import type { NewEventInput } from '@/src/hooks/useCalendarEvents';
import type { CalendarEvent } from '@/src/types';
import { useHouseStore } from '@/src/store/houseStore';

interface Props {
  onSubmit: (input: NewEventInput) => Promise<void>;
  onUpdate?: (id: string, updates: NewEventInput) => Promise<void>;
  event?: CalendarEvent | null;
}

export const EventForm = forwardRef<BottomSheetModal, Props>(
  ({ onSubmit, onUpdate, event }, ref) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startTimeStr, setStartTimeStr] = useState('');
    const [endTimeStr, setEndTimeStr] = useState('');
    const [assignedTo, setAssignedTo] = useState<string[]>([]);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const memberMap = useHouseStore((s) => s.memberMap);

    // Pre-fill fields when switching to edit mode
    useEffect(() => {
      if (event) {
        setTitle(event.title);
        setDescription(event.description ?? '');
        setStartTimeStr(format(event.startTime.toDate(), 'yyyy-MM-dd HH:mm'));
        setEndTimeStr(format(event.endTime.toDate(), 'yyyy-MM-dd HH:mm'));
        setAssignedTo(event.assignedTo ?? []);
        setError('');
      } else {
        reset();
      }
    }, [event]);

    const reset = () => {
      setTitle('');
      setDescription('');
      setStartTimeStr('');
      setEndTimeStr('');
      setAssignedTo([]);
      setError('');
    };

    const parseDateTime = (str: string): Date | null => {
      const d = parse(str.trim(), 'yyyy-MM-dd HH:mm', new Date());
      return isValid(d) ? d : null;
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

      const payload: NewEventInput = {
        title: title.trim(),
        description: description.trim(),
        startTime,
        endTime,
        assignedTo,
      };

      setSubmitting(true);
      try {
        if (event && onUpdate) {
          await onUpdate(event.id, payload);
        } else {
          await onSubmit(payload);
        }
        reset();
        (ref as React.RefObject<BottomSheetModal>).current?.dismiss();
      } catch (err: any) {
        Alert.alert(
          event ? 'Could not update event' : 'Could not add event',
          err?.message ?? 'Unknown error'
        );
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
        snapPoints={['75%']}
        backdropComponent={renderBackdrop}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        onDismiss={reset}
      >
        <BottomSheetView style={styles.container}>
          <Text style={styles.heading}>{event ? event.title : 'Add Event'}</Text>

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
            <Text style={styles.buttonText}>
              {submitting ? 'Saving…' : event ? 'Edit' : 'Add Event'}
            </Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

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
