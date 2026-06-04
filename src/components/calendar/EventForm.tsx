import { forwardRef, useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Calendar } from 'react-native-calendars';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { format, addHours } from 'date-fns';
import type { NewEventInput } from '@/src/hooks/useCalendarEvents';
import type { CalendarEvent } from '@/src/types';
import { useHouseStore } from '@/src/store/houseStore';

// ── Scroll picker constants ───────────────────────────────────────────
const ITEM_H  = 44;
const VISIBLE = 5;
const HOURS   = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
const AMPM    = ['AM', 'PM'];

function PickerCol({ data, selectedIndex, onChange, width = 56 }: {
  data: string[]; selectedIndex: number; onChange: (i: number) => void; width?: number;
}) {
  const ref = useRef<ScrollView>(null);
  useEffect(() => {
    const t = setTimeout(() => ref.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: false }), 80);
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
          onPress={() => { ref.current?.scrollTo({ y: i * ITEM_H, animated: true }); onChange(i); }}
          activeOpacity={0.6}
        >
          <Text style={{ fontSize: 15, fontWeight: i === selectedIndex ? '700' : '400', color: i === selectedIndex ? '#2D1A0E' : '#C8BFB0' }}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function TimePickerRow({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const h24 = value.getHours(), min = value.getMinutes();
  const isAM = h24 < 12, h12 = h24 % 12 || 12, miIdx = Math.min(Math.round(min / 5), 11);

  const apply = (patch: { h12?: number; miIdx?: number; isAM?: boolean }) => {
    const hour = patch.h12 ?? h12, am = patch.isAM ?? isAM, mi = patch.miIdx ?? miIdx;
    const h = am ? (hour === 12 ? 0 : hour) : (hour === 12 ? 12 : hour + 12);
    const next = new Date(value);
    next.setHours(h, mi * 5, 0, 0);
    onChange(next);
  };

  return (
    <View style={pickerStyles.wrap}>
      <View style={pickerStyles.highlight} pointerEvents="none" />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
        <PickerCol data={HOURS} selectedIndex={h12 - 1} onChange={(i) => apply({ h12: i + 1 })} width={36} />
        <Text style={pickerStyles.colon}>:</Text>
        <PickerCol data={MINUTES} selectedIndex={miIdx} onChange={(i) => apply({ miIdx: i })} width={40} />
        <PickerCol data={AMPM} selectedIndex={isAM ? 0 : 1} onChange={(i) => apply({ isAM: i === 0 })} width={44} />
      </View>
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  wrap: { backgroundColor: '#FDFAF7', borderWidth: 1, borderColor: '#E8DDD0', borderRadius: 12, marginBottom: 8, overflow: 'hidden' },
  highlight: { position: 'absolute', top: ITEM_H * 2, left: 0, right: 0, height: ITEM_H, backgroundColor: '#F0E8DC', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#D8C8B8' },
  sep: { width: 1, height: ITEM_H * VISIBLE, backgroundColor: '#E8DDD0', marginHorizontal: 6, alignSelf: 'stretch' },
  colon: { fontSize: 17, fontWeight: '700', color: '#2D1A0E', paddingHorizontal: 2 },
});

// ── Recurrence ────────────────────────────────────────────────────────

type RecurrenceOption = 'none' | 'daily' | 'weekly' | 'monthly';

const RECURRENCE_LABELS: Record<RecurrenceOption, string> = {
  none: 'Does not repeat',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

// ── EventForm ─────────────────────────────────────────────────────────

interface Props {
  onSubmit: (input: NewEventInput) => Promise<void>;
  onUpdate?: (id: string, updates: NewEventInput) => Promise<void>;
  event?: CalendarEvent | null;
}

export const EventForm = forwardRef<BottomSheetModal, Props>(
  ({ onSubmit, onUpdate, event }, ref) => {
    const [title, setTitle]             = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate]     = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [assignedTo, setAssignedTo]         = useState<string[]>([]);
    const [recurrence, setRecurrence]         = useState<RecurrenceOption>('none');
    const [showRecurrence, setShowRecurrence] = useState(false);
    const [error, setError]                   = useState('');
    const [submitting, setSubmitting]         = useState(false);

    const memberMap = useHouseStore((s) => s.memberMap);

    useEffect(() => {
      if (event) {
        setTitle(event.title);
        setDescription(event.description ?? '');
        setStartDate(event.startTime.toDate());
        setAssignedTo(event.assignedTo ?? []);
        setError('');
      } else {
        reset();
      }
    }, [event]);

    const reset = () => {
      setTitle(''); setDescription('');
      setStartDate(new Date()); setShowDatePicker(false);
      setAssignedTo([]); setRecurrence('none'); setShowRecurrence(false); setError('');
    };

    const dismiss = () => (ref as React.RefObject<BottomSheetModal>).current?.dismiss();

    const toggleAssignee = (uid: string) =>
      setAssignedTo((prev) => prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]);

    const handleSubmit = async () => {
      setError('');
      if (!title.trim()) { setError('Event name is required'); return; }
      const endDate = addHours(startDate, 1);
      const payload: NewEventInput = {
        title: title.trim(),
        description: description.trim(),
        startTime: startDate,
        endTime: endDate,
        assignedTo,
      };
      setSubmitting(true);
      try {
        if (event && onUpdate) await onUpdate(event.id, payload);
        else await onSubmit(payload);
        reset();
        dismiss();
      } catch (err: any) {
        Alert.alert(event ? 'Could not update event' : 'Could not add event', err?.message ?? 'Unknown error');
      } finally {
        setSubmitting(false);
      }
    };

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
      ), []
    );

    const memberIds = Object.keys(memberMap);

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={['98%']}
        backdropComponent={renderBackdrop}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        onDismiss={reset}
        handleComponent={null}
        backgroundStyle={styles.sheetBg}
      >
        {/* ── Gradient header ───────────────────────────────────── */}
        <LinearGradient
          colors={['#F5DDD0', '#EDD0E8', '#D0D4F0', '#C8E0F5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerRow}>
            <Text style={styles.heading}>
              🎉  {event ? 'Edit Event' : 'New Event'}
            </Text>
            <TouchableOpacity onPress={dismiss} hitSlop={12} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#3B1F0E" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Dotted divider */}
        <View style={styles.dottedDivider} />

        <BottomSheetScrollView contentContainerStyle={styles.container}>

          {/* Event Name */}
          <Text style={styles.label}>Event Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Type here..."
            placeholderTextColor="#C8BFB0"
            value={title}
            onChangeText={setTitle}
          />

          {/* Event Date */}
          <Text style={[styles.label, { marginTop: 8 }]}>Event Date</Text>
          <TouchableOpacity
            style={styles.datePill}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.75}
          >
            <Ionicons name="calendar-outline" size={15} color="#3B1F0E" />
            <Text style={styles.datePillTxt}>{format(startDate, "EEEE, MMM. d")}</Text>
          </TouchableOpacity>

          {/* Time picker (always visible) */}
          <TimePickerRow value={startDate} onChange={setStartDate} />

          {/* Calendar modal */}
          <Modal visible={showDatePicker} transparent animationType="fade">
            <Pressable style={styles.calOverlay} onPress={() => setShowDatePicker(false)}>
              <Pressable style={styles.calCard} onPress={(e) => e.stopPropagation()}>
                <Calendar
                  current={format(startDate, 'yyyy-MM-dd')}
                  markedDates={{ [format(startDate, 'yyyy-MM-dd')]: { selected: true, selectedColor: '#4E7B78' } }}
                  onDayPress={(day: { dateString: string }) => {
                    const [y, m, d] = day.dateString.split('-').map(Number);
                    const next = new Date(startDate);
                    next.setFullYear(y, m - 1, d);
                    setStartDate(next);
                    setShowDatePicker(false);
                  }}
                  theme={{
                    backgroundColor: '#FDFAF7',
                    calendarBackground: '#FDFAF7',
                    todayTextColor: '#4E7B78',
                    selectedDayBackgroundColor: '#4E7B78',
                    selectedDayTextColor: '#fff',
                    arrowColor: '#2D1A0E',
                    textDayFontFamily: 'AlbertSans_400Regular',
                    textMonthFontFamily: 'AlbertSans_700Bold',
                    textDayHeaderFontFamily: 'AlbertSans_600SemiBold',
                    textDayFontSize: 14,
                    textMonthFontSize: 16,
                    textDayHeaderFontSize: 12,
                  }}
                />
              </Pressable>
            </Pressable>
          </Modal>

          {/* Recurrence */}
          <Text style={[styles.label, { marginTop: 8 }]}>Recurrence</Text>
          <TouchableOpacity
            style={styles.recurrencePill}
            onPress={() => setShowRecurrence((p) => !p)}
            activeOpacity={0.75}
          >
            <Text style={styles.recurrenceTxt}>{RECURRENCE_LABELS[recurrence]}</Text>
            <Ionicons name={showRecurrence ? 'chevron-up' : 'chevron-down'} size={14} color="#9E9380" />
          </TouchableOpacity>
          {showRecurrence && (
            <View style={styles.recurrenceDropdown}>
              {(Object.entries(RECURRENCE_LABELS) as [RecurrenceOption, string][]).map(([key, label], i, arr) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.recurrenceOption,
                    recurrence === key && styles.recurrenceOptionSelected,
                    i < arr.length - 1 && styles.recurrenceOptionBorder,
                  ]}
                  onPress={() => { setRecurrence(key); setShowRecurrence(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.recurrenceOptionTxt, recurrence === key && styles.recurrenceOptionTxtSelected]}>
                    {label}
                  </Text>
                  {recurrence === key && <Ionicons name="checkmark" size={15} color="#4E7B78" />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Assign To */}
          {memberIds.length > 0 && (
            <>
              <Text style={[styles.label, { marginTop: 8 }]}>Assign To</Text>
              <View style={styles.chipRow}>
                {memberIds.map((uid) => {
                  const member = memberMap[uid];
                  const selected = assignedTo.includes(uid);
                  return (
                    <TouchableOpacity
                      key={uid}
                      style={[styles.chip, selected && { backgroundColor: member.color, borderColor: member.color }]}
                      onPress={() => toggleAssignee(uid)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipTxt, selected && styles.chipTxtSelected]}>
                        {member.displayName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* Description */}
          <Text style={[styles.label, { marginTop: 8 }]}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Type here..."
            placeholderTextColor="#C8BFB0"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {!!error && <Text style={styles.error}>{error}</Text>}

        </BottomSheetScrollView>

        {/* Fixed save button — always visible at the bottom */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveBtn, submitting && styles.saveBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            <Text style={styles.saveBtnTxt}>
              {submitting ? 'Saving…' : event ? 'Save Event' : 'Save Event'}
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheetModal>
    );
  }
);

EventForm.displayName = 'EventForm';

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: '#FDFAF7', borderTopLeftRadius: 24, borderTopRightRadius: 24 },

  // Header
  headerGradient: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { fontSize: 22, fontWeight: '700', color: '#3B1F0E' },

  // Dotted divider
  dottedDivider: { height: 1, borderTopWidth: 1, borderStyle: 'dashed', borderColor: '#C4B5E0', marginHorizontal: 0 },

  // Form
  container: { padding: 20, paddingBottom: 8 },
  footer: { paddingHorizontal: 20, paddingBottom: 32, paddingTop: 8, backgroundColor: '#FDFAF7' },
  label: { fontSize: 14, fontWeight: '700', color: '#3B1F0E', marginBottom: 8 },

  // Text inputs
  input: {
    borderWidth: 1.5,
    borderColor: '#D8CFC5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#3B1F0E',
    backgroundColor: '#fff',
    marginBottom: 4,
  },
  multiline: { height: 100 },

  // Date pill
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#EDE0D4',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 8,
  },
  datePillTxt: { fontSize: 14, fontWeight: '600', color: '#3B1F0E' },

  // Recurrence pill
  recurrencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#EDE0D4',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 4,
  },
  recurrenceTxt: { fontSize: 14, fontWeight: '500', color: '#3B1F0E' },
  recurrenceDropdown: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D8CFC5',
    marginBottom: 8,
    overflow: 'hidden',
  },
  recurrenceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  recurrenceOptionBorder: { borderBottomWidth: 1, borderBottomColor: '#F0E8DC' },
  recurrenceOptionSelected: { backgroundColor: '#F5F0EC' },
  recurrenceOptionTxt: { fontSize: 14, color: '#3B1F0E' },
  recurrenceOptionTxtSelected: { fontWeight: '700', color: '#4E7B78' },

  // Assignee chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: '#D8CFC5', backgroundColor: '#fff' },
  chipTxt: { fontSize: 13, fontWeight: '500', color: '#9E9380' },
  chipTxtSelected: { color: '#fff', fontWeight: '600' },

  // Error
  error: { color: '#E17055', fontSize: 13, marginBottom: 8, marginTop: 4 },

  // Calendar modal
  calOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calCard: {
    backgroundColor: '#FDFAF7',
    borderRadius: 20,
    overflow: 'hidden',
    width: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },

  // Save button
  saveBtn: {
    backgroundColor: '#2D1A0E',
    borderRadius: 28,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
    marginHorizontal: 20,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
