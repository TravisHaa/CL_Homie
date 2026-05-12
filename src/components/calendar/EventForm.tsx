import { forwardRef, useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { format } from 'date-fns';
import type { NewEventInput } from '@/src/hooks/useCalendarEvents';
import type { CalendarEvent } from '@/src/types';
import { useHouseStore } from '@/src/store/houseStore';

// ── Scroll picker constants ───────────────────────────────────
const ITEM_H = 44;
const VISIBLE = 5;
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const HOURS   = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
const AMPM    = ['AM', 'PM'];

// ── Single scrollable column ──────────────────────────────────
function PickerCol({
  data,
  selectedIndex,
  onChange,
  width = 56,
}: {
  data: string[];
  selectedIndex: number;
  onChange: (i: number) => void;
  width?: number;
}) {
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      ref.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: false });
    }, 80);
    return () => clearTimeout(t);
  }, []);

  const snapTo = (y: number) => {
    const idx = Math.max(0, Math.min(Math.round(y / ITEM_H), data.length - 1));
    ref.current?.scrollTo({ y: idx * ITEM_H, animated: true });
    onChange(idx);
  };

  return (
    <ScrollView
      ref={ref}
      style={{ height: ITEM_H * VISIBLE, width, backgroundColor: 'transparent' }}
      snapToInterval={ITEM_H}
      decelerationRate="fast"
      showsVerticalScrollIndicator={false}
      onMomentumScrollEnd={(e) => snapTo(e.nativeEvent.contentOffset.y)}
      onScrollEndDrag={(e) => snapTo(e.nativeEvent.contentOffset.y)}
      contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
    >
      {data.map((label, i) => (
        <TouchableOpacity
          key={i}
          style={{ height: ITEM_H, justifyContent: 'center', alignItems: 'center' }}
          onPress={() => {
            ref.current?.scrollTo({ y: i * ITEM_H, animated: true });
            onChange(i);
          }}
          activeOpacity={0.6}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: i === selectedIndex ? '700' : '400',
              color: i === selectedIndex ? '#2D3436' : '#B2BEC3',
            }}
          >
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ── Full date + time picker dropdown ─────────────────────────
function DatePickerDropdown({
  value,
  onChange,
}: {
  value: Date;
  onChange: (d: Date) => void;
}) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => String(currentYear - 1 + i));

  const mo  = value.getMonth();
  const dy  = value.getDate();
  const yr  = value.getFullYear();
  const h24 = value.getHours();
  const min = value.getMinutes();

  const isAM  = h24 < 12;
  const h12   = h24 % 12 || 12;
  const miIdx = Math.min(Math.round(min / 5), 11);

  const daysInMonth = new Date(yr, mo + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));

  const apply = (patch: {
    mo?: number; dy?: number; yr?: number;
    h12?: number; miIdx?: number; isAM?: boolean;
  }) => {
    const m    = patch.mo   ?? mo;
    const y    = patch.yr   ?? yr;
    const maxD = new Date(y, m + 1, 0).getDate();
    const d    = Math.min(patch.dy ?? dy, maxD);
    const hour = patch.h12  ?? h12;
    const am   = patch.isAM ?? isAM;
    const mi   = patch.miIdx ?? miIdx;
    const h    = am ? (hour === 12 ? 0 : hour) : (hour === 12 ? 12 : hour + 12);
    const next = new Date(value);
    next.setFullYear(y, m, d);
    next.setHours(h, mi * 5, 0, 0);
    onChange(next);
  };

  return (
    <View style={pickerStyles.wrap}>
      <View style={pickerStyles.highlight} pointerEvents="none" />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
        <PickerCol
          data={MONTHS}
          selectedIndex={mo}
          onChange={(i) => apply({ mo: i })}
          width={52}
        />
        <PickerCol
          key={daysInMonth}
          data={days}
          selectedIndex={Math.min(dy - 1, daysInMonth - 1)}
          onChange={(i) => apply({ dy: i + 1 })}
          width={36}
        />
        <PickerCol
          data={years}
          selectedIndex={Math.max(0, yr - (currentYear - 1))}
          onChange={(i) => apply({ yr: currentYear - 1 + i })}
          width={60}
        />
        <View style={pickerStyles.sep} />
        <PickerCol
          data={HOURS}
          selectedIndex={h12 - 1}
          onChange={(i) => apply({ h12: i + 1 })}
          width={36}
        />
        <Text style={pickerStyles.colon}>:</Text>
        <PickerCol
          data={MINUTES}
          selectedIndex={miIdx}
          onChange={(i) => apply({ miIdx: i })}
          width={40}
        />
        <PickerCol
          data={AMPM}
          selectedIndex={isAM ? 0 : 1}
          onChange={(i) => apply({ isAM: i === 0 })}
          width={44}
        />
      </View>
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  wrap: {
    backgroundColor: '#F8FAFF',
    borderWidth: 1,
    borderColor: '#DFE6E9',
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    top: ITEM_H * 2,
    left: 0,
    right: 0,
    height: ITEM_H,
    backgroundColor: '#EBF0FF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#B6CBFA',
  },
  sep: {
    width: 1,
    height: ITEM_H * VISIBLE,
    backgroundColor: '#DFE6E9',
    marginHorizontal: 6,
    alignSelf: 'stretch',
  },
  colon: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2D3436',
    paddingHorizontal: 2,
  },
});

// ── EventForm ─────────────────────────────────────────────────

interface Props {
  onSubmit: (input: NewEventInput) => Promise<void>;
  onUpdate?: (id: string, updates: NewEventInput) => Promise<void>;
  event?: CalendarEvent | null;
}

export const EventForm = forwardRef<BottomSheetModal, Props>(
  ({ onSubmit, onUpdate, event }, ref) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState<Date>(new Date());
    const [endDate, setEndDate] = useState<Date>(new Date());
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [assignedTo, setAssignedTo] = useState<string[]>([]);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const memberMap = useHouseStore((s) => s.memberMap);

    useEffect(() => {
      if (event) {
        setTitle(event.title);
        setDescription(event.description ?? '');
        setStartDate(event.startTime.toDate());
        setEndDate(event.endTime.toDate());
        setAssignedTo(event.assignedTo ?? []);
        setError('');
      } else {
        reset();
      }
    }, [event]);

    const reset = () => {
      setTitle('');
      setDescription('');
      setStartDate(new Date());
      setEndDate(new Date());
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

      if (endDate <= startDate) {
        setError('End time must be after start time');
        return;
      }

      const payload: NewEventInput = {
        title: title.trim(),
        description: description.trim(),
        startTime: startDate,
        endTime: endDate,
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
        snapPoints={['85%']}
        backdropComponent={renderBackdrop}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        onDismiss={reset}
      >
        <BottomSheetScrollView contentContainerStyle={styles.container}>
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

          <Text style={styles.label}>Start</Text>
          <TouchableOpacity
            style={styles.dateRow}
            onPress={() => {
              setShowEndPicker(false);
              setShowStartPicker((p) => !p);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.dateValue}>{format(startDate, 'MMM d, yyyy  h:mm a')}</Text>
            <Text style={styles.dateChevron}>{showStartPicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showStartPicker && (
            <DatePickerDropdown value={startDate} onChange={setStartDate} />
          )}

          <Text style={[styles.label, { marginTop: 8 }]}>End</Text>
          <TouchableOpacity
            style={styles.dateRow}
            onPress={() => {
              setShowStartPicker(false);
              setShowEndPicker((p) => !p);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.dateValue}>{format(endDate, 'MMM d, yyyy  h:mm a')}</Text>
            <Text style={styles.dateChevron}>{showEndPicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showEndPicker && (
            <DatePickerDropdown value={endDate} onChange={setEndDate} />
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {submitting ? 'Saving…' : event ? 'Save' : 'Add Event'}
            </Text>
          </TouchableOpacity>
        </BottomSheetScrollView>
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
  label: { fontSize: 13, fontWeight: '600', color: '#636e72', marginBottom: 6 },
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#DFE6E9',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
    marginBottom: 4,
  },
  dateValue: { fontSize: 15, color: '#2D3436' },
  dateChevron: { fontSize: 11, color: '#B2BEC3' },
  error: { color: '#E17055', fontSize: 13, marginBottom: 10, marginTop: 8 },
  button: {
    backgroundColor: '#2D3436',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
